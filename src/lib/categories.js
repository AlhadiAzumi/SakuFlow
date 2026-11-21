export const EXPENSE_CATEGORIES = [
  { id: 'makanan', label: 'Makan & Minum', icon: 'utensils', color: '#F97316' },
  { id: 'transport', label: 'Transportasi', icon: 'bus', color: '#3B82F6' },
  { id: 'belanja', label: 'Belanja', icon: 'shopping', color: '#EC4899' },
  { id: 'rumah', label: 'Rumah', icon: 'house', color: '#14B8A6' },
  { id: 'tagihan', label: 'Tagihan', icon: 'receipt', color: '#8B5CF6' },
  { id: 'hiburan', label: 'Hiburan', icon: 'game', color: '#06B6D4' },
  { id: 'kesehatan', label: 'Kesehatan', icon: 'health', color: '#EF4444' },
  { id: 'pendidikan', label: 'Pendidikan', icon: 'education', color: '#6366F1' },
  { id: 'lainnya', label: 'Lainnya', icon: 'other', color: '#94A3B8' },
]

export const INCOME_CATEGORIES = [
  { id: 'gaji', label: 'Gaji', icon: 'salary', color: '#10B981' },
  { id: 'usaha', label: 'Usaha', icon: 'business', color: '#059669' },
  { id: 'penerimaan', label: 'Penerimaan', icon: 'gift', color: '#34D399' },
  { id: 'pendapatan_lain', label: 'Lainnya', icon: 'other', color: '#6EE7B7' },
]

export const getCategories = (type) => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

export const getCategory = (type, id) => {
  const found = getCategories(type).find((c) => c.id === id)
  return found || { id: id || 'lainnya', label: 'Lainnya', icon: 'other', color: '#94A3B8' }
}
