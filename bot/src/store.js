import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { config } from './config.js'
import { normalizePhone } from './parser.js'

const DEMO_USER = '00000000-0000-0000-0000-000000000001'

const admin = config.dryRun || !config.supabaseUrl || !config.serviceRoleKey
  ? null
  : createClient(config.supabaseUrl, config.serviceRoleKey, { auth: { persistSession: false } })

// Penyimpanan-memory hanya dipakai saat BOT_DRY_RUN=true.
const dryLinks = new Map()
const dryTransactions = []
const dryOtps = new Map()
let drySequence = 0

const requireAdmin = () => {
  if (!admin) throw new Error('Supabase admin belum dikonfigurasi. Set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY atau nyalakan BOT_DRY_RUN.')
  return admin
}

export const isDryRun = () => !admin

export async function getLinkedUser(phone) {
  const key = normalizePhone(phone)
  if (!admin) return dryLinks.get(key)?.verified ? dryLinks.get(key).userId : null
  const { data, error } = await requireAdmin()
    .from('whatsapp_links')
    .select('user_id')
    .eq('phone', key)
    .eq('verified', true)
    .maybeSingle()
  if (error) throw error
  return data?.user_id || null
}

export async function getLinkStatus(userId) {
  if (!admin) {
    const found = [...dryLinks.entries()].find(([, value]) => value.userId === userId)
    return found ? { phone: found[0], verified: found[1].verified } : null
  }
  const { data, error } = await requireAdmin()
    .from('whatsapp_links')
    .select('phone, verified')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data || null
}

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right)
}

const linkError = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra })

// otp_code disimpan sebagai hash, bukan plaintext. Hash mengikat kode ke token
// pemohon, jadi baris yang terbaca lewat REST atau backup tidak berisi kode siap pakai.
const hashOtp = (code, linkToken) => `sha256:${
  crypto.createHash('sha256').update(`${String(code || '').trim()}:${String(linkToken || '')}`).digest('hex')
}`

// Nomor yang sudah terverifikasi milik akun lain tidak boleh dipakai lagi.
export async function findVerifiedLink(phone) {
  const key = normalizePhone(phone)
  if (!admin) {
    const link = dryLinks.get(key)
    return link?.verified ? { userId: link.userId, verified: true } : null
  }
  const { data, error } = await requireAdmin()
    .from('whatsapp_links')
    .select('user_id')
    .eq('phone', key)
    .eq('verified', true)
    .maybeSingle()
  if (error) throw error
  return data ? { userId: data.user_id, verified: true } : null
}

export const LINK_COOLDOWN_MS = 60 * 1000

