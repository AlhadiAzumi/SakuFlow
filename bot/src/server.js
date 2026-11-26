import crypto from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { getWebhookChallenge, isValidMetaSignature, sendWhatsAppMessage } from './meta.js'
import { handleMessage } from './handler.js'
import { normalizePhone } from './parser.js'
import * as store from './store.js'

const app = express()

// Log tidak boleh memuat nomor utuh atau isi pesan pengguna.
const maskPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length <= 4 ? '***' : `***${digits.slice(-4)}`
}

// Saat di-Vercel lewat rewrite /(.*) → /api/index.js, beberapa runtime
// meneruskan path tujuan sebagai req.url. Kembalikan path asli bila tersedia.
app.use((req, _res, next) => {
  const original = req.headers['x-vercel-forwarded-path'] || req.headers['x-vercel-original-path']
  if (original && String(original).startsWith('/') && String(req.url).startsWith('/api/')) {
    req.url = String(original)
  }
  next()
})

// Daftar origin diambil dari WEB_ORIGIN (bisa lebih dari satu, dipisah koma)
// lalu digabung dengan origin lokal dan production. Trailing slash dibuang
// supaya "" maupun "https://x/" dianggap sama.
const configuredOrigins = (process.env.WEB_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

const allowedOrigins = [...new Set([
  ...configuredOrigins,
  'http://localhost:5173',
  'https://sakunode.web.id',
  'https://sakuflow-mu.vercel.app',
])]

const corsOptions = {
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Signature-256'],
  optionsSuccessStatus: 204,
}

// Pasang sebelum semua route. middleware cors bawaan menjawab OPTIONS
// (preflight) lebih awal sehingga browser tidak memblokir POST dari Vercel.
const corsMiddleware = cors(corsOptions)
app.use(corsMiddleware)
app.options(/.*/, corsMiddleware)

// Validasi env Supabase sejak cold start supaya log Vercel langsung jelas.
const supabaseUrl = process.env.SUPABASE_URL || config.supabaseUrl
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.serviceRoleKey
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[Supabase] SUPABASE_URL dan/atau SUPABASE_SERVICE_ROLE_KEY kosong. Isi keduanya di Vercel Environment Variables agar query OTP dan transaksi berjalan.')
}

app.get('/', (_req, res) => {
  res.json({
    app: 'Bot WhatsApp Catatan Uang Harian',
    mode: store.isDryRun() ? 'dry-run' : 'live',
    botMode: 'meta-cloud',
    health: '/health',
    webhook: 'POST /webhook (atau GET /webhook untuk verifikasi Meta)',
    api: ['POST /api/link/request', 'GET /api/link/status', 'DELETE /api/link'],
  })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, mode: store.isDryRun() ? 'dry-run' : 'live', botMode: 'meta-cloud' })
})

app.get('/webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || config.verifyToken
  const challenge = getWebhookChallenge(req.query, verifyToken)
  if (challenge) return res.status(200).type('text/plain').send(challenge)
  return res.sendStatus(403)
})

// Satu-satunya route POST /webhook. Signature HMAC Meta wajib sah.
app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    // Step 0: normalisasi body mentah dari Vercel (Buffer/string) jadi objek.
    let payload = req.body
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}))
    if (Buffer.isBuffer(payload)) {
      payload = JSON.parse(payload.toString('utf8'))
    } else if (typeof payload === 'string') {
      payload = JSON.parse(payload)
    }
    req.body = payload

    // Tanpa tanda tangan HMAC yang sah, siapa pun bisa mengaku sebagai nomor
    // mana pun dan menulis/menghapus catatan milik pengguna lain.
    if (!isValidMetaSignature(rawBody, req.headers['x-hub-signature-256'])) {
      console.warn('[Webhook Signature Ditolak]', {
        hasSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
        signaturePrefix: String(req.headers['x-hub-signature-256'] || '').slice(0, 12) || null,
      })
      return res.status(401).send('UNAUTHORIZED')
    }

    console.log('[Webhook Masuk]', { entries: payload?.entry?.length || 0 })
    console.log('[Step 1 - JSON Ready]')

    // Step 2 & 3: telusuri semua entry/change, bukan hanya yang pertama.
    for (const entry of payload?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value
        if (!value) continue

        if (value.statuses) {
          console.log('[Step 2 - WA Status]', { count: value.statuses.length })
        }

        for (const msg of value.messages || []) {
          const from = msg.from
          const text = msg.text?.body?.trim() || ''
          console.log('[Step 3 - Msg]', { from: maskPhone(from), textLength: text.length })

          // Step 4: verifikasi OTP / simpan transaksi. Balasan handler ditangkap
          // supaya pengiriman Meta terjadi eksplisit di Step 5.
          let replyText = ''
          let dbResult
          try {
            dbResult = await handleMessage(msg, {
              send: async (_to, body) => {
                replyText = String(body || '')
                return { captured: true }
              },
            })
          } catch (error) {
            console.error('[Webhook Crash]', error)
            dbResult = { type: 'error', ok: false, from, text, error: error.message }
            replyText = 'Waduh, gagal memproses catatan. Coba lagi sebentar, ya.'
          }
          console.log('[Step 4 - DB Result]', dbResult)

          // Step 5: kirim balasan ke Meta dan tunggu sampai selesai.
          if (!replyText) replyText = 'Pesan diterima.'
          const recipient = normalizePhone(from)
          try {
            const metaRes = await sendWhatsAppMessage(recipient, replyText)
            if (metaRes?.blocked) {
              console.warn('[Step 5 - Reply Diblokir] Meta menolak pesan keluar; mode satu arah tetap jalan.', metaRes)
            } else {
              console.log('[Step 5 - Reply Sent]', metaRes)
            }
          } catch (sendError) {
            console.error('[Step 5 - Reply Gagal]', String(sendError?.message || sendError))
          }
        }
      }
    }
  } catch (err) {
    console.error('[Webhook Crash]', err)
  }

  // Satu-satunya response 200, di baris paling akhir setelah semua await selesai.
  return res.status(200).send('EVENT_RECEIVED')
})

