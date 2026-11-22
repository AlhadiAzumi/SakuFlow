import { getCategory } from '../../src/lib/categories.js'
import { HELP_TEXT, normalizePhone, parseMessage } from './parser.js'
import * as store from './store.js'
import { sendText } from './whatsapp.js'

const rupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Math.round(value || 0))}`
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

async function buildGuideText(phone) {
  let linked = false
  try {
    linked = Boolean(await store.getLinkedUser(phone))
  } catch (error) {
    console.error('[Bot] Gagal mengecek status koneksi nomor:', error)
  }

  const status = linked
    ? 'Status nomor: sudah terhubung dengan akun SakuFlow.'
    : 'Status nomor: belum terhubung. Buka website SakuFlow → Setelan → Hubungkan WhatsApp, lalu balas kode OTP 6 digit dari menu tersebut di sini.'

  return [
    'Bot SakuFlow aktif.',
    status,
    '',
    'Format catatan:',
    '• keluar 25rb kopi',
    '• masuk uang 500 ribu',
    '• ringkasan',
    '',
    'Ketik "bantuan" untuk panduan lengkap.',
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

  if (await store.hasPendingOtp(phone)) {
    if (/^\d{4,8}$/.test(text)) {
      const userId = await store.verifyOtp(phone, text)
      await reply(userId
        ? 'Nomor WhatsApp kamu berhasil dihubungkan. Sekarang kamu bisa langsung chat catatan uang di sini.'
        : 'Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru lewat website, ya.')
      return { type: 'otp', ok: Boolean(userId), verified: Boolean(userId), phone, userId: userId || null }
    }
  }

  // Sapaan / menu / teks uji (mis. "halo", "ck") bukan transaksi, tapi tetap
  // dibalas supaya user tahu bot aktif dan tahu status koneksi nomornya.
  if (/^(halo|hi|hai|menu|permisi|p|ck)$/i.test(text)) {
    await reply(await buildGuideText(phone))
    return { type: 'guide', ok: true, phone }
  }

  const parsed = parseMessage(text)

  if (parsed.intent === 'help') {
    await reply(HELP_TEXT)
    return { type: 'help', ok: true, phone }
  }

  if (parsed.intent === 'status') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung. Buka website → Setelan → Hubungkan WhatsApp, lalu balas kode OTP 6 digit.')
      return { type: 'status', ok: false, phone, reason: 'not_linked' }
    }
    let count = 0
    try {
      count = await store.countTransactions(userId)
    } catch (error) {
      console.error('[Bot] Gagal menghitung transaksi untuk status:', error)
    }
    await reply([
      'Status: nomor WhatsApp kamu sudah terhubung dengan akun SakuFlow.',
      `Total catatan tersimpan: ${count}.`,
      'Ketik "ringkasan" untuk rekap bulan ini atau "riwayat" untuk 5 catatan terakhir.',
    ].join('\n'))
    return { type: 'status', ok: true, phone, userId, count }
  }

  if (parsed.intent === 'history') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung. Buka website → Setelan → Hubungkan WhatsApp dulu, ya.')
      return { type: 'history', ok: false, phone, reason: 'not_linked' }
    }
    const items = await store.listRecentTransactions(userId, 5)
    if (!items.length) {
      await reply('Belum ada catatan tersimpan. Kirim misalnya "keluar 25rb kopi" untuk mulai mencatat.')
    } else {
      await reply([
        `${items.length} catatan terakhir:`,
        ...items.map((item) => {
          const category = getCategory(item.type, item.category)
          const note = item.note ? ` • ${String(item.note).slice(0, 40)}` : ''
          return `• ${item.date} • ${category.label} • ${rupiah(item.amount)}${note}`
        }),
        '',
        'Ketik "ringkasan" untuk total bulan ini.',
      ].join('\n'))
    }
    return { type: 'history', ok: true, phone, userId, count: items.length }
  }

  if (parsed.intent === 'clear') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung, jadi tidak ada riwayat yang bisa dihapus. Hubungkan WhatsApp lewat Setelan dulu, ya.')
      return { type: 'clear', ok: false, phone, reason: 'not_linked' }
    }
    const deleted = await store.deleteAllTransactions(userId)
    await reply([
      `Semua riwayat transaksi kamu sudah dihapus (${deleted} catatan).`,
      'Data di website ikut terhapus. Koneksi WhatsApp dan pengaturan tetap aman.',
      'Ketik "riwayat" untuk memastikan.',
    ].join('\n'))
    return { type: 'clear', ok: true, phone, userId, deleted }
  }

  if (parsed.intent === 'summary') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung. Buka website → Setelan → Hubungkan WhatsApp dulu, ya.')
      return { type: 'summary', ok: false, phone, reason: 'not_linked' }
    }
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const totals = await store.getMonthTotals(userId, monthKey)
    await reply([
      `Rekap ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
      `Uang masuk: ${rupiah(totals.income)}`,
      `Uang keluar: ${rupiah(totals.expense)}`,
      `Sisa: ${rupiah(totals.income - totals.expense)}`,
      `${totals.count} transaksi tercatat.`,
    ].join('\n'))
    return { type: 'summary', ok: true, phone, userId, totals }
  }

  if (parsed.intent === 'transaction') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung ke akun. Buka website → Setelan → Hubungkan WhatsApp, lalu balas kode OTP yang kami kirim.')
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
    // dikabari "gagal menyimpan" — kirim konfirmasi dengan rekap kosong.
    let totals = { income: 0, expense: 0, count: 0 }
    try {
      totals = await store.getMonthTotals(userId, parsed.date.slice(0, 7))
    } catch (error) {
      console.error('[Bot] Gagal mengambil rekap setelah transaksi tersimpan:', error)
    }
    await reply([
      `${parsed.type === 'income' ? 'Uang masuk' : 'Uang keluar'} tersimpan.`,
      `${rupiah(parsed.amount)} • ${category.label}`,
      `Total bulan ini — masuk ${rupiah(totals.income)}, keluar ${rupiah(totals.expense)}.`,
      'Cek websitenya, datanya langsung muncul.',
    ].join('\n'))
    return { type: 'transaction', ok: true, phone, userId, amount: parsed.amount, category: parsed.category }
  }

  await reply(await buildGuideText(phone))
  return { type: 'guide', ok: true, phone }
}
