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
    assert.match(reply, /Bot Sakunode aktif/)
    assert.match(reply, /Status nomor: belum terhubung/)
    assert.match(reply, /kode OTP 6 digit/)
    assert.match(reply, /keluar 25rb kopi/)
    assert.match(reply, /Format catatan/)
  }
})

test('pesan yang tidak dikenal tetap dibalas panduan', async () => {
  const reply = await collectReply('blablabla')
  assert.match(reply, /Bot Sakunode aktif/)
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

test('verifikasi OTP mengembalikan hasil database', async () => {
  config.dryRun = true
  const phone = '6287777777777'
  await store.requestLink('user-otp', phone, '654321')

  const result = await handleMessage(
    { id: 'otp-result-test', from: phone, text: { body: '654321' } },
    { send: async () => ({ dry: true }) },
  )

  assert.equal(result.type, 'otp')
  assert.equal(result.ok, true)
  assert.equal(result.verified, true)
  assert.equal(result.phone, phone)
})

test('status, riwayat, dan hapus 1 transaksi terakhir bekerja untuk nomor terhubung', async () => {
  const phone = '6285555555555'
  await store.requestLink('user-clear', phone, '111111')
  await store.verifyOtp(phone, '111111')

  await collectReply('keluar 10rb kopi', phone)
  await collectReply('masuk gaji 2 juta', phone)

  const status = await collectReply('status', phone)
  assert.match(status, /sudah terhubung/)
  assert.match(status, /Total catatan tersimpan: 2/)

  const history = await collectReply('riwayat', phone)
  assert.match(history, /2 catatan terakhir/)
  assert.match(history, /kopi/)
  assert.match(history, /gaji/i)

  // "clear" sekarang menghapus tepat satu catatan (yang terakhir), bukan semua.
  const clear = await collectReply('clear', phone)
  assert.match(clear, /Catatan terakhir dihapus/)
  assert.match(clear, /Rp2\.000\.000/)

  const remaining = await collectReply('riwayat', phone)
  assert.match(remaining, /1 catatan terakhir/)
  assert.match(remaining, /kopi/)
  assert.doesNotMatch(remaining, /gaji/i)

  await collectReply('hapus', phone)
  const after = await collectReply('riwayat', phone)
  assert.match(after, /Belum ada catatan tersimpan/)

  const statusAfter = await collectReply('status', phone)
  assert.match(statusAfter, /sudah terhubung/)
  assert.match(statusAfter, /Total catatan tersimpan: 0/)

  const emptyDelete = await collectReply('batal', phone)
  assert.match(emptyDelete, /Belum ada catatan yang bisa dihapus/)
})

test('clear all / hapus semua menghapus seluruh catatan milik nomor terhubung', async () => {
  const phone = '6284444444444'
  await store.requestLink('user-clear-all', phone, '222222')
  await store.verifyOtp(phone, '222222')

  await collectReply('keluar 10rb kopi', phone)
  await collectReply('masuk gaji 2 juta', phone)
  assert.match(await collectReply('status', phone), /Total catatan tersimpan: 2/)

  const cleared = await collectReply('clear all', phone)
  assert.match(cleared, /2 catatan dihapus semuanya/)
  assert.match(cleared, /tidak bisa dibatalkan/)

  assert.match(await collectReply('riwayat', phone), /Belum ada catatan tersimpan/)
  assert.match(await collectReply('hapus semua', phone), /Belum ada catatan yang bisa dihapus/)

  const notLinked = await collectReply('clear all', '6281111111111')
  assert.match(notLinked, /belum terhubung/)
})
