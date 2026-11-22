import crypto from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { getWebhookChallenge, isValidMetaSignature } from './meta.js'
import { processMetaWebhook } from './meta-webhook.js'
import { normalizePhone } from './parser.js'
import * as store from './store.js'
import { sendText } from './whatsapp.js'

const app = express()

// WEB_ORIGIN=* mengizinkan semua origin (praktis untuk coba lewat IP jaringan/HP).
app.use(cors({ origin: config.webOrigins.includes('*') ? true : config.webOrigins }))

app.get('/', (_req, res) => {
  res.json({
    app: 'Bot WhatsApp Catatan Uang Harian',
    mode: store.isDryRun() ? 'dry-run' : 'live',
    botMode: config.botMode,
    health: '/health',
    webhook: 'POST /webhook (atau GET /webhook untuk verifikasi Meta)',
    api: ['POST /api/link/request', 'GET /api/link/status', 'DELETE /api/link'],
  })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, mode: store.isDryRun() ? 'dry-run' : 'live', botMode: config.botMode })
})

app.get('/webhook', (req, res) => {
  const challenge = getWebhookChallenge(req.query)
  if (challenge) return res.status(200).type('text/plain').send(challenge)
  return res.sendStatus(403)
})

app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  if (!isValidMetaSignature(req.body, req.headers['x-hub-signature-256'])) {
    return res.sendStatus(401)
  }

  let payload
  try {
    payload = JSON.parse(req.body.toString('utf8'))
  } catch {
    return res.sendStatus(400)
  }

  // Balasan error lewat jalur aktif (Baileys saat mode baileys, Meta saat mode meta).
  await processMetaWebhook(payload, { reply: (to, body) => sendText(to, body) })
  return res.sendStatus(200)
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
    await sendText(phone, `Kode verifikasi Catatan Uang Harian: ${code}\n\nBalas pesan ini dengan 6 digit kode tersebut untuk menghubungkan akunmu.`)
    return res.json({ ok: true, phone, message: 'Kode OTP dikirim ke WhatsApp kamu.' })
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

app.listen(config.port, () => {
  const runMode = store.isDryRun() ? 'DRY-RUN' : 'LIVE'
  console.log(`Bot Catatan Uang berjalan di http://localhost:${config.port} (${config.botMode.toUpperCase()} · ${runMode})`)

  if (config.botMode !== 'baileys') return
  if (store.isDryRun()) {
    console.log('[Baileys] Dilewati karena BOT_DRY_RUN=true. Balasan tampil di terminal.')
    return
  }
  console.log('[Baileys] Menyiapkan koneksi. Scan QR dengan nomor cadangan saat muncul.')
  import('./baileys.js')
    .then(({ connectBaileys }) => connectBaileys())
    .catch((error) => console.error('[Baileys] Gagal start:', error))
})
