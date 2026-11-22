import crypto from 'node:crypto'
import { config } from './config.js'
import * as store from './store.js'
import { normalizePhone } from './parser.js'
import { sendMetaText } from './meta.js'

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
  return sendJson(req, res, 500, { error: error?.message || 'Permintaan gagal.' })
}

async function getUserId(req) {
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('Token autentikasi diperlukan.')
  const userId = await store.resolveUser(token)
  if (!userId) throw new Error('Token tidak valid.')
  return userId
}

export async function linkRequest(req, res) {
  try {
    const userId = await getUserId(req)
    const body = await readJson(req)
    const phone = normalizePhone(body?.phone)
    if (phone.length < 10) return sendJson(req, res, 400, { error: 'Nomor WhatsApp tidak valid.' })

    const code = config.dryOtpCode || String(crypto.randomInt(100000, 1000000))
    await store.requestLink(userId, phone, code)

    if (config.dryRun) {
      console.log(`[DRY-RUN OTP → ${phone}] ${code}`)
    } else {
      await sendMetaText(phone, `Kode verifikasi Catatan Uang Harian: ${code}\n\nBalas pesan ini dengan 6 digit kode tersebut untuk menghubungkan akunmu.`)
    }
    return sendJson(req, res, 200, { ok: true, phone, message: 'Kode OTP dikirim ke WhatsApp kamu.' })
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
