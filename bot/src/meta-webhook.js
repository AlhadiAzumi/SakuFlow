import { handleMessage } from './handler.js'
import { normalizePhone } from './parser.js'
import { sendWhatsAppMessage } from './meta.js'

const processed = new Map()

const maskPhone = (value) => String(value || '').replace(/^(\d{2,4})\d+(\d{2,4})$/, '$1****$2')

export function clearProcessedMessages() {
  processed.clear()
}

// Dipakai Express (mode meta/lokal) maupun serverless Vercel.
// `send` diinjeksikan supaya pemanggil bisa mengganti jalur pengiriman bila perlu.
// `onExtracted` / `onResult` dipakai webhook untuk log diagnostik di Runtime Logs.
export async function processMetaWebhook(payload, {
  send,
  reply = sendWhatsAppMessage,
  onExtracted = (info) => console.log('[Msg Extracted]', {
    from: maskPhone(info.from),
    textLength: String(info.text || '').length,
  }),
  onResult = (result) => console.log('[DB / OTP Result]', result),
} = {}) {
  const results = []

  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) {
        if (!message.id || processed.has(message.id)) continue
        processed.set(message.id, Date.now())

        const from = normalizePhone(message.from)
        const text = String(message.text?.body || '').trim()
        onExtracted({ from, text })

        try {
          const result = await handleMessage(message, { send })
          onResult(result)
          results.push(result)
        } catch (error) {
          console.error('Gagal memproses pesan:', error)
          const result = { type: 'error', ok: false, from, text, error: error.message }
          onResult(result)
          results.push(result)
          await reply(from, 'Waduh, gagal memproses catatan. Coba lagi sebentar, ya.').catch(() => {})
        }
      }
    }
  }

  if (processed.size > 500) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const [id, time] of processed) if (time < cutoff) processed.delete(id)
  }

  return results
}
