import { createClient } from '@supabase/supabase-js'
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

export async function requestLink(userId, phone, code) {
  const key = normalizePhone(phone)
  if (!admin) {
    dryLinks.set(key, { userId, verified: false })
    dryOtps.set(key, code)
    return { phone: key }
  }
  const { error } = await requireAdmin().from('whatsapp_links').upsert({
    user_id: userId,
    phone: key,
    otp_code: code,
    otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    verified: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw error
  return { phone: key }
}

export async function hasPendingOtp(phone) {
  const key = normalizePhone(phone)
  if (!admin) return dryOtps.has(key)
  const { data, error } = await requireAdmin()
    .from('whatsapp_links')
    .select('otp_code')
    .eq('phone', key)
    .eq('verified', false)
    .maybeSingle()
  if (error) throw error
  return Boolean(data?.otp_code)
}

export async function verifyOtp(phone, code) {
  const key = normalizePhone(phone)
  const clean = String(code || '').trim()
  if (!admin) {
    const expected = dryOtps.get(key)
    if (!expected || expected !== clean) return null
    const link = dryLinks.get(key)
    if (!link) return null
    dryOtps.delete(key)
    link.verified = true
    return link.userId
  }
  const client = requireAdmin()
  const { data, error } = await client
    .from('whatsapp_links')
    .select('user_id, otp_code, otp_expires_at')
    .eq('phone', key)
    .eq('verified', false)
    .maybeSingle()
  if (error) throw error
  if (!data?.otp_code || data.otp_code !== clean) return null
  if (new Date(data.otp_expires_at).getTime() < Date.now()) return null

  const { error: updateError } = await client
    .from('whatsapp_links')
    .update({ verified: true, otp_code: null, otp_expires_at: null, updated_at: new Date().toISOString() })
    .eq('phone', key)
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
    const saved = { id: `dry-${Date.now()}`, ...record }
    dryTransactions.push(saved)
    return saved
  }
  const { data, error } = await requireAdmin().from('transactions').insert(record).select().single()
  if (error) throw error
  return data
}

export async function getMonthTotals(userId, monthKey) {
  if (!admin) {
    const items = dryTransactions.filter((item) => item.user_id === userId && String(item.date).startsWith(monthKey))
    return {
      income: items.filter((i) => i.type === 'income').reduce((s, i) => s + i.amount, 0),
      expense: items.filter((i) => i.type === 'expense').reduce((s, i) => s + i.amount, 0),
      count: items.length,
    }
  }
  const { data, error } = await requireAdmin()
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .gte('date', `${monthKey}-01`)
    .lte('date', `${monthKey}-31`)
  if (error) throw error
  return {
    income: (data || []).filter((i) => i.type === 'income').reduce((s, i) => s + Number(i.amount || 0), 0),
    expense: (data || []).filter((i) => i.type === 'expense').reduce((s, i) => s + Number(i.amount || 0), 0),
    count: data?.length || 0,
  }
}

export async function resolveUser(accessToken) {
  if (!admin) return DEMO_USER
  const { data, error } = await requireAdmin().auth.getUser(accessToken)
  if (error) throw error
  return data.user.id
}

export { DEMO_USER }
