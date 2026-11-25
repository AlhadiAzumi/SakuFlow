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

export const SAVINGS_CATEGORY = { id: 'tabungan', label: 'Tabungan', icon: 'piggy', color: '#2563EB' }
export const SAVINGS_CATEGORIES = [SAVINGS_CATEGORY]

// Tabungan sengaja disimpan sebagai category 'tabungan' di tabel transactions
// yang sama. Dengan begitu tidak perlu mengubah constraint tipe di Supabase.
export const isSavingsTx = (tx) => String(tx?.category || '') === SAVINGS_CATEGORY.id

export const getCategories = (type) => {
  if (type === 'income') return INCOME_CATEGORIES
  if (type === 'savings') return SAVINGS_CATEGORIES
  return EXPENSE_CATEGORIES
}

export const getCategory = (type, id) => {
  if (isSavingsTx({ category: id })) return SAVINGS_CATEGORY
  const found = getCategories(type).find((c) => c.id === id)
  return found || { id: id || 'lainnya', label: 'Lainnya', icon: 'other', color: '#94A3B8' }
}
