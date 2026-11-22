const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export const formatNumber = (value) => numberFormatter.format(Math.round(Number(value) || 0))

export const formatRupiah = (value) => `Rp${formatNumber(value)}`

export const formatRupiahCompact = (value) => {
  const n = Math.round(Number(value) || 0)
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace('.', ',')} jt`
  if (n >= 1_000) return `Rp${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1).replace('.', ',')} rb`
  return formatRupiah(n)
}

export const parseAmount = (value) => Number(String(value).replace(/[^\d]/g, '')) || 0

export const toDateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayKey = () => toDateKey(new Date())

export const monthKeyFromDate = (dateKey) => String(dateKey || '').slice(0, 7)

export const currentMonthKey = () => toDateKey(new Date()).slice(0, 7)

export const shiftMonth = (monthKeyValue, delta) => {
  const [y, m] = monthKeyValue.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const formatMonthLabel = (monthKeyValue) => {
  const [y, m] = monthKeyValue.split('-').map(Number)
  return `${MONTH_NAMES[m - 1] || ''} ${y}`
}

export const formatShortMonthLabel = (monthKeyValue) => {
  const [y, m] = monthKeyValue.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]?.slice(0, 3) || ''} ${String(y).slice(-2)}`
}

export const formatDateLabel = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return `${d} ${MONTH_NAMES[m - 1] || ''} ${y}`
}

export const formatDayHeading = (dateKey) => {
  if (dateKey === todayKey()) return 'Hari ini'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateKey === toDateKey(yesterday)) return 'Kemarin'
  return formatDateLabel(dateKey)
}

// Dipakai indikator "Sinkron terakhir" di Beranda.
export const formatTimeAgo = (value, now = Date.now()) => {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return 'baru saja'
  const diff = Math.max(0, now - time)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}
