// Ambil bagian sebelum ':' (device) dan '@' (domain).
// '80501142515803:14@lid' -> '80501142515803'
// '6285167811268@s.whatsapp.net' -> '6285167811268'
export function cleanJidId(jid) {
  if (!jid) return ''
  return String(jid).split(':')[0].split('@')[0]
}

// Alias lama, dipakai beberapa modul/test.
export const extractCleanId = cleanJidId

// Blokir grup, broadcast/status, channel, dan pesan dengan participant.
export function isBlockedKey(key) {
  const remoteJid = key?.remoteJid || ''
  if (!remoteJid) return true
  if (remoteJid.endsWith('@g.us')) return true
  if (remoteJid.endsWith('@broadcast') || remoteJid === 'status@broadcast') return true
  if (remoteJid.endsWith('@newsletter')) return true
  if (Boolean(key?.participant)) return true
  return false
}

// Whitelist ketat: hanya ID milik akun bot sendiri.
export const knownSelfIds = new Set()
let ownPhone = ''

export function getOwnPhone() {
  return ownPhone
}

export function addSelfId(jid) {
  const clean = cleanJidId(jid)
  if (clean) knownSelfIds.add(clean)
  return clean
}

// Isi dari sock.user DAN state.creds.me (dua-duanya, tanpa syarat).
export function seedSelfIds({ user, creds } = {}) {
  addSelfId(user?.id)
  addSelfId(user?.lid)
  addSelfId(creds?.me?.id)
  addSelfId(creds?.me?.lid)

  const primary = [user?.id, creds?.me?.id]
    .find((value) => value && !String(value).includes('@lid'))
  ownPhone = cleanJidId(primary)

  return ownPhone
}

// Satu-satunya gerbang self-chat. Berlaku untuk fromMe true maupun false.
export function isSelfChatKey(key) {
  const rawRemote = cleanJidId(key?.remoteJid)
  const rawAlt = cleanJidId(key?.remoteJidAlt)
  return knownSelfIds.has(rawRemote) || knownSelfIds.has(rawAlt)
}