export async function requestLink(userId, phone, code, linkToken) {
  const key = normalizePhone(phone)

  const taken = await findVerifiedLink(key)
  if (taken && taken.userId !== userId) {
    throw linkError('PHONE_TAKEN', 'Nomor ini sudah terhubung ke akun lain.')
  }

  if (!admin) {
    const pending = dryOtps.get(key)
    if (pending && pending.userId === userId && Date.now() - pending.createdAt < LINK_COOLDOWN_MS) {
      const retryAfter = Math.ceil((LINK_COOLDOWN_MS - (Date.now() - pending.createdAt)) / 1000)
      throw linkError('COOLDOWN', `Tunggu ${retryAfter} detik sebelum minta kode baru.`, { retryAfter })
    }
    dryLinks.set(key, { userId, verified: false, linkToken })
    dryOtps.set(key, {
      codeHash: hashOtp(code, linkToken),
      linkToken,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    })
    return { phone: key }
  }

  // Cooldown disimpan di database supaya berlaku lintas instance serverless.
  const { data: own, error: ownError } = await requireAdmin()
    .from('whatsapp_links')
    .select('phone, updated_at, verified')
    .eq('user_id', userId)
    .maybeSingle()
  if (ownError) throw ownError
  if (own && own.phone === key && !own.verified) {
    const elapsed = Date.now() - new Date(own.updated_at).getTime()
    if (elapsed < LINK_COOLDOWN_MS) {
      const retryAfter = Math.ceil((LINK_COOLDOWN_MS - elapsed) / 1000)
      throw linkError('COOLDOWN', `Tunggu ${retryAfter} detik sebelum minta kode baru.`, { retryAfter })
    }
  }

  const { error } = await requireAdmin().from('whatsapp_links').upsert({
    user_id: userId,
    phone: key,
    otp_code: hashOtp(code, linkToken),
    link_token: linkToken,
    otp_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    verified: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw error
  return { phone: key }
}

export async function hasPendingOtp(phone) {
  const key = normalizePhone(phone)
  if (!admin) {
    const pending = dryOtps.get(key)
    if (!pending) return false
    if (pending.expiresAt < Date.now()) {
      dryOtps.delete(key)
      return false
    }
    return true
  }
  const { data, error } = await requireAdmin()
    .from('whatsapp_links')
    .select('otp_code')
    .eq('phone', key)
    .eq('verified', false)
    .maybeSingle()
  if (error) throw error
  return Boolean(data?.otp_code)
}

export async function verifyOtp(phone, code, linkToken) {
  const key = normalizePhone(phone)
  const clean = String(code || '').trim()
  const token = String(linkToken || '').trim()
  // Tanpa token milik pemohon, kode OTP saja tidak boleh mengikat nomor.
  if (!token) return null
  if (!admin) {
    const pending = dryOtps.get(key)
    if (!pending || pending.expiresAt < Date.now()) return null
    if (!safeEqual(pending.codeHash, hashOtp(clean, token))) return null
    if (!safeEqual(pending.linkToken, token)) return null
    const link = dryLinks.get(key)
    if (!link) return null
    dryOtps.delete(key)
    link.verified = true
    link.linkToken = null
    return link.userId
  }
  const client = requireAdmin()
  const { data, error } = await client
    .from('whatsapp_links')
    .select('user_id, otp_code, link_token, otp_expires_at')
    .eq('phone', key)
    .eq('verified', false)
    .maybeSingle()
  if (error) throw error
  if (!data?.otp_code || !safeEqual(data.otp_code, hashOtp(clean, token))) return null
  if (!data.link_token || !safeEqual(data.link_token, token)) return null
  if (new Date(data.otp_expires_at).getTime() < Date.now()) return null

  // Jangan pernah menimpa nomor yang sudah terverifikasi milik akun lain.
  const taken = await findVerifiedLink(key)
  if (taken && taken.userId !== data.user_id) return null

  const { error: updateError } = await client
    .from('whatsapp_links')
    .update({
      verified: true,
      otp_code: null,
      link_token: null,
      otp_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('phone', key)
    .eq('user_id', data.user_id)
  if (updateError) throw updateError
  return data.user_id
}

export async function removeLink(userId) {
  if (!admin) {
    for (const [phone, value] of dryLinks) {
      if (value.userId === userId) {
        dryLinks.delete(phone)
        dryOtps.delete(phone)
      }
    }
    return
  }
  const { error } = await requireAdmin().from('whatsapp_links').delete().eq('user_id', userId)
  if (error) throw error
}

export async function insertTransaction(record) {
  if (!admin) {
    // ID harus unik walaupun dua transaksi masuk di milidetik yang sama.
    drySequence += 1
    const saved = { id: `dry-${Date.now()}-${drySequence}`, ...record }
    dryTransactions.push(saved)
    return saved
  }
  const { data, error } = await requireAdmin().from('transactions').insert(record).select().single()
  if (error) throw error
  return data
}

// Tanggal akhir bulan harus dihitung, bukan di-hardcode "-31" (November,
// April, Juni, September cuma 30 hari; Februari 28/29).
export function monthRange(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number)
  const pad = (n) => String(n).padStart(2, '0')
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(lastDay)}`,
  }
}

export async function getMonthTotals(userId, monthKey) {
  if (!admin) {
    const items = dryTransactions.filter((item) => item.user_id === userId && String(item.date).startsWith(monthKey))
    return {
      income: items.filter((i) => i.type === 'income').reduce((s, i) => s + i.amount, 0),
      expense: items.filter((i) => i.type === 'expense' && i.category !== 'tabungan').reduce((s, i) => s + i.amount, 0),
      savings: items.filter((i) => i.type === 'expense' && i.category === 'tabungan').reduce((s, i) => s + i.amount, 0),
      count: items.length,
    }
  }
  const { start, end } = monthRange(monthKey)
  const { data, error } = await requireAdmin()
    .from('transactions')
    .select('type, amount, category')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
  if (error) throw error
  return {
    income: (data || []).filter((i) => i.type === 'income').reduce((s, i) => s + Number(i.amount || 0), 0),
    expense: (data || []).filter((i) => i.type === 'expense' && i.category !== 'tabungan').reduce((s, i) => s + Number(i.amount || 0), 0),
    savings: (data || []).filter((i) => i.type === 'expense' && i.category === 'tabungan').reduce((s, i) => s + Number(i.amount || 0), 0),
    count: data?.length || 0,
  }
}

// Total seluruh catatan milik user (lintas bulan), dipakai kebutuhan internal dan pengujian.
export async function countTransactions(userId) {
  if (!admin) return dryTransactions.filter((item) => item.user_id === userId).length
  const { count, error } = await requireAdmin()
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count || 0
}

// Dipakai penghapusan transaksi terakhir dan pengujian.
export async function listRecentTransactions(userId, limit = 5) {
  if (!admin) {
    // created_at punya resolusi milidetik, jadi dua transaksi yang masuk
    // bersamaan bisa punya nilai sama. Urutan penyisipan jadi penentu terakhir
    // supaya "hapus transaksi terakhir" selalu konsisten.
    return dryTransactions
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.user_id === userId)
      .sort((a, b) => String(b.item.date || '').localeCompare(String(a.item.date || ''))
        || String(b.item.created_at || '').localeCompare(String(a.item.created_at || ''))
        || b.index - a.index)
      .slice(0, limit)
      .map(({ item }) => item)
  }
  const { data, error } = await requireAdmin()
    .from('transactions')
    .select('id, date, type, amount, category, note')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// Dipakai perintah "hapus"/"clear": hapus tepat 1 transaksi terakhir milik user.
// Urutan memakai kriteria yang sama dengan daftar transaksi terakhir supaya konsisten.
export async function deleteLastTransaction(userId) {
  const [last] = await listRecentTransactions(userId, 1)
  if (!last) return null

  if (!admin) {
    const index = dryTransactions.findIndex((item) => item.id === last.id)
    if (index >= 0) dryTransactions.splice(index, 1)
    return last
  }

  const { error } = await requireAdmin()
    .from('transactions')
    .delete()
    .eq('id', last.id)
    .eq('user_id', userId)
  if (error) throw error
  return last
}

// Dipakai perintah "hapus semua"/"clear all": menghapus seluruh catatan user.
export async function deleteAllTransactions(userId) {
  if (!admin) {
    const before = dryTransactions.length
    for (let i = dryTransactions.length - 1; i >= 0; i -= 1) {
      if (dryTransactions[i].user_id === userId) dryTransactions.splice(i, 1)
    }
    return before - dryTransactions.length
  }
  const { data, error } = await requireAdmin()
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .select('id')
  if (error) throw error
  return data?.length || 0
}

export async function resolveUser(accessToken) {
  if (!admin) return DEMO_USER
  const { data, error } = await requireAdmin().auth.getUser(accessToken)
  if (error) throw error
  return data.user.id
}

export { DEMO_USER }
