import crypto from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { getCategory } from '../../src/lib/categories.js'
import { config } from './config.js'
import { HELP_TEXT, normalizePhone, parseMessage } from './parser.js'
import * as store from './store.js'
import { sendText } from './whatsapp.js'

const app = express()
const processed = new Map()
const rupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Math.round(value || 0))}`
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// WEB_ORIGIN=* mengizinkan semua origin (praktis untuk coba lewat IP jaringan/HP).
app.use(cors({ origin: config.webOrigins.includes('*') ? true : config.webOrigins }))

app.get('/', (_req, res) => {
  res.json({
    app: 'Bot WhatsApp Catatan Uang Harian',
    mode: store.isDryRun() ? 'dry-run' : 'live',
    health: '/health',
    webhook: 'POST /webhook (atau GET /webhook untuk verifikasi Meta)',
    api: ['POST /api/link/request', 'GET /api/link/status', 'DELETE /api/link'],
  })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, mode: store.isDryRun() ? 'dry-run' : 'live' })
})

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const challenge = req.query['hub.challenge']
  const token = req.query['hub.verify_token']
  const valid = mode === 'subscribe' && (!config.verifyToken || token === config.verifyToken)
  if (valid && challenge) return res.status(200).type('text/plain').send(challenge)
  return res.sendStatus(403)
})

function isValidSignature(rawBody, signature) {
  if (config.dryRun || !config.appSecret) return true
  if (!signature) return false
  const expected = `sha256=${crypto.createHmac('sha256', config.appSecret).update(rawBody).digest('hex')}`
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function handleMessage(message) {
  const phone = normalizePhone(message.from)
  const text = String(message.text?.body || '').trim()
  if (!text) {
    await sendText(phone, 'Aku belum bisa membaca pesan ini. Coba kirim teks, ya.')
    return
  }

  if (await store.hasPendingOtp(phone)) {
    if (/^\d{4,8}$/.test(text)) {
      const userId = await store.verifyOtp(phone, text)
      await sendText(phone, userId
        ? 'Nomor WhatsApp kamu berhasil dihubungkan. Sekarang kamu bisa langsung chat catatan uang di sini.'
        : 'Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru lewat website, ya.')
      return
    }
  }

  const parsed = parseMessage(text)

  if (parsed.intent === 'help') {
    await sendText(phone, HELP_TEXT)
    return
  }

  if (parsed.intent === 'summary') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await sendText(phone, 'Nomor ini belum terhubung. Buka website → Setelan → Hubungkan WhatsApp dulu, ya.')
      return
    }
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const totals = await store.getMonthTotals(userId, monthKey)
    await sendText(phone, [
      `Rekap ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
      `Uang masuk: ${rupiah(totals.income)}`,
      `Uang keluar: ${rupiah(totals.expense)}`,
      `Sisa: ${rupiah(totals.income - totals.expense)}`,
      `${totals.count} transaksi tercatat.`,
    ].join('\n'))
    return
  }

  if (parsed.intent === 'transaction') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await sendText(phone, 'Nomor ini belum terhubung ke akun. Buka website → Setelan → Hubungkan WhatsApp, lalu balas kode OTP yang kami kirim.')
      return
    }
    await store.insertTransaction({
      user_id: userId,
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      note: parsed.note,
      date: parsed.date,
      source: 'whatsapp',
      bot_message_id: message.id || null,
      created_at: new Date().toISOString(),
    })
    const category = getCategory(parsed.type, parsed.category)
    const totals = await store.getMonthTotals(userId, parsed.date.slice(0, 7))
    await sendText(phone, [
      `${parsed.type === 'income' ? 'Uang masuk' : 'Uang keluar'} tersimpan.`,
      `${rupiah(parsed.amount)} • ${category.label}`,
      `Total bulan ini — masuk ${rupiah(totals.income)}, keluar ${rupiah(totals.expense)}.`,
      'Cek websitenya, datanya langsung muncul.',
    ].join('\n'))
    return
  }

  await sendText(phone, `Aku belum paham pesan itu.\n\nContoh: "masuk uang 500 ribu" atau "keluar 25rb buat kopi".\nKetik "bantuan" untuk panduan lengkap.`)
}

app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  if (!isValidSignature(req.body, req.headers['x-hub-signature-256'])) {
    return res.sendStatus(401)
  }

  let payload
  try {
    payload = JSON.parse(req.body.toString('utf8'))
  } catch {
    return res.sendStatus(400)
  }

  res.sendStatus(200)

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) {
        if (!message.id || processed.has(message.id)) continue
        processed.set(message.id, Date.now())
        try {
          await handleMessage(message)
        } catch (error) {
          console.error('Gagal memproses pesan:', error)
          await sendText(normalizePhone(message.from), 'Waduh, gagal menyimpan catatan. Coba lagi sebentar, ya.').catch(() => {})
        }
      }
    }
  }

  // Bersihkan penanda pesan lama agar memory tidak terus bertambah.
  if (processed.size > 500) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const [id, time] of processed) if (time < cutoff) processed.delete(id)
  }
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
  console.log(`Bot Catatan Uang berjalan di http://localhost:${config.port} (${store.isDryRun() ? 'DRY-RUN' : 'LIVE'})`)
})
