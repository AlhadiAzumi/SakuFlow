import assert from 'node:assert/strict'
import test from 'node:test'
import { detectType, extractAmount, normalizePhone, parseMessage } from '../src/parser.js'

const NOW = new Date(2026, 10, 21, 9, 0, 0)

test('nominal ribu, rb, dan k', () => {
  assert.equal(extractAmount('masuk uang 500 ribu'), 500000)
  assert.equal(extractAmount('keluar 25rb buat kopi'), 25000)
  assert.equal(extractAmount('beli bensin 50k'), 50000)
})

test('nominal juta dan format Rupiah', () => {
  assert.equal(extractAmount('gaji 3,5 juta'), 3500000)
  assert.equal(extractAmount('Rp125.000'), 125000)
  assert.equal(extractAmount('masuk 2 jt'), 2000000)
})

test('deteksi tipe pemasukan dan pengeluaran', () => {
  assert.equal(detectType('masuk uang 500 ribu'), 'income')
  assert.equal(detectType('gaji 3 juta'), 'income')
  assert.equal(detectType('keluar 25rb buat kopi'), 'expense')
  assert.equal(detectType('beli bensin 50 ribu'), 'expense')
})

test('parse lengkap dengan kategori dan tanggal', () => {
  const result = parseMessage('keluar 25rb buat kopi kemarin', NOW)
  assert.equal(result.intent, 'transaction')
  assert.equal(result.type, 'expense')
  assert.equal(result.amount, 25000)
  assert.equal(result.category, 'makanan')
  assert.equal(result.date, '2026-11-20')

  const income = parseMessage('masuk gaji 3,5 juta hari ini', NOW)
  assert.equal(income.type, 'income')
  assert.equal(income.amount, 3500000)
  assert.equal(income.category, 'gaji')
  assert.equal(income.date, '2026-11-21')
})

test('kategori transport, tagihan, dan hiburan', () => {
  assert.equal(parseMessage('bayar ojek 30 ribu', NOW).category, 'transport')
  assert.equal(parseMessage('bayar listrik 300rb', NOW).category, 'tagihan')
  assert.equal(parseMessage('nonton 100 ribu', NOW).category, 'hiburan')
})

test('perintah tabungan dikenali tanpa mengubah tipe transaksi', () => {
  const nabung = parseMessage('nabung 15 ribu', NOW)
  assert.equal(nabung.intent, 'savings')
  assert.equal(nabung.amount, 15000)
  assert.equal(nabung.category, 'tabungan')
  assert.equal(nabung.date, '2026-11-21')

  const kasi = parseMessage('kasi 65 ribu ke tabungan kemarin', NOW)
  assert.equal(kasi.intent, 'savings')
  assert.equal(kasi.amount, 65000)
  assert.equal(kasi.category, 'tabungan')
  assert.equal(kasi.date, '2026-11-20')

  assert.equal(parseMessage('tabungan', NOW).intent, 'unknown')
})

test('perintah bantuan dan ringkasan', () => {
  for (const text of ['bantuan', 'help', 'menu', 'daftar perintah', 'halo']) {
    assert.equal(parseMessage(text, NOW).intent, 'help')
  }
  for (const text of ['ringkasan', 'ringkasan bulan ini', 'rekap', 'total bulan ini']) {
    assert.equal(parseMessage(text, NOW).intent, 'summary')
  }
})

test('perintah status, riwayat, dan hapus transaksi terakhir', () => {
  for (const text of ['status', 'cek status', 'koneksi']) {
    assert.equal(parseMessage(text, NOW).intent, 'status')
  }
  for (const text of ['riwayat', 'lihat riwayat', '5 terakhir', 'history']) {
    assert.equal(parseMessage(text, NOW).intent, 'history')
  }
  for (const text of ['clear', 'hapus', 'HAPUS CATATAN', 'BATAL', 'batalkan', 'undo', 'hapus terakhir']) {
    assert.equal(parseMessage(text, NOW).intent, 'deleteLast')
  }
  assert.equal(parseMessage('hai kemana uangku', NOW).intent, 'unknown')
})

test('perintah hapus semua memiliki banyak alias', () => {
  for (const text of ['hapus semua', 'hapus semua catatan', 'hapus semua laporan', 'clear all', 'reset', 'HAPUS SEMUA TRANSAKSI']) {
    assert.equal(parseMessage(text, NOW).intent, 'deleteAll')
  }
  assert.equal(parseMessage('hapus semua riwayat', NOW).intent, 'deleteAll')
})

test('pesan tanpa nominal tidak dikenali', () => {
  assert.equal(parseMessage('hai kemana uangku', NOW).intent, 'unknown')
})

test('normalisasi nomor telepon', () => {
  assert.equal(normalizePhone('081234567890'), '6281234567890')
  assert.equal(normalizePhone('+62 812-3456-7890'), '6281234567890')
})
