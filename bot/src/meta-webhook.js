import { handleMessage } from './handler.js'
import { normalizePhone } from './parser.js'
import { sendMetaText } from './meta.js'

const processed = new Map()

export function clearProcessedMessages() {
  processed.clear()
}

// Dipakai Express (mode meta/lokal) maupun serverless Vercel.
// `send` diinjeksikan supaya pemanggil bisa mengganti jalur pengiriman bila perlu.
export async function processMetaWebhook(payload, { send, reply = sendMetaText } = {}) {
  let handled = 0

  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) {
        if (!message.id || processed.has(message.id)) continue
        processed.set(message.id, Date.now())

        try {
          await handleMessage(message, { send })
          handled += 1
        } catch (error) {
          console.error('Gagal memproses pesan:', error)
          await reply(
            normalizePhone(message.from),
            'Waduh, gagal memproses catatan. Coba lagi sebentar, ya.',
          ).catch(() => {})
        }
      }
    }
  }

  if (processed.size > 500) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const [id, time] of processed) if (time < cutoff) processed.delete(id)
  }

  return handled
}
