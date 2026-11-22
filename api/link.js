import { handleOptions, linkDelete, methodNotAllowed } from '../bot/src/vercel-api.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)
  if (req.method !== 'DELETE') return methodNotAllowed(req, res, ['DELETE'])
  return linkDelete(req, res)
}
