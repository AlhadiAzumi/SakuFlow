import { normalizePhone } from './parser.js'

// Hilangkan suffix :device dan @domain dari JID/LID Baileys.
// "6285167811268:14@s.whatsapp.net" -> "6285167811268"
// "80501142515803:14@lid"           -> "80501142515803"
export function extractCleanId(value) {
  if (!value) return ''
  return String(value).split('@')[0].split(':')[0]
}

// Nomor HP dan LID milik akun yang sedang login (sock.user).
export function getBotIdentity(user) {
  const rawId = String(user?.id || '')
  const rawLid = String(user?.lid || '')

  const ownLid = rawLid
    ? extractCleanId(rawLid)
    : (rawId.includes('@lid') ? extractCleanId(rawId) : '')

  // Kalau user.id justru berupa LID, jangan dianggap sebagai nomor HP.
  const ownPhone = rawId.includes('@lid') ? '' : extractCleanId(rawId)

  return { ownPhone, ownLid }
}

// Deteksi ruang "Chat ke Diri Sendiri", baik memakai PN (@s.whatsapp.net)
// maupun LID (@lid).remoteJidAlt ikut dicek karena Baileys bisa menukar keduanya.
export function isSelfChatFromKey(key, identity) {
  const rawRemoteId = extractCleanId(key?.remoteJid)
  const rawAltId = extractCleanId(key?.remoteJidAlt)
  const { ownPhone, ownLid } = identity || {}

  return Boolean(
    (ownPhone && (rawRemoteId === ownPhone || rawAltId === ownPhone))
    || (ownLid && (rawRemoteId === ownLid || rawAltId === ownLid)),
  )
}

// Self-chat selalu memakai nomor HP terdaftar, bukan angka LID.
export function resolveSenderPhone(key, identity, isSelfChat) {
  const { ownPhone } = identity || {}
  if (isSelfChat && ownPhone) return ownPhone

  const remote = key?.remoteJid || key?.remoteJidAlt || ''
  return normalizePhone(extractCleanId(remote))
}
