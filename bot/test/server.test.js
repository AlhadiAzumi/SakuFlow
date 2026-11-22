import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before, test } from 'node:test'

const savedEnv = {
  BOT_DRY_RUN: process.env.BOT_DRY_RUN,
  VERCEL: process.env.VERCEL,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
}

// Import server.js tanpa memulai port 3001 dan dengan origin tambahan.
process.env.BOT_DRY_RUN = 'true'
process.env.VERCEL = '1'
process.env.WEB_ORIGIN = 'https://sakuflow-mu.vercel.app, https://extra.example.com/'

const { default: app } = await import('../src/server.js')

let server
let base

before(async () => {
  server = app.listen(0)
  await once(server, 'listening')
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('preflight OPTIONS diizinkan untuk origin production', async () => {
  const response = await fetch(`${base}/api/link/request`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://sakuflow-mu.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  })

  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://sakuflow-mu.vercel.app')
  assert.match(response.headers.get('access-control-allow-methods') || '', /POST/)
})

test('WEB_ORIGIN dengan trailing slash dinormalisasi', async () => {
  const response = await fetch(`${base}/api/link/status`, {
    headers: { Origin: 'https://extra.example.com' },
  })

  assert.equal(response.headers.get('access-control-allow-origin'), 'https://extra.example.com')
})

test('request OTP mengembalikan kode walau WhatsApp gagal', async () => {
  const response = await fetch(`${base}/api/link/request`, {
    method: 'POST',
    headers: {
      Origin: 'https://sakuflow-mu.vercel.app',
      Authorization: 'Bearer token-uji',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone: '081234567890' }),
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://sakuflow-mu.vercel.app')
  const data = await response.json()
  assert.equal(data.ok, true)
  assert.match(data.otp, /^\d{6}$/)
  assert.equal(data.delivered, false)
  assert.equal(data.phone, '6281234567890')
})
