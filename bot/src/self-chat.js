import { normalizePhone } from './parser.js'

// Bersihkan JID/LID jadi ID mentah: buang :device dan @domain.
// "6285167811268:14@s.whatsapp.net" -> "6285167811268"
// "80501142515803:14@lid"           -> "80501142515803"
export function extractCleanId(value) {
  if (!value) return ''
  return String(value).split(':')[0].split('@')[0]
}

// Whitelist ID milik sendiri. Diisi dari sock.user, state.creds.me, dan
// remoteJid hasil kirim pesan (bisa berupa JID @lid ruang self-chat).
export const knownSelfIds = new Set()
let ownPhone = ''

export function getOwnPhone() {
  return ownPhone
}

export function addSelfId(value) {
  const clean = extractCleanId(value)
  if (clean) knownSelfIds.add(clean)
  return clean
}

// Isi ulang whitelist setiap koneksi siap / sesi berubah.
export function seedSelfIds({ user, creds } = {}) {
  const candidates = [user?.id, creds?.me?.id]
  const primary = candidates.find((value) => value && !String(value).includes('@lid')) || ''
  ownPhone = extractCleanId(primary)

  if (ownPhone) {
    const normalized = normalizePhone(ownPhone)
    if (normalized) ownPhone = normalized
    knownSelfIds.add(ownPhone)
  }

  addSelfId(user?.id)
  addSelfId(user?.lid)
  addSelfId(creds?.me?.id)
  addSelfId(creds?.me?.lid)

  return ownPhone
}

// Satu-satunya gerbang self-chat: cocokkan remoteJid / remoteJidAlt dengan
// whitelist. Pemisah ':' dan '@' sudah dibuang oleh extractCleanId.
export function isSelfChatKey(key) {
  const rawRemote = extractCleanId(key?.remoteJid)
  const rawAlt = extractCleanId(key?.remoteJidAlt)
  return knownSelfIds.has(rawRemote) || Boolean(rawAlt && knownSelfIds.has(rawAlt))
}
