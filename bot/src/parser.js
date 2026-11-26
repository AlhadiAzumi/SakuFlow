const CATEGORY_KEYWORDS = [
  { type: 'income', id: 'gaji', words: ['gaji', 'upah', 'honor', 'paid'] },
  { type: 'income', id: 'usaha', words: ['jualan', 'usaha', 'bisnis', 'omzet', 'klien', 'freelance', 'proyek'] },
  { type: 'income', id: 'penerimaan', words: ['hadiah', 'bonus', 'transfer', 'penerimaan', 'reimburse', 'kado'] },
  { type: 'expense', id: 'makanan', words: ['makan', 'minum', 'kopi', 'sarapan', 'jajan', 'snack', 'warung', 'resto', 'restaurant', 'catering', 'lunch', 'dinner', 'makan siang', 'makan malam'] },
  { type: 'expense', id: 'transport', words: ['ojek', 'grab', 'gojek', 'taksi', 'bensin', 'transport', 'parkir', 'tol', 'bus', 'kereta', 'naik', 'pergi'] },
  { type: 'expense', id: 'belanja', words: ['belanja', 'beli', 'baju', 'pakaian', 'sepatu', 'elektronik', 'grocery', 'kebutuhan dapur', 'aksesoris'] },
  { type: 'expense', id: 'rumah', words: ['sewa', 'kontrakan', 'kos', 'rumah', 'perabot', 'furniture'] },
  { type: 'expense', id: 'tagihan', words: ['tagihan', 'listrik', 'air', 'internet', 'wifi', 'pulsa', 'bpjs', 'asuransi', 'cicilan', 'langganan'] },
  { type: 'expense', id: 'hiburan', words: ['nonton', 'bioskop', 'game', 'hiburan', 'konser', 'netflix', 'spotify', 'youtube'] },
  { type: 'expense', id: 'kesehatan', words: ['obat', 'dokter', 'klinik', 'rumah sakit', 'kesehatan', 'vitamin', 'periksa'] },
  { type: 'expense', id: 'pendidikan', words: ['buku', 'kursus', 'sekolah', 'kuliah', 'les', 'biaya sekolah', 'seminar'] },
]

const AMOUNT_PATTERNS = [
  { regex: /(\d+(?:[.,]\d+)?)\s*(juta|jt)\b/i, multiplier: 1_000_000 },
  { regex: /(\d+(?:[.,]\d+)?)\s*(ribu|rb)\b/i, multiplier: 1_000 },
  { regex: /(\d+(?:[.,]\d+)?)\s*k\b/i, multiplier: 1_000 },
  { regex: /rp\.?\s*([\d.,]+)/i, multiplier: 1 },
  { regex: /\b([\d][\d.,]*)\b/, multiplier: 1 },
]

const toNumber = (raw) => {
  const normalized = String(raw).replace(/\./g, '').replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  if (digits.startsWith('8') && digits.length <= 12) digits = `62${digits}`
  return digits
}

export function extractAmount(text) {
  const value = String(text || '')
  for (const pattern of AMOUNT_PATTERNS) {
    const match = value.match(pattern.regex)
    if (!match) continue
    const base = toNumber(match[1])
    if (base === null) continue
    const amount = Math.round(base * pattern.multiplier)
    if (amount > 0) return amount
  }
  return null
}

export function detectType(text) {
  const lower = String(text || '').toLowerCase()
  if (/\b(masuk|pemasukan|income|terima|diterima|dapat|gaji|jualan|usaha|bonus|penerimaan|refund)\b/.test(lower)) return 'income'
  if (/\b(keluar|pengeluaran|expense|beli|bayar|belanja|jajan|makan|minum|kopi|ojek|tagihan|sewa|nonton|obat)\b/.test(lower)) return 'expense'
  return 'expense'
}

export function detectCategory(text, type) {
  const lower = String(text || '').toLowerCase()
  const match = CATEGORY_KEYWORDS.find((item) => item.type === type && item.words.some((word) => lower.includes(word)))
  return match ? match.id : type === 'income' ? 'pendapatan_lain' : 'lainnya'
}

export function detectSavings(text) {
  const lower = String(text || '').toLowerCase()
  if (/\b(nabung|nabungkan|menabung|tabung|tabungan|setor|setoran|simpan|menyimpan|sisihkan)\b/.test(lower)) return true
  return /\b(kasi|kasih|masukin|masukkan|transfer)\b.*\btabungan\b/.test(lower)
}

const pad = (n) => String(n).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function detectDate(text, now = new Date()) {
  const lower = String(text || '').toLowerCase()

  const iso = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (iso) return iso[1]

  if (/\bkemarin\b/.test(lower)) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return dateKey(d)
  }
  if (/\bhari ini\b|\btoday\b/.test(lower)) return dateKey(now)

  const explicit = lower.match(/\btanggal\s+(\d{1,2})\b/)
  if (explicit) {
    const day = Math.min(31, Math.max(1, Number(explicit[1])))
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(day)}`
  }
  return dateKey(now)
}

export function parseMessage(text, now = new Date()) {
  const raw = String(text || '').trim()
  const lower = raw.toLowerCase()

  if (!raw) return { intent: 'unknown' }
  // Perintah yang hanya menampilkan info sengaja tidak dikenali: bot satu arah,
  // jadi tidak ada gunanya meminta balasan untuk status, riwayat, rekap, atau menu.
  if (/^(bantuan|help|panduan|panduan bot|perintah|daftar perintah|\?|halo|hi|hai|menu|status|status koneksi|cek status|koneksi|cek koneksi|riwayat|lihat riwayat|terakhir|5 terakhir|catatan terakhir|transaksi terakhir|history|ringkasan|ringkasan bulan ini|rekap|rekap bulan ini|summary|total bulan ini)$/.test(lower)) return { intent: 'unknown' }
  if (/^(hapus semua|hapus semua catatan|hapus semua laporan|hapus semua transaksi|hapus semua riwayat|hapus semua data|clear all|clear semua|reset|reset semua)$/.test(lower)) return { intent: 'deleteAll' }
  if (/^(hapus|hapus catatan|hapus transaksi terakhir|hapus terakhir|hapus 1|hapus satu|batal|batalkan|undo|clear)$/.test(lower)) return { intent: 'deleteLast' }

  if (detectSavings(lower)) {
    const amount = extractAmount(lower)
    if (amount !== null) {
      return {
        intent: 'savings',
        amount,
        category: 'tabungan',
        date: detectDate(lower, now),
        note: raw.slice(0, 80),
      }
    }
  }

  const amount = extractAmount(lower)
  if (amount === null) return { intent: 'unknown' }

  const type = detectType(lower)
  return {
    intent: 'transaction',
    type,
    amount,
    category: detectCategory(lower, type),
    date: detectDate(lower, now),
    note: raw.slice(0, 80),
  }
}

