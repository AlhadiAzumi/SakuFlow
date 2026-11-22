import { config as botConfig } from '../bot/src/config.js'
import { handleOptions, methodNotAllowed, sendJson } from '../bot/src/vercel-api.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET'])

  // Tampilkan status konfigurasi saja, jangan pernah mengirim nilai secret.
  return sendJson(req, res, 200, {
    ok: true,
    channel: 'meta-cloud',
    metaConfigured: Boolean(botConfig.whatsappToken && botConfig.phoneNumberId),
    verifyTokenConfigured: Boolean(botConfig.verifyToken),
    appSecretConfigured: Boolean(botConfig.appSecret),
    supabaseConfigured: Boolean(botConfig.supabaseUrl && botConfig.serviceRoleKey),
    dryRun: botConfig.dryRun,
  })
}