app.use(express.json())

// Respons OTP memuat linkToken rahasia pemohon, jangan disimpan cache.
app.use('/api/link', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

async function requireUser(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return res.status(401).json({ error: 'Token autentikasi diperlukan.' })
  try {
    req.user = { id: await store.resolveUser(token) }
    return next()
  } catch {
    return res.status(401).json({ error: 'Token tidak valid.' })
  }
}

// Batas per akun (best-effort di memori). Batas utama ada di cooldown per nomor
// yang disimpan di database, jadi tetap berlaku walau proses ini di-restart.
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
  return 0
}

app.post('/api/link/request', requireUser, async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone)
    if (phone.length < 10) return res.status(400).json({ error: 'Nomor WhatsApp tidak valid.' })
    const retryAfter = checkLinkRate(req.user.id)
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({
        error: `Terlalu banyak permintaan kode. Coba lagi dalam ${retryAfter} detik.`,
        retryAfter,
      })
    }
    const code = String(crypto.randomInt(100000, 1000000))
    // Token rahasia pemohon; wajib disertakan saat verifikasi.
    const linkToken = crypto.randomBytes(16).toString('hex')
    await store.requestLink(req.user.id, phone, code, linkToken)

    // Kode tetap tersimpan dan dikembalikan ke UI walau WhatsApp gagal
    // (misalnya karena pengguna belum membuka chat dalam 24 jam).
    let delivered = false
    try {
      const result = await sendWhatsAppMessage(
        phone,
        [
          `Kode verifikasi Sakunode: ${code}`,
          '',
          'Jangan balas pesan ini. Buka Setelan di website Sakunode, lalu kirim kode lewat tautan yang ada di sana.',
          'Kalau kamu tidak meminta kode ini, abaikan saja pesan ini.',
        ].join('\n'),
      )
      delivered = !result?.dry
    } catch (error) {
      console.error('[OTP] Gagal mengirim kode lewat WhatsApp:', error.message)
    }

    return res.json({ ok: true, otp: code, linkToken, delivered, phone })
  } catch (error) {
    if (error.code === 'PHONE_TAKEN') {
      return res.status(409).json({ error: error.message })
    }
    if (error.code === 'COOLDOWN') {
      if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter))
      return res.status(429).json({ error: error.message, retryAfter: error.retryAfter || null })
    }
    return res.status(500).json({ error: error.message })
  }
})

app.get('/api/link/status', requireUser, async (req, res) => {
  try {
    const status = await store.getLinkStatus(req.user.id)
    return res.json({ linked: Boolean(status?.verified), phone: status?.phone || null })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.delete('/api/link', requireUser, async (req, res) => {
  try {
    await store.removeLink(req.user.id)
    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Di Vercel, function diekspor dan dipanggil oleh runtime. Jangan listen.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || config.port || 3001)
  app.listen(port, () => {
    const runMode = store.isDryRun() ? 'DRY-RUN' : 'LIVE'
    console.log(`Bot Meta Cloud API berjalan di http://localhost:${port} (${runMode})`)
  })
}

// Diekspor ulang supaya sendWhatsAppMessage juga bisa diakses dari server.js.
export { sendWhatsAppMessage }
export default app
