import { formatRupiah } from '../lib/format'

export default function CategoryBreakdown({ categories }) {
  if (!categories.length) {
    return (
      <div className="panel-empty">
        <span>📊</span>
        <p>Belum ada pengeluaran bulan ini.</p>
      </div>
    )
  }

  return (
    <div className="breakdown-list">
      {categories.map((category, index) => (
        <div className="breakdown-item" key={category.id}>
          <span className="breakdown-item__rank">{index + 1}</span>
          <span className="breakdown-item__emoji">{category.emoji}</span>
          <div className="breakdown-item__main">
            <div className="breakdown-item__row">
              <span className="breakdown-item__label">{category.label}</span>
              <strong>{formatRupiah(category.amount)}</strong>
            </div>
            <div className="breakdown-item__track">
              <div
                className="breakdown-item__fill"
                style={{ width: `${Math.max(2, category.pct)}%`, background: category.color }}
              />
            </div>
          </div>
          <span className="breakdown-item__pct">{Math.round(category.pct)}%</span>
        </div>
      ))}
    </div>
  )
}
