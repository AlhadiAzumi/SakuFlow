import { config } from './config.js'
import { normalizePhone } from './parser.js'
import { addSelfId, isBlockedKey } from './self-chat.js'

let baileysSocket = null

// ID balasan bot yang baru dikirim. Dipakai supaya pesan keluar tidak memicu
// balasan ulang saat dibaca kembali lewat messages.upsert (self-chat).
export const sentMessageIds = new Set()

// Simpan objek pesan keluar supaya Baileys bisa mengenkripsi ulang saat HP
// meminta retry dekripsi (("Waiting for this message...")).
export const messageStore = new Map()

function rememberSentMessage(sentMsg) {
  const id = sentMsg?.key?.id
  if (!id) return

  sentMessageIds.add(id)
  const loopTimer = setTimeout(() => sentMessageIds.delete(id), 30_000)
  loopTimer.unref?.()

  messageStore.set(id, sentMsg)
  const storeTimer = setTimeout(() => messageStore.delete(id), 5 * 60_000)
  storeTimer.unref?.()

  // WhatsApp mengembalikan JID @lid ruang self-chat di sentMsg.key.remoteJid.
  // Ambil setiap kirim yang berhasil, kecuali JID grup/broadcast/channel —
  // supaya group JID tidak pernah masuk whitelist.
  const sentRemoteJid = sentMsg?.key?.remoteJid
  if (sentRemoteJid && !isBlockedKey({ remoteJid: sentRemoteJid })) {
    addSelfId(sentRemoteJid)
  }
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
  const raw = String(to || '')
  const isJid = raw.includes('@')
  const phone = isJid ? normalizePhone(raw.split('@')[0]) : normalizePhone(raw)

  if (config.dryRun) return logDryRun(phone, body)

  if (config.botMode === 'baileys') {
    if (!baileysSocket) {
      throw new Error('Baileys belum terhubung. Scan QR di terminal dulu, ya.')
    }
    // Self-chat bisa memakai @lid. Kirim balasan ke JID asli yang menerima
    // pesan supaya jalur kunci Signal tetap konsisten dalam satu sesi chat.
    const jid = isJid ? raw : `${phone}@s.whatsapp.net`
    const sentMsg = await baileysSocket.sendMessage(jid, { text: body })
    rememberSentMessage(sentMsg)
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
