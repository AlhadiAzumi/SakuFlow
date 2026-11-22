import crypto from 'node:crypto'
import { config } from './config.js'
import { normalizePhone } from './parser.js'

export function isMetaConfigured() {
  return Boolean(config.whatsappToken && config.phoneNumberId)
}

// Kirim pesan lewat WhatsApp Cloud API. Sengaja tidak tergantung BOT_MODE,
// supaya jalur serverless Vercel tetap bisa kirim walau env BOT_MODE kosong.
export async function sendMetaText(to, body) {
  const phone = normalizePhone(to)
  if (!isMetaConfigured()) {
    throw new Error('Meta WhatsApp belum dikonfigurasi. Isi WHATSAPP_TOKEN dan WHATSAPP_PHONE_NUMBER_ID.')
  }

  const response = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        text: { body: String(body || '') },
      }),
    },
  )

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Gagal kirim WA: ${payload?.error?.message || response.status}`)
  }
  return payload
}

export function isValidMetaSignature(rawBody, signature) {
  if (config.dryRun || !config.appSecret) return true
  if (!signature) return false
  const expected = `sha256=${crypto.createHmac('sha256', config.appSecret).update(rawBody).digest('hex')}`
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function getWebhookChallenge(query = {}) {
  const mode = query['hub.mode']
  const challenge = query['hub.challenge']
  const token = query['hub.verify_token']
  const valid = mode === 'subscribe' && (!config.verifyToken || token === config.verifyToken)
  return valid && challenge ? String(challenge) : null
}
