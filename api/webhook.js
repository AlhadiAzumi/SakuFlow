import { getWebhookChallenge, isValidMetaSignature, sendMetaText } from '../bot/src/meta.js'
import { processMetaWebhook } from '../bot/src/meta-webhook.js'
import { handleOptions, methodNotAllowed, readRawBody, sendPlain } from '../bot/src/vercel-api.js'

// Meta mengirim raw body; tanda tangan HMAC dihitung atas byte mentah ini.
export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)

  if (req.method === 'GET') {
    const challenge = getWebhookChallenge(req.query || {})
    return challenge
      ? sendPlain(req, res, 200, challenge)
      : sendPlain(req, res, 403, 'Forbidden')
  }

  if (req.method !== 'POST') return methodNotAllowed(req, res, ['GET', 'POST'])

  const raw = await readRawBody(req)
  if (!isValidMetaSignature(raw, req.headers?.['x-hub-signature-256'])) {
    return sendPlain(req, res, 401, 'Unauthorized')
  }

  let payload
  try {
    payload = JSON.parse(raw.toString('utf8'))
  } catch {
    return sendPlain(req, res, 400, 'Invalid JSON')
  }

  try {
    await processMetaWebhook(payload, { send: sendMetaText })
  } catch (error) {
    console.error('[Meta Webhook] Gagal memproses payload:', error)
  }
  return sendPlain(req, res, 200, 'OK')
}
