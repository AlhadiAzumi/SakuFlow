import { config } from './config.js'
import { sendWhatsAppMessage } from './meta.js'
import { normalizePhone } from './parser.js'

function logDryRun(phone, body) {
  console.log(`\n[DRY-RUN WA → ${phone}]\n${body}\n`)
  return { dry: true }
}

// Meta WhatsApp Cloud API adalah satu-satunya jalur keluar.
export async function sendText(to, body) {
  const raw = String(to || '')
  const phone = normalizePhone(raw.includes('@') ? raw.split('@')[0] : raw)

  if (config.dryRun || !config.whatsappToken || !config.phoneNumberId) {
    return logDryRun(phone, body)
  }
  return sendWhatsAppMessage(phone, body)
}
