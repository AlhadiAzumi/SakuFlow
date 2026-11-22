import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { config } from '../src/config.js'
import { getWebhookChallenge, isValidMetaSignature, sendMetaText } from '../src/meta.js'

function withEnv(overrides, fn) {
  const saved = {}
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key]
    if (value === null) delete process.env[key]
    else process.env[key] = value
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    })
}

test('verifikasi webhook mengembalikan challenge bila token cocok', () => {
  const original = config.verifyToken
  config.verifyToken = 'catatan-uang-secret'
  try {
    assert.equal(getWebhookChallenge({
      'hub.mode': 'subscribe',
      'hub.challenge': 'abc123',
      'hub.verify_token': 'catatan-uang-secret',
    }), 'abc123')
    assert.equal(getWebhookChallenge({
      'hub.mode': 'subscribe',
      'hub.challenge': 'abc123',
      'hub.verify_token': 'salah',
    }), null)
    assert.equal(getWebhookChallenge({ 'hub.mode': 'unsubscribe', 'hub.challenge': 'abc123' }), null)
  } finally {
    config.verifyToken = original
  }
})

test('tanda tangan HMAC diterima hanya bila sesuai', () => {
  const originalSecret = config.appSecret
  const originalDryRun = config.dryRun
  config.appSecret = 'rahasia'
  config.dryRun = false
  try {
    const body = Buffer.from('{"object":"whatsapp_business_account"}')
    const signature = `sha256=${crypto.createHmac('sha256', 'rahasia').update(body).digest('hex')}`
    assert.equal(isValidMetaSignature(body, signature), true)
    assert.equal(isValidMetaSignature(body, 'sha256=ngawur'), false)
    assert.equal(isValidMetaSignature(body, undefined), false)
  } finally {
    config.appSecret = originalSecret
    config.dryRun = originalDryRun
  }
})

test('kirim teks Meta memanggil Graph API v25 dengan payload yang benar', () => withEnv({
  WHATSAPP_TOKEN: 'token-uji',
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
  WHATSAPP_API_VERSION: 'v25.0',
}, async () => {
  const originalFetch = globalThis.fetch
  const originalVersion = config.apiVersion
  config.apiVersion = 'v25.0'

  let call
  globalThis.fetch = async (url, options) => {
    call = { url, options }
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.1' }] }) }
  }

  try {
    const result = await sendMetaText('081234567890', 'halo dari test')
    assert.deepEqual(result, { messages: [{ id: 'wamid.1' }] })
    assert.match(call.url, /graph\.facebook\.com\/v25\.0\/123456789\/messages/)
    assert.equal(call.options.method, 'POST')
    assert.equal(call.options.headers.Authorization, 'Bearer token-uji')
    const body = JSON.parse(call.options.body)
    assert.equal(body.messaging_product, 'whatsapp')
    assert.equal(body.to, '6281234567890')
    assert.equal(body.text.body, 'halo dari test')
  } finally {
    config.apiVersion = originalVersion
    globalThis.fetch = originalFetch
  }
}))

test('kirim teks Meta gagal bila token belum diisi', () => withEnv({
  WHATSAPP_TOKEN: null,
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
}, async () => {
  const originalToken = config.whatsappToken
  config.whatsappToken = ''
  try {
    await assert.rejects(() => sendMetaText('081234567890', 'halo'), /belum dikonfigurasi/)
  } finally {
    config.whatsappToken = originalToken
  }
}))
