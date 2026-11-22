import { handleOptions, linkStatus, methodNotAllowed } from '../../bot/src/vercel-api.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET'])
  return linkStatus(req, res)
}
