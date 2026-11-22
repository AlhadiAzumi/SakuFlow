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
    return
  }

  if (await store.hasPendingOtp(phone)) {
    if (/^\d{4,8}$/.test(text)) {
      const userId = await store.verifyOtp(phone, text)
      await reply(userId
        ? 'Nomor WhatsApp kamu berhasil dihubungkan. Sekarang kamu bisa langsung chat catatan uang di sini.'
        : 'Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru lewat website, ya.')
      return
    }
  }

  // Sapaan / menu / teks uji (mis. "halo", "ck") bukan transaksi, tapi tetap
  // dibalas supaya user tahu bot aktif dan tahu status koneksi nomornya.
  if (/^(halo|hi|hai|menu|permisi|p|ck)$/i.test(text)) {
    await reply(await buildGuideText(phone))
    return
  }

  const parsed = parseMessage(text)

  if (parsed.intent === 'help') {
    await reply(HELP_TEXT)
    return
  }

  if (parsed.intent === 'summary') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung. Buka website → Setelan → Hubungkan WhatsApp dulu, ya.')
      return
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
    return
  }

  if (parsed.intent === 'transaction') {
    const userId = await store.getLinkedUser(phone)
    if (!userId) {
      await reply('Nomor ini belum terhubung ke akun. Buka website → Setelan → Hubungkan WhatsApp, lalu balas kode OTP yang kami kirim.')
      return
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
    return
  }

  await reply(await buildGuideText(phone))
}
