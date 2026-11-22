import crypto from 'node:crypto'
import { config } from './config.js'
import { normalizePhone } from './parser.js'

export function isMetaConfigured() {
  const token = process.env.WHATSAPP_TOKEN || config.whatsappToken
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || config.phoneNumberId
  return Boolean(token && phoneNumberId)
}

// Kirim pesan lewat WhatsApp Cloud API. Token & Phone Number ID dibaca langsung
// dari process.env agar perilakunya sama di lokal maupun serverless Vercel.
export async function sendWhatsAppMessage(to, body) {
  const phone = normalizePhone(to)
  const token = process.env.WHATSAPP_TOKEN || config.whatsappToken
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || config.phoneNumberId
  if (!token || !phoneNumberId) {
    throw new Error('Meta WhatsApp belum dikonfigurasi. Isi WHATSAPP_TOKEN dan WHATSAPP_PHONE_NUMBER_ID.')
  }

  const res = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        text: { body: String(body || '') },
      }),
    },
  )

  const data = await res.json().catch(() => ({}))
  console.log('[Meta Reply Response]', res.status, JSON.stringify(data))
  if (!res.ok) {
    throw new Error(`Gagal kirim WA: ${data?.error?.message || res.status}`)
  }
  return data
}

// Alias untuk modul lama yang masih mengimpor sendMetaText.
export const sendMetaText = sendWhatsAppMessage

export function isValidMetaSignature(rawBody, signature) {
  if (config.dryRun || !config.appSecret) return true
  if (!signature) return false
  const expected = `sha256=${crypto.createHmac('sha256', config.appSecret).update(rawBody).digest('hex')}`
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function getWebhookChallenge(query = {}, expectedToken = config.verifyToken) {
  const mode = query['hub.mode']
  const challenge = query['hub.challenge']
  const token = query['hub.verify_token']
  const valid = mode === 'subscribe' && (!expectedToken || token === expectedToken)
  return valid && challenge ? String(challenge) : null
}
