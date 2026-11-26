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

// Token milik pemohon yang kini wajib menyertai kode OTP saat verifikasi.
const LINK_TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

async function collectReply(text, from = '6281234567890') {
  config.dryRun = true
  const replies = []
  await handleMessage(
    { id: `test-${text}-${from}`, from, text: { body: text } },
    { send: async (_to, body) => { replies.push(body); return { dry: true } } },
  )
  return replies.join('\n')
}

const monthKeyNow = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

test('sapaan dan teks uji dibalas panduan singkat', async () => {
  for (const text of ['halo', 'menu', 'hai', 'ck']) {
    const reply = await collectReply(text)
    assert.match(reply, /Bot Sakunode aktif/)
    assert.match(reply, /Hasilnya cek di website Sakunode/)
    assert.match(reply, /keluar 25rb kopi/)
    assert.match(reply, /Contoh catatan/)
    assert.doesNotMatch(reply, /Status nomor/)
  }
})

test('pesan yang tidak dikenal tetap dibalas panduan', async () => {
  const reply = await collectReply('blablabla')
  assert.match(reply, /Bot Sakunode aktif/)
  assert.match(reply, /Contoh catatan/)
  assert.doesNotMatch(reply, /Status nomor/)
})

test('panduan tidak menampilkan status koneksi walaupun nomor sudah terhubung', async () => {
  const phone = '6289999999999'
  await store.requestLink('user-uji', phone, '482913', LINK_TOKEN)
  await store.verifyOtp(phone, '482913', LINK_TOKEN)

  const reply = await collectReply('halo', phone)
  assert.match(reply, /Bot Sakunode aktif/)
  assert.doesNotMatch(reply, /Status nomor/)
  assert.doesNotMatch(reply, /terhubung/)
})

test('verifikasi OTP mengembalikan hasil database', async () => {
  config.dryRun = true
  const phone = '6287777777777'
  await store.requestLink('user-otp', phone, '654321', LINK_TOKEN)

  const result = await handleMessage(
    { id: 'otp-result-test', from: phone, text: { body: `654321 ${LINK_TOKEN}` } },
    { send: async () => ({ dry: true }) },
  )

  assert.equal(result.type, 'otp')
  assert.equal(result.ok, true)
  assert.equal(result.verified, true)
  assert.equal(result.phone, phone)
})

test('verifikasi menerima /verif dan kode tidak bisa dipakai ulang', async () => {
  config.dryRun = true
  const phone = '6286666666666'
  await store.requestLink('user-verif-prefix', phone, '735214', LINK_TOKEN)

  const first = await handleMessage(
    { id: 'otp-prefix-1', from: phone, text: { body: `/verif 735214 ${LINK_TOKEN}` } },
    { send: async () => ({ dry: true }) },
  )
  assert.equal(first.type, 'otp')
  assert.equal(first.verified, true)

  assert.equal(await store.hasPendingOtp(phone), false)
  assert.equal(await store.verifyOtp(phone, '735214', LINK_TOKEN), null)

  const second = await handleMessage(
    { id: 'otp-prefix-2', from: phone, text: { body: `/verif 735214 ${LINK_TOKEN}` } },
    { send: async () => ({ dry: true }) },
  )
  assert.notEqual(second.type, 'otp')
  assert.notEqual(second.verified, true)
})

test('kode OTP tanpa token pemohon tidak mengikat nomor ke akun', async () => {
  config.dryRun = true
  const phone = '6281212121212'
  await store.requestLink('user-penyerang', phone, '918273', LINK_TOKEN)

  // Pemilik nomor membalas kode saja, seperti yang dulu diperintahkan pesan OTP.
  const result = await handleMessage(
    { id: 'otp-tanpa-token', from: phone, text: { body: '/verif 918273' } },
    { send: async () => ({ dry: true }) },
  )

  assert.notEqual(result.type, 'otp')
  assert.notEqual(result.verified, true)
  assert.equal(await store.getLinkedUser(phone), null)
  assert.equal(await store.hasPendingOtp(phone), true)
})

