import assert from 'node:assert/strict'
import test from 'node:test'

// Store memakai memori, bukan Supabase, sebelum modul di-import.
const savedDryRun = process.env.BOT_DRY_RUN
process.env.BOT_DRY_RUN = 'true'

const { linkStatus } = await import('../src/vercel-api.js')

const makeRes = () => ({
  statusCode: 0,
  headers: {},
  body: '',
  setHeader(name, value) {
    this.headers[String(name).toLowerCase()] = value
  },
  end(body) {
    this.body = body ? String(body) : ''
  },
})

test('request tanpa header Authorization dibalas 401, bukan 500', async () => {
  const res = makeRes()
  await linkStatus({ headers: {} }, res)

  assert.equal(res.statusCode, 401)
  assert.match(res.body, /Token autentikasi diperlukan/)
})

// Catatan: di mode dry-run setiap token dipetakan ke DEMO_USER, jadi cabang
// "token tidak sah" hanya bisa diuji dengan Supabase asli.

test('selesai: pulihkan environment', () => {
  if (savedDryRun === undefined) delete process.env.BOT_DRY_RUN
  else process.env.BOT_DRY_RUN = savedDryRun
})