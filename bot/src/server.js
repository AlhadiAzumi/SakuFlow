import crypto from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { getWebhookChallenge, isValidMetaSignature, sendWhatsAppMessage } from './meta.js'
import { processMetaWebhook } from './meta-webhook.js'
import { normalizePhone } from './parser.js'
import * as store from './store.js'

const app = express()

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

app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    // Normalisasi paling awal: di Vercel req.body adalah Buffer (atau string),
    // jadi ubah dulu ke objek JSON sebelum ada pengecekan object/entry apa pun.
    const rawBody = req.body
    let payload = rawBody
    if (Buffer.isBuffer(payload)) {
      payload = JSON.parse(payload.toString('utf8'))
    } else if (typeof payload === 'string') {
      payload = JSON.parse(payload)
    }
    req.body = payload

    console.log('[Webhook Masuk]', JSON.stringify(req.body))
    console.log('[Payload JSON]', JSON.stringify(payload))

    // HMAC tetap dihitung atas body mentah, bukan objek hasil parse.
    if (!isValidMetaSignature(rawBody, req.headers['x-hub-signature-256'])) {
      return res.status(401).send('UNAUTHORIZED')
    }
    if (!payload || typeof payload !== 'object') return res.status(400).send('INVALID_JSON')
    console.log('[Webhook Entries]', Array.isArray(payload.entry) ? payload.entry.length : 0)

    // Log isi pesan dan status delivery dari Meta supaya terlihat di Runtime Logs.
    for (const entry of payload.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value
        if (!value) continue

        for (const message of value.messages || []) {
          const from = normalizePhone(message.from)
          const text = String(message.text?.body || '').trim()
          console.log('[Msg Extracted]', { from, text })
        }
        if (value.statuses) {
          console.log('[WA Status]', JSON.stringify(value.statuses))
        }
      }
    }

    // Di Vercel, function dimatikan begitu response dikirim. Semua query
    // Supabase, verifikasi OTP / simpan transaksi, dan kirim balasan Meta
    // harus tuntas di sini sebelum status 200 dikirim.
    await processMetaWebhook(payload, {
      send: sendWhatsAppMessage,
      // Pesan sudah dicatat di atas, jadi hindari duplikasi log.
      onExtracted: () => {},
      onResult: (result) => console.log('[DB / OTP Result]', result),
    })
  } catch (err) {
    console.error('[Webhook Error]', err)
  }

  // Meta tetap menerima 200 walau ada error internal, supaya tidak retry.
  return res.status(200).send('EVENT_RECEIVED')
})

app.use(express.json())

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

app.post('/api/link/request', requireUser, async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone)
    if (phone.length < 10) return res.status(400).json({ error: 'Nomor WhatsApp tidak valid.' })
    const code = config.dryOtpCode || String(crypto.randomInt(100000, 1000000))
    await store.requestLink(req.user.id, phone, code)

    // Kode tetap tersimpan dan dikembalikan ke UI walau WhatsApp gagal
    // (misalnya karena pengguna belum membuka chat dalam 24 jam).
    let delivered = false
    try {
      const result = await sendWhatsAppMessage(
        phone,
        `Kode verifikasi SakuFlow: ${code}\n\nBalas pesan ini dengan 6 digit kode tersebut untuk menghubungkan akunmu.`,
      )
      delivered = !result?.dry
    } catch (error) {
      console.error('[OTP] Gagal mengirim kode lewat WhatsApp:', error.message)
    }

    return res.json({ ok: true, otp: code, delivered, phone })
  } catch (error) {
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

// Di Vercel, function diekspor dan dipanggil oleh runtime — jangan listen.
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
