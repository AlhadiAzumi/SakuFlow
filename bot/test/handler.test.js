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
  await store.requestLink('user-uji', phone, '482913')
  await store.verifyOtp(phone, '482913')

  const reply = await collectReply('halo', phone)
  assert.match(reply, /Bot Sakunode aktif/)
  assert.doesNotMatch(reply, /Status nomor/)
  assert.doesNotMatch(reply, /terhubung/)
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

test('verifikasi menerima /verif dan kode tidak bisa dipakai ulang', async () => {
  config.dryRun = true
  const phone = '6286666666666'
  await store.requestLink('user-verif-prefix', phone, '735214')

  const first = await handleMessage(
    { id: 'otp-prefix-1', from: phone, text: { body: '/verif 735214' } },
    { send: async () => ({ dry: true }) },
  )
  assert.equal(first.type, 'otp')
  assert.equal(first.verified, true)

  assert.equal(await store.hasPendingOtp(phone), false)
  assert.equal(await store.verifyOtp(phone, '735214'), null)

  const second = await handleMessage(
    { id: 'otp-prefix-2', from: phone, text: { body: '/verif 735214' } },
    { send: async () => ({ dry: true }) },
  )
  assert.notEqual(second.type, 'otp')
  assert.notEqual(second.verified, true)
})

test('hapus 1 transaksi terakhir bekerja untuk nomor terhubung', async () => {
  const phone = '6285555555555'
  await store.requestLink('user-clear', phone, '111111')
  await store.verifyOtp(phone, '111111')
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
  await store.requestLink('user-clear-all', phone, '222222')
  await store.verifyOtp(phone, '222222')
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
  await store.requestLink('user-tabungan', phone, '333333')
  await store.verifyOtp(phone, '333333')
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
