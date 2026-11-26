import crypto from 'node:crypto'
import { config } from './config.js'
import * as store from './store.js'
import { normalizePhone } from './parser.js'
import { sendWhatsAppMessage } from './meta.js'

function isOriginAllowed(origin) {
  if (!origin) return false
  if (config.webOrigins.includes('*')) return true
  return config.webOrigins.includes(origin)
}

export function applyCors(req, res) {
  const origin = req.headers?.origin
  if (!isOriginAllowed(origin)) return
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
}

export function handleOptions(req, res) {
  applyCors(req, res)
  res.statusCode = 204
  res.end()
}

export function sendJson(req, res, status, data) {
  applyCors(req, res)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  // Respons OTP memuat linkToken rahasia pemohon, jangan disimpan cache.
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export function sendPlain(req, res, status, body) {
  applyCors(req, res)
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(body)
}

export function methodNotAllowed(req, res, allowed) {
  res.setHeader('Allow', allowed.join(', '))
  return sendJson(req, res, 405, { error: 'Metode tidak diizinkan.' })
}

export async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function readJson(req) {
  const raw = await readRawBody(req)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    throw new Error('Body JSON tidak valid.')
  }
}

function fail(req, res, error) {
  if (error?.code === 'UNAUTH') {
    return sendJson(req, res, 401, { error: error.message })
  }
  if (error?.code === 'PHONE_TAKEN') {
    return sendJson(req, res, 409, { error: error.message })
  }
  if (error?.code === 'COOLDOWN') {
    if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter))
    return sendJson(req, res, 429, { error: error.message, retryAfter: error.retryAfter || null })
  }
  return sendJson(req, res, 500, { error: error?.message || 'Permintaan gagal.' })
}

const authError = (message) => Object.assign(new Error(message), { code: 'UNAUTH' })

// Pembatas best-effort per akun. Instance serverless bisa berbeda-beda, jadi
// batas utama tetap cooldown per nomor yang disimpan di database.
const LINK_WINDOW_MS = 15 * 60 * 1000
const LINK_MAX_PER_WINDOW = 5
const linkHits = new Map()

function checkLinkRate(userId) {
  const now = Date.now()
  const hits = (linkHits.get(userId) || []).filter((at) => now - at < LINK_WINDOW_MS)
  if (hits.length >= LINK_MAX_PER_WINDOW) {
    return Math.ceil((LINK_WINDOW_MS - (now - hits[0])) / 1000)
  }
  hits.push(now)
  linkHits.set(userId, hits)
  if (linkHits.size > 5000) {
    for (const [key, value] of linkHits) {
      if (!value.some((at) => now - at < LINK_WINDOW_MS)) linkHits.delete(key)
    }
  }
  return 0
}

async function getUserId(req) {
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) throw authError('Token autentikasi diperlukan.')
  let userId
  try {
    userId = await store.resolveUser(token)
  } catch {
    throw authError('Token tidak valid.')
  }
  if (!userId) throw authError('Token tidak valid.')
  return userId
}

export async function linkRequest(req, res) {
  try {
    const userId = await getUserId(req)
    const retryAfter = checkLinkRate(userId)
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter))
      return sendJson(req, res, 429, {
        error: `Terlalu banyak permintaan kode. Coba lagi dalam ${retryAfter} detik.`,
        retryAfter,
      })
    }
    const body = await readJson(req)
    const phone = normalizePhone(body?.phone)
    if (phone.length < 10) return sendJson(req, res, 400, { error: 'Nomor WhatsApp tidak valid.' })

    const code = String(crypto.randomInt(100000, 1000000))
    // Token ini hanya diketahui pemohon (sesi web yang login) dan wajib
    // disertakan saat verifikasi, jadi kode OTP saja tidak bisa mengikat nomor.
    const linkToken = crypto.randomBytes(16).toString('hex')
    await store.requestLink(userId, phone, code, linkToken)

    if (config.dryRun) {
      console.log(`[DRY-RUN OTP → ${phone}] ${code}`)
    } else {
      await sendWhatsAppMessage(phone, [
        `Kode verifikasi Sakunode: ${code}`,
        '',
        'Jangan balas pesan ini. Buka Setelan di website Sakunode, lalu kirim kode lewat tautan yang ada di sana.',
        'Kalau kamu tidak meminta kode ini, abaikan saja pesan ini.',
      ].join('\n'))
    }
    return sendJson(req, res, 200, {
      ok: true,
      phone,
      otp: code,
      linkToken,
      delivered: !config.dryRun,
      message: 'Kode OTP dibuat. Kirim kode dan token lewat tautan WhatsApp di halaman ini.',
    })
  } catch (error) {
    return fail(req, res, error)
  }
}

export async function linkStatus(req, res) {
  try {
    const userId = await getUserId(req)
    const status = await store.getLinkStatus(userId)
    return sendJson(req, res, 200, { linked: Boolean(status?.verified), phone: status?.phone || null })
  } catch (error) {
    return fail(req, res, error)
  }
}

export async function linkDelete(req, res) {
  try {
    const userId = await getUserId(req)
    await store.removeLink(userId)
    return sendJson(req, res, 200, { ok: true })
  } catch (error) {
    return fail(req, res, error)
  }
}
