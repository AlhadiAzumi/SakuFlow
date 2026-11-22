import { normalizePhone } from './parser.js'

// Kumpulkan semua bentuk identitas pengirim yang dianggap "diri sendiri".
// Baileys bisa memakai phone number (PN) atau LID, dengan/without suffix device.
export function getSelfIdentifiers(user) {
  const ids = new Set()

  if (user?.id) {
    const base = String(user.id)
      .replace(/:\d+@/, '@')
      .replace(/@(s\.whatsapp\.net|lid)$/, '')
    if (base) {
      ids.add(base)
      ids.add(`${base}@s.whatsapp.net`)
      const normalized = normalizePhone(base)
      if (normalized) {
        ids.add(normalized)
        ids.add(`${normalized}@s.whatsapp.net`)
      }
    }
  }

  if (user?.lid) {
    const lid = String(user.lid)
    ids.add(lid)
    if (!lid.includes('@')) ids.add(`${lid}@lid`)
  }

  return ids
}

// Cek apakah remoteJid / remoteJidAlt mengarah ke chat diri sendiri.
export function isSelfChatTarget(target, selfIds) {
  if (!target) return false
  const value = String(target)
  const clean = value.replace(/:\d+@/, '@')
  return selfIds.has(value) || selfIds.has(clean)
}
