import { useMemo, useState } from 'react'
import CategoryIcon from './CategoryIcon'
import PixelIcon from './PixelIcon'
import { getCategory, isSavingsTx } from '../lib/categories'
import { formatDayHeading, formatRupiah } from '../lib/format'

export default function TransactionList({ items, onEdit, onDelete, compact = false }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((tx) => {
      if (typeFilter === 'savings' && !isSavingsTx(tx)) return false
      if (typeFilter !== 'all' && typeFilter !== 'savings' && tx.type !== typeFilter) return false
      if (!needle) return true
      const category = getCategory(tx.type, tx.category)
      return `${category.label} ${tx.note || ''}`.toLowerCase().includes(needle)
    })
  }, [items, query, typeFilter])

  const grouped = useMemo(() => {
    const groups = new Map()
    filtered.forEach((tx) => {
      const key = tx.date || ''
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(tx)
    })
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const requestDelete = (tx) => {
    const category = getCategory(tx.type, tx.category)
    if (window.confirm(`Hapus catatan "${category.label}" sebesar ${formatRupiah(tx.amount)}?`)) {
      onDelete(tx.id)
    }
  }

  return (
    <div className="transaction-list">
      {!compact && (
        <div className="transaction-list__tools">
          <label className="search-field">
            <span aria-hidden="true"><PixelIcon name="search" size={16} /></span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kategori atau catatan…"
              aria-label="Cari catatan"
            />
          </label>
          <div className="segmented segmented--small">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'expense', label: 'Keluar' },
              { id: 'income', label: 'Masuk' },
              { id: 'savings', label: 'Tabungan' },
            ].map((option) => (
              <button
                type="button"
                key={option.id}
                className={typeFilter === option.id ? 'is-active' : ''}
                onClick={() => setTypeFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!grouped.length ? (
        <div className="panel-empty">
          <span><PixelIcon name="receipt" size={30} /></span>
          <p>{items.length ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan bulan ini.'}</p>
        </div>
      ) : (
        grouped.map(([date, entries]) => (
          <section className="transaction-group" key={date}>
            <h3 className="transaction-group__date">{formatDayHeading(date)}</h3>
            <div className="transaction-group__items">
              {entries.map((tx) => {
                const category = getCategory(tx.type, tx.category)
                return (
                  <article className="transaction-row" key={tx.id}>
                    <span
                      className="transaction-row__emoji"
                      style={{ background: `${category.color}1F`, color: category.color }}
                    >
                      <CategoryIcon category={category} size={17} />
                    </span>
                    <button
                      type="button"
                      className="transaction-row__main"
                      onClick={() => onEdit?.(tx)}
                      title="Ketuk untuk mengubah"
                    >
                      <strong>{category.label}</strong>
                      <span>
                        {tx.source === 'whatsapp' && (
                          <PixelIcon name="whatsapp" size={12} title="WhatsApp" className="transaction-row__source" />
                        )}{' '}
                        {tx.note || (isSavingsTx(tx) ? 'Uang ditabung' : tx.type === 'income' ? 'Uang masuk' : 'Pengeluaran')}
                      </span>
                    </button>
                    <span className={`transaction-row__amount transaction-row__amount--${isSavingsTx(tx) ? 'savings' : tx.type}`}>
                      {isSavingsTx(tx) ? '→' : tx.type === 'income' ? '+' : '−'}{formatRupiah(tx.amount)}
                    </span>
                    <button
                      type="button"
                      className="transaction-row__delete"
                      onClick={() => requestDelete(tx)}
                      aria-label={`Hapus catatan ${category.label}`}
                      title="Hapus"
                    >
                      <PixelIcon name="close" size={12} />
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
