import { getWebhookChallenge, isValidMetaSignature, sendWhatsAppMessage } from '../bot/src/meta.js'
import { processMetaWebhook } from '../bot/src/meta-webhook.js'
import { handleOptions, methodNotAllowed, readRawBody, sendPlain } from '../bot/src/vercel-api.js'

// Meta mengirim raw body; tanda tangan HMAC dihitung atas byte mentah ini.
export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)

  if (req.method === 'GET') {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || undefined
    const challenge = getWebhookChallenge(req.query || {}, verifyToken)
    return challenge
      ? sendPlain(req, res, 200, challenge)
      : sendPlain(req, res, 403, 'Forbidden')
  }

  if (req.method !== 'POST') return methodNotAllowed(req, res, ['GET', 'POST'])

  const raw = await readRawBody(req)
  console.log('[Webhook Masuk]', JSON.stringify(req.body ?? raw))
  const rawText = raw.toString('utf8')
  let rawPayload = rawText
  try {
    rawPayload = JSON.parse(rawText)
  } catch {
    // Teks apa adanya tetap dicetak bukan JSON valid.
  }
  console.log('[Webhook Parsed]', JSON.stringify(rawPayload))

  try {
    if (!isValidMetaSignature(raw, req.headers?.['x-hub-signature-256'])) {
      return sendPlain(req, res, 401, 'UNAUTHORIZED')
    }

    let payload
    try {
      payload = JSON.parse(rawText)
    } catch {
      return sendPlain(req, res, 400, 'INVALID_JSON')
    }

    // Semua proses (Supabase, parser, dan kirim balasan Meta) harus selesai
    // sebelum response dikirim karena Vercel mematikan function setelah itu.
    await processMetaWebhook(payload, { send: sendWhatsAppMessage })
  } catch (err) {
    console.error('[Webhook Error]', err)
  }

  return sendPlain(req, res, 200, 'EVENT_RECEIVED')
}