test('hapus 1 transaksi terakhir bekerja untuk nomor terhubung', async () => {
  const phone = '6285555555555'
  await store.requestLink('user-clear', phone, '111111', LINK_TOKEN)
  await store.verifyOtp(phone, '111111', LINK_TOKEN)
  const userId = await store.getLinkedUser(phone)

  await collectReply('keluar 10rb kopi', phone)
  await collectReply('masuk gaji 2 juta', phone)
  assert.equal(await store.countTransactions(userId), 2)

  // "clear" sekarang menghapus tepat satu catatan (yang terakhir), bukan semua.
  const clear = await collectReply('clear', phone)
  assert.match(clear, /Catatan terakhir dihapus/)
  assert.match(clear, /Rp2\.000\.000/)
  assert.equal(await store.countTransactions(userId), 1)

  await collectReply('hapus', phone)
  assert.equal(await store.countTransactions(userId), 0)

  const emptyDelete = await collectReply('batal', phone)
  assert.match(emptyDelete, /Belum ada catatan yang bisa dihapus/)
})

test('clear all / hapus semua menghapus seluruh catatan milik nomor terhubung', async () => {
  const phone = '6284444444444'
  await store.requestLink('user-clear-all', phone, '222222', LINK_TOKEN)
  await store.verifyOtp(phone, '222222', LINK_TOKEN)
  const userId = await store.getLinkedUser(phone)

  await collectReply('keluar 10rb kopi', phone)
  await collectReply('masuk gaji 2 juta', phone)
  assert.equal(await store.countTransactions(userId), 2)

  const cleared = await collectReply('clear all', phone)
  assert.match(cleared, /2 catatan dihapus semuanya/)
  assert.match(cleared, /tidak bisa dibatalkan/)
  assert.equal(await store.countTransactions(userId), 0)

  assert.match(await collectReply('hapus semua', phone), /Belum ada catatan yang bisa dihapus/)

  const notLinked = await collectReply('clear all', '6281111111111')
  assert.match(notLinked, /belum terhubung/)
})

test('tabungan lewat chat mengurangi sisa tanpa masuk pengeluaran', async () => {
  const phone = '6283333333333'
  await store.requestLink('user-tabungan', phone, '333333', LINK_TOKEN)
  await store.verifyOtp(phone, '333333', LINK_TOKEN)
  const userId = await store.getLinkedUser(phone)
  const monthKey = monthKeyNow()

  await collectReply('masuk gaji 5 juta', phone)
  const saved = await collectReply('nabung 15 ribu', phone)
  assert.match(saved, /Tabungan tersimpan/)
  assert.match(saved, /Rp15\.000/)
  assert.match(saved, /Sisa sekarang: Rp4\.985\.000/)

  let totals = await store.getMonthTotals(userId, monthKey)
  assert.equal(totals.expense, 0)
  assert.equal(totals.savings, 15000)
  assert.equal(totals.income - totals.expense - totals.savings, 4985000)

  const items = await store.listRecentTransactions(userId, 5)
  assert.equal(items.length, 2)
  assert.equal(items[0].category, 'tabungan')

  await collectReply('kasi 65 ribu ke tabungan', phone)
  totals = await store.getMonthTotals(userId, monthKey)
  assert.equal(totals.savings, 80000)
  assert.equal(totals.income - totals.expense - totals.savings, 4920000)
})

test('nomor yang sudah terhubung ke akun lain tidak bisa diambil alih', async () => {
  config.dryRun = true
  const phone = '6281313131313'
  await store.requestLink('user-asli', phone, '445566', LINK_TOKEN)
  assert.equal(await store.verifyOtp(phone, '445566', LINK_TOKEN), 'user-asli')

  await assert.rejects(
    () => store.requestLink('user-lain', phone, '778899', LINK_TOKEN),
    (error) => error.code === 'PHONE_TAKEN',
  )
  assert.equal(await store.getLinkedUser(phone), 'user-asli')
})

test('permintaan kode berulang untuk nomor yang sama kena cooldown', async () => {
  config.dryRun = true
  const phone = '6281414141414'
  await store.requestLink('user-cooldown', phone, '121212', LINK_TOKEN)

  await assert.rejects(
    () => store.requestLink('user-cooldown', phone, '343434', LINK_TOKEN),
    (error) => error.code === 'COOLDOWN' && error.retryAfter > 0,
  )
})
