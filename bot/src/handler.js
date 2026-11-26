import { getCategory } from '../../src/lib/categories.js'
import { normalizePhone, parseMessage } from './parser.js'
import * as store from './store.js'
import { sendText } from './whatsapp.js'

const rupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Math.round(value || 0))}`

function buildGuideText() {
  return [
    'Bot Sakunode aktif.',
    'Aku hanya membaca dan menyimpan catatan. Hasilnya cek di website Sakunode.',
    '',
    'Contoh catatan:',
    '• keluar 25rb kopi',
    '• masuk uang 500 ribu',
    '• beli bensin 50 ribu kemarin',
    '• gaji 3,5 juta hari ini',
    '• nabung 15 ribu',
    '• kasi 65 ribu ke tabungan',
    '',
    'Salah catat? Kirim "hapus" atau "hapus semua".',
  ].join('\n')
}

export async function handleMessage(message, { send = sendText } = {}) {
  const phone = normalizePhone(message.from)
  // Balasan dikirim ke nomor WhatsApp pengirim.
  const replyTo = message.replyJid || phone
  // `send` bisa diinjeksikan oleh pemanggil (mis. serverless) bila perlu.
  const reply = (body) => send(replyTo, body)
  const text = String(message.text?.body || '').trim()
  if (!text) {
    await reply('Aku belum bisa membaca pesan ini. Coba kirim teks, ya.')
    return { type: 'empty', ok: false, phone }
  }

  const pendingOtp = await store.hasPendingOtp(phone)
  if (pendingOtp) {
    // Format utama: "/verif <kode> <token>". Token berasal dari sesi web pemohon.
    // Pemisah "/" atau ":" juga diterima supaya salinan dari tautan tidak gagal.
    const otpMatch = text.match(/^(?:(?:\/?(?:verif|otp))[\s/:]+)?(\d{4,8})[\s/:]+([A-Za-z0-9_-]{16,64})$/i)
    if (otpMatch) {
      const userId = await store.verifyOtp(phone, otpMatch[1], otpMatch[2])
      await reply(userId
        ? 'Nomor WhatsApp kamu berhasil dihubungkan. Sekarang kamu bisa langsung chat catatan uang di sini.'
        : 'Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru lewat website, lalu kirim lewat tautan yang ada di halaman Setelan.')
      return { type: 'otp', ok: Boolean(userId), verified: Boolean(userId), phone, userId: userId || null }
    }
  }

  // Balasan kode tanpa token jangan sampai terbaca sebagai transaksi, baik saat
  // OTP masih pending maupun setelah nomor terhubung. Ini juga menangkap
  // salinan format "verif/<kode>" yang sering dikirim tanpa token.
  if (/^(?:(?:\/?(?:verif|otp))[\s/:]+)?\d{4,8}$/i.test(text)) {
    await reply('Salin perintah lengkap di halaman Setelan, lalu kirim ke bot ini, ya.')
    return { type: 'otp', ok: false, verified: false, phone, reason: 'missing_token' }
  }

  // Sapaan dan teks uji bukan transaksi, cukup beri panduan singkat.
  if (/^(halo|hi|hai|menu|permisi|p|ck)$/i.test(text)) {
    await reply(buildGuideText())
    return { type: 'guide', ok: true, phone }
  }

  const parsed = parseMessage(text)

  if (parsed.intent === 'deleteAll') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung, jadi tidak ada catatan yang bisa dihapus. Hubungkan WhatsApp lewat Setelan dulu, ya.')
      return { type: 'delete_all', ok: false, phone, reason: 'not_linked' }
    }
    const deleted = await store.deleteAllTransactions(userId)
    if (!deleted) {
      await reply('Belum ada catatan yang bisa dihapus. Kirim dulu misalnya "keluar 25rb kopi".')
      return { type: 'delete_all', ok: true, phone, userId, deleted: 0 }
    }
    await reply([
      `${deleted} catatan dihapus semuanya.`,
      'Data di website juga ikut terhapus. Tindakan ini tidak bisa dibatalkan.',
    ].join('\n'))
    return { type: 'delete_all', ok: true, phone, userId, deleted }
  }

  if (parsed.intent === 'deleteLast') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung, jadi tidak ada catatan yang bisa dihapus. Hubungkan WhatsApp lewat Setelan dulu, ya.')
      return { type: 'delete_last', ok: false, phone, reason: 'not_linked' }
    }
    const deleted = await store.deleteLastTransaction(userId)
    if (!deleted) {
      await reply('Belum ada catatan yang bisa dihapus. Kirim dulu misalnya "keluar 25rb kopi".')
      return { type: 'delete_last', ok: true, phone, userId, deleted: false }
    }
    const category = getCategory(deleted.type, deleted.category)
    await reply([
      'Catatan terakhir dihapus.',
      `${deleted.date} • ${category.label} • ${rupiah(deleted.amount)}`,
      'Data di website juga ikut terhapus.',
    ].join('\n'))
    return { type: 'delete_last', ok: true, phone, userId, deleted: true }
  }

  if (parsed.intent === 'savings') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung. Buka Setelan di website, lalu kirim kode lewat tautan bot.')
      return { type: 'savings', ok: false, phone, reason: 'not_linked' }
    }
    // Tabungan disimpan sebagai category 'tabungan' di tabel transactions.
    // Ini menghindari perubahan constraint tipe di database Supabase.
    await store.insertTransaction({
      user_id: userId,
      type: 'expense',
      amount: parsed.amount,
      category: 'tabungan',
      note: parsed.note,
      date: parsed.date,
      source: 'whatsapp',
      bot_message_id: message.id || null,
      created_at: new Date().toISOString(),
    })
    let totals = { income: 0, expense: 0, savings: 0, count: 0 }
    try {
      totals = await store.getMonthTotals(userId, parsed.date.slice(0, 7))
    } catch (error) {
      console.error('[Bot] Gagal mengambil rekap setelah tabungan tersimpan:', error)
    }
    await reply([
      'Tabungan tersimpan.',
      `${rupiah(parsed.amount)} • Tabungan`,
      `Total tabungan bulan ini: ${rupiah(totals.savings || 0)}.`,
      `Sisa sekarang: ${rupiah(totals.income - totals.expense - (totals.savings || 0))}.`,
      'Cek websitenya, datanya langsung muncul.',
    ].join('\n'))
    return { type: 'savings', ok: true, phone, userId, amount: parsed.amount }
  }

  if (parsed.intent === 'transaction') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung. Buka Setelan di website, lalu kirim kode lewat tautan bot.')
      return { type: 'transaction', ok: false, phone, reason: 'not_linked' }
    }
    await store.insertTransaction({
      user_id: userId,
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      note: parsed.note,
      date: parsed.date,
      source: 'whatsapp',
      bot_message_id: message.id || null,
      created_at: new Date().toISOString(),
    })
    const category = getCategory(parsed.type, parsed.category)
    // Transaksi sudah tersimpan. Kalau rekap gagal, jangan sampai user
    // dikabari "gagal menyimpan". Kirim konfirmasi dengan rekap kosong.
    let totals = { income: 0, expense: 0, savings: 0, count: 0 }
    try {
      totals = await store.getMonthTotals(userId, parsed.date.slice(0, 7))
    } catch (error) {
      console.error('[Bot] Gagal mengambil rekap setelah transaksi tersimpan:', error)
    }
    await reply([
      `${parsed.type === 'income' ? 'Uang masuk' : 'Uang keluar'} tersimpan.`,
      `${rupiah(parsed.amount)} • ${category.label}`,
      `Total bulan ini: masuk ${rupiah(totals.income)}, keluar ${rupiah(totals.expense)}, tabungan ${rupiah(totals.savings || 0)}.`,
      'Cek websitenya, datanya langsung muncul.',
    ].join('\n'))
    return { type: 'transaction', ok: true, phone, userId, amount: parsed.amount, category: parsed.category }
  }

  await reply(buildGuideText())
  return { type: 'guide', ok: true, phone }
}
