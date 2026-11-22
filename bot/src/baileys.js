import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { handleMessage } from './handler.js'
import { getBotIdentity, isSelfChatFromKey, resolveSenderPhone } from './self-chat.js'
import {
  clearBaileysSocket,
  messageStore,
  sendText,
  sentMessageIds,
  setBaileysSocket,
} from './whatsapp.js'

const authDir = fileURLToPath(new URL('../auth', import.meta.url))
const processed = new Map()

let connecting = false
let reconnectTimer = null

function cleanupProcessed() {
  if (processed.size <= 500) return
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  for (const [id, time] of processed) if (time < cutoff) processed.delete(id)
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectBaileys()
  }, 1500)
}

// Baileys membungkus pesan self-chat / ephemeral di beberapa lapisan.
export function extractText(message) {
  const content = message?.deviceSentMessage?.message
    || message?.ephemeralMessage?.message
    || message?.viewOnceMessage?.message
    || message
  return String(
    content?.conversation
    || content?.extendedTextMessage?.text
    || content?.imageMessage?.caption
    || '',
  ).trim()
}

// Abaikan pesan lama (misalnya riwayat yang masuk lagi saat reconnect).
export function isFresh(message) {
  const timestamp = Number(message?.messageTimestamp)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return true
  return Date.now() / 1000 - timestamp <= 60
}

async function readMessage(message, socket) {
  const key = message.key || {}
  const id = key.id
  if (!id || processed.has(id) || sentMessageIds.has(id)) return null
  if (!isFresh(message)) return null

  const remoteJid = key.remoteJid || ''
  const remoteJidAlt = key.remoteJidAlt || ''
  if (!remoteJid && !remoteJidAlt) return null
  if (remoteJid === 'status@broadcast' || remoteJidAlt === 'status@broadcast') return null

  const identity = getBotIdentity(socket?.user)
  const isSelfChat = isSelfChatFromKey({ remoteJid, remoteJidAlt }, identity)
  if (key.fromMe && !isSelfChat) return null

  const text = extractText(message.message)
  if (!text) return null

  processed.set(id, Date.now())
  cleanupProcessed()

  const senderPhone = resolveSenderPhone(key, identity, isSelfChat)

  return {
    id,
    from: senderPhone,
    // JID asli tempat pesan diterima (@lid atau @s.whatsapp.net) dipakai
    // sebagai tujuan balasan agar kunci enkripsi Signal tetap konsisten.
    replyJid: remoteJid || remoteJidAlt,
    text: { body: text },
  }
}

export async function connectBaileys() {
  if (connecting) return null
  connecting = true

  try {
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve(authDir))

    const { version } = await fetchLatestBaileysVersion()

    const socket = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['SakuFlow Bot', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      // Saat HP meminta retry dekripsi, Baileys butuh isi pesan aslinya.
      getMessage: async (key) => messageStore.get(key?.id)?.message || undefined,
    })

    setBaileysSocket(socket)

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update

      if (update.qr) {
        qrcode.generate(update.qr, { small: true })
        console.log('[Baileys] Silakan scan QR di atas melalui WhatsApp > Perangkat Tertaut.')
      }

      if (connection === 'open') {
        console.log('[Baileys] WhatsApp terhubung. Bot siap menerima catatan.')
        return
      }

      if (connection === 'close') {
        clearBaileysSocket(socket)
        const statusCode = lastDisconnect?.error?.output?.statusCode
        if (statusCode === DisconnectReason.loggedOut) {
          console.log('[Baileys] Sesi logout. Jalankan `npm run baileys:reset`, lalu scan QR ulang.')
          return
        }
        console.log('[Baileys] Koneksi terputus. Menyambung ulang...')
        scheduleReconnect()
      }
    })

    socket.ev.on('messages.upsert', async (upsert) => {
      if (upsert.type !== 'notify' && upsert.type !== 'append') return
      for (const msg of upsert.messages || []) {
        const message = await readMessage(msg, socket)
        if (!message) continue
        console.log('[Bot Masuk]', {
          type: upsert.type,
          remoteJid: msg.key?.remoteJid,
          senderPhone: message.from,
          text: message.text.body,
        })
        try {
          await handleMessage(message)
        } catch (error) {
          console.error('[Baileys] Gagal memproses pesan:', error)
          await sendText(message.replyJid || message.from, 'Waduh, gagal menyimpan catatan. Coba lagi sebentar, ya.').catch(() => {})
        }
      }
    })

    return socket
  } finally {
    connecting = false
  }
}
