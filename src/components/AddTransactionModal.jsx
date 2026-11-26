import { useEffect, useState } from 'react'
import CategoryIcon from './CategoryIcon'
import PixelIcon from './PixelIcon'
import { getCategories } from '../lib/categories'
import { formatNumber, parseAmount, todayKey } from '../lib/format'

const emptyForm = () => ({
  type: 'expense',
  amount: '',
  category: 'makanan',
  date: todayKey(),
  note: '',
})

export default function AddTransactionModal({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(initial?.id)

  useEffect(() => {
    if (!open) return
    setForm(initial
      ? {
          type: initial.category === 'tabungan' && initial.type === 'expense'
            ? 'savings'
            : initial.type || 'expense',
          amount: String(initial.amount || ''),
          category: initial.category || 'lainnya',
          date: initial.date || todayKey(),
          note: initial.note || '',
        }
      : emptyForm())
    setError('')
    setSaving(false)
  }, [open, initial])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const categories = getCategories(form.type)

  const setType = (type) => {
    setForm((prev) => ({
      ...prev,
      type,
      category: getCategories(type)[0].id,
    }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const amount = parseAmount(form.amount)
    if (amount <= 0) {
      setError('Masukkan nominal lebih dari nol.')
      return
    }
    if (!form.date) {
      setError('Pilih tanggal dulu, ya.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const record = form.type === 'savings'
        ? { ...form, amount, type: 'expense', category: 'tabungan' }
        : { ...form, amount }
      await onSave(record)
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan catatan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__header">
          <div>
            <h2 id="modal-title">{isEdit ? 'Ubah catatan' : 'Uangmu kemana?'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><PixelIcon name="close" size={14} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="segmented">
            <button type="button" className={form.type === 'expense' ? 'is-active is-active--out' : ''} onClick={() => setType('expense')}>
              <PixelIcon name="arrow-up-right" size={15} /> Uang keluar
            </button>
            <button type="button" className={form.type === 'income' ? 'is-active is-active--in' : ''} onClick={() => setType('income')}>
              <PixelIcon name="arrow-down-left" size={15} /> Uang masuk
            </button>
            <button type="button" className={form.type === 'savings' ? 'is-active is-active--savings' : ''} onClick={() => setType('savings')}>
              <PixelIcon name="piggy" size={15} /> Tabungan
            </button>
          </div>

          <label className="field">
            <span className="field__label">Nominal</span>
            <div className="amount-input">
              <span>Rp</span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={form.amount ? formatNumber(parseAmount(form.amount)) : ''}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="0"
                aria-label="Nominal dalam rupiah"
              />
            </div>
          </label>

          <div className="field">
            <span className="field__label">Kategori</span>
            <div className="category-grid">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={`category-chip ${form.category === category.id ? 'is-active' : ''}`}
                  style={form.category === category.id ? { borderColor: category.color, background: `${category.color}14` } : undefined}
                  onClick={() => setForm((prev) => ({ ...prev, category: category.id }))}
                >
                  <span className="category-chip__icon"><CategoryIcon category={category} size={15} /></span>
                  <small>{category.label}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field__label">Tanggal</span>
              <input
                type="date"
                value={form.date}
                max={todayKey()}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field__label">Catatan <em>(opsional)</em></span>
              <input
                type="text"
                value={form.note}
                maxLength={80}
                placeholder={form.type === 'savings' ? 'Mis. dana liburan' : 'Mis. kopi sama teman'}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </label>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="modal__actions">
            <button type="button" className="button button--ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Menyimpan…' : isEdit ? 'Simpan ubahan' : 'Simpan catatan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
