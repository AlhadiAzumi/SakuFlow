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
import { normalizePhone } from './parser.js'
import { getSelfIdentifiers, isSelfChatTarget } from './self-chat.js'
import { clearBaileysSocket, sendText, sentMessageIds, setBaileysSocket } from './whatsapp.js'

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

async function readMessage(message, socket) {
  const key = message.key || {}
  const id = key.id
  if (!id || processed.has(id) || sentMessageIds.has(id)) return null

  const targets = [key.remoteJid, key.remoteJidAlt].filter(Boolean)
  if (!targets.length || key.remoteJid === 'status@broadcast') return null

  const selfIds = getSelfIdentifiers(socket?.user)
  const isSelfChat = targets.some((target) => isSelfChatTarget(target, selfIds))
  if (key.fromMe && !isSelfChat) return null

  const text = message.message?.conversation
    || message.message?.extendedTextMessage?.text
    || message.message?.imageMessage?.caption
    || ''
  if (!text.trim()) return null

  processed.set(id, Date.now())
  cleanupProcessed()

  const fromTarget = targets.find((target) => String(target).includes('@s.whatsapp.net')) || targets[0]
  return {
    id,
    from: normalizePhone(String(fromTarget).split('@')[0]),
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

    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return
      for (const raw of messages || []) {
        const message = await readMessage(raw, socket)
        if (!message) continue
        try {
          await handleMessage(message)
        } catch (error) {
          console.error('[Baileys] Gagal memproses pesan:', error)
          await sendText(message.from, 'Waduh, gagal menyimpan catatan. Coba lagi sebentar, ya.').catch(() => {})
        }
      }
    })

    return socket
  } finally {
    connecting = false
  }
}
