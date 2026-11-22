import { sendWhatsAppMessage } from './meta.js'
import { normalizePhone } from './parser.js'

// Meta WhatsApp Cloud API adalah satu-satunya jalur keluar. Dry-run dan log
// respons ditangani di sendWhatsAppMessage agar perilakunya sama untuk webhook,
// OTP, maupun serverless Vercel.
export async function sendText(to, body) {
  const raw = String(to || '')
  const phone = normalizePhone(raw.includes('@') ? raw.split('@')[0] : raw)
  return sendWhatsAppMessage(phone, body)
}
