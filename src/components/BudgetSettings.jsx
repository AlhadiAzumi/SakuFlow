import { useEffect, useState } from 'react'
import CategoryIcon from './CategoryIcon'
import { useApp } from '../context/useApp'
import { EXPENSE_CATEGORIES } from '../lib/categories'
import { formatNumber, parseAmount } from '../lib/format'

export default function BudgetSettings() {
  const { settings, updateSettings, showToast } = useApp()
  const [target, setTarget] = useState('')
  const [budgets, setBudgets] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTarget(settings.savingsTarget ? String(settings.savingsTarget) : '')
    setBudgets({ ...(settings.budgets || {}) })
  }, [settings])

  const setBudget = (id, value) => {
    setBudgets((prev) => ({ ...prev, [id]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({ savingsTarget: parseAmount(target), budgets })
      showToast('Budget dan target tabungan disimpan.')
    } catch (error) {
      showToast(error?.message || 'Gagal menyimpan pengaturan.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">Budget &amp; target tabungan</h2>

      <label className="field savings-target-field">
        <span className="field__label">Target tabungan per bulan</span>
        <div className="amount-input amount-input--small">
          <span>Rp</span>
          <input
            type="text"
            inputMode="numeric"
            value={target ? formatNumber(parseAmount(target)) : ''}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="Misal 1000000"
          />
        </div>
        <small>Sisa pemasukan setelah pengeluaran dihitung sebagai tabungan.</small>
      </label>

      <div className="field">
        <span className="field__label">Batas pengeluaran per kategori</span>
        <div className="budget-settings-grid">
          {EXPENSE_CATEGORIES.map((category) => (
            <label className="budget-setting" key={category.id}>
              <span className="budget-setting__label"><span className="budget-setting__icon" style={{ color: category.color }}><CategoryIcon category={category} size={14} /></span>{category.label}</span>
              <span className="budget-setting__input">
                <small>Rp</small>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budgets[category.id] ? formatNumber(parseAmount(budgets[category.id])) : ''}
                  onChange={(event) => setBudget(category.id, event.target.value)}
                  placeholder="0"
                />
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="settings-actions">
        <button type="button" className="button button--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan rencana'}
        </button>
        <span className="budget-settings__hint">Kosongkan angka untuk menghapus batas.</span>
      </div>
    </section>
  )
}
