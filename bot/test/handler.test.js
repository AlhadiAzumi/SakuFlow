import assert from 'node:assert/strict'
import test, { after } from 'node:test'

// Pastikan store memakai memory, bukan Supabase, sebelum modul di-import.
const originalDryRunEnv = process.env.BOT_DRY_RUN
process.env.BOT_DRY_RUN = 'true'

const { config } = await import('../src/config.js')
const { handleMessage } = await import('../src/handler.js')
const store = await import('../src/store.js')

after(() => {
  if (originalDryRunEnv === undefined) delete process.env.BOT_DRY_RUN
  else process.env.BOT_DRY_RUN = originalDryRunEnv
})

async function collectReply(text, from = '6281234567890') {
  config.dryRun = true
  const replies = []
  await handleMessage(
    { id: `test-${text}-${from}`, from, text: { body: text } },
    { send: async (_to, body) => { replies.push(body); return { dry: true } } },
  )
  return replies.join('\n')
}

test('sapaan dan teks uji dibalas panduan singkat', async () => {
  for (const text of ['halo', 'menu', 'hai', 'ck']) {
    const reply = await collectReply(text)
    assert.match(reply, /Bot SakuFlow aktif/)
    assert.match(reply, /Status nomor: belum terhubung/)
    assert.match(reply, /kode OTP 6 digit/)
    assert.match(reply, /keluar 25rb kopi/)
    assert.match(reply, /Format catatan/)
  }
})

test('pesan yang tidak dikenal tetap dibalas panduan', async () => {
  const reply = await collectReply('blablabla')
  assert.match(reply, /Bot SakuFlow aktif/)
  assert.match(reply, /Status nomor: belum terhubung/)
  assert.match(reply, /Format catatan/)
})

test('panduan menampilkan status nomor yang sudah terhubung', async () => {
  const phone = '6289999999999'
  await store.requestLink('user-uji', phone, '123456')
  await store.verifyOtp(phone, '123456')

  const reply = await collectReply('halo', phone)
  assert.match(reply, /Status nomor: sudah terhubung/)
  assert.doesNotMatch(reply, /belum terhubung/)
})
