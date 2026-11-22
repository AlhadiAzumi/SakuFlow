import { config } from './config.js'
import { normalizePhone } from './parser.js'

let baileysSocket = null

// ID balasan bot yang baru dikirim. Dipakai supaya pesan keluar tidak memicu
// balasan ulang saat dibaca kembali lewat messages.upsert (self-chat).
export const sentMessageIds = new Set()

function rememberSentMessage(id) {
  if (!id) return
  sentMessageIds.add(id)
  const timer = setTimeout(() => sentMessageIds.delete(id), 30_000)
  timer.unref?.()
}

export function setBaileysSocket(socket) {
  baileysSocket = socket
}

export function clearBaileysSocket(socket) {
  if (!socket || baileysSocket === socket) baileysSocket = null
}

function logDryRun(phone, body) {
  console.log(`\n[DRY-RUN WA → ${phone}]\n${body}\n`)
  return { dry: true }
}

export async function sendText(to, body) {
  const phone = normalizePhone(to)

  if (config.dryRun) return logDryRun(phone, body)

  if (config.botMode === 'baileys') {
    if (!baileysSocket) {
      throw new Error('Baileys belum terhubung. Scan QR di terminal dulu, ya.')
    }
    const jid = phone.endsWith('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`
    const sentMsg = await baileysSocket.sendMessage(jid, { text: body })
    rememberSentMessage(sentMsg?.key?.id)
    return sentMsg
  }

  // Jalur lama: Meta WhatsApp Cloud API.
  if (!config.whatsappToken || !config.phoneNumberId) return logDryRun(phone, body)

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
        text: { body },
      }),
    },
  )

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Gagal kirim WA: ${payload?.error?.message || response.status}`)
  }
  return payload
}
