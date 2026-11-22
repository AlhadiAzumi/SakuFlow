import { handleOptions, linkRequest, methodNotAllowed } from '../../bot/src/vercel-api.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST'])
  return linkRequest(req, res)
}
