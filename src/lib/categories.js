export const EXPENSE_CATEGORIES = [
  { id: 'makanan', label: 'Makan & Minum', emoji: '🍜', color: '#F97316' },
  { id: 'transport', label: 'Transportasi', emoji: '🚌', color: '#3B82F6' },
  { id: 'belanja', label: 'Belanja', emoji: '🛍️', color: '#EC4899' },
  { id: 'rumah', label: 'Rumah', emoji: '🏠', color: '#14B8A6' },
  { id: 'tagihan', label: 'Tagihan', emoji: '🧾', color: '#8B5CF6' },
  { id: 'hiburan', label: 'Hiburan', emoji: '🎮', color: '#06B6D4' },
  { id: 'kesehatan', label: 'Kesehatan', emoji: '💊', color: '#EF4444' },
  { id: 'pendidikan', label: 'Pendidikan', emoji: '📚', color: '#6366F1' },
  { id: 'lainnya', label: 'Lainnya', emoji: '✨', color: '#94A3B8' },
]

export const INCOME_CATEGORIES = [
  { id: 'gaji', label: 'Gaji', emoji: '💼', color: '#10B981' },
  { id: 'usaha', label: 'Usaha', emoji: '🚀', color: '#059669' },
  { id: 'penerimaan', label: 'Penerimaan', emoji: '🎁', color: '#34D399' },
  { id: 'pendapatan_lain', label: 'Lainnya', emoji: '✨', color: '#6EE7B7' },
]

export const getCategories = (type) => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

export const getCategory = (type, id) => {
  const found = getCategories(type).find((c) => c.id === id)
  return found || { id: id || 'lainnya', label: 'Lainnya', emoji: '✨', color: '#94A3B8' }
}
