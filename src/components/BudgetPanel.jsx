import { formatRupiah, formatRupiahCompact } from '../lib/format'

const STATUS_LABEL = { over: 'Lewat', warning: 'Mepet', safe: 'Aman' }

export default function BudgetPanel({ budgets, onOpenSettings }) {
  if (!budgets.length) {
    return (
      <section className="panel budget-intro">
        <div className="budget-intro__icon">🎯</div>
        <div>
          <strong>Belum ada budget bulanan</strong>
          <p>Pasang batas per kategori supaya kamu dapat peringatan sebelum uang terpakai habis.</p>
        </div>
        <button type="button" className="link-button" onClick={onOpenSettings}>Atur budget →</button>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel__header-row">
        <div>
          <span className="eyebrow">BATAS BULANAN</span>
          <h2 className="panel__title">Pantau budgetmu</h2>
        </div>
        <button type="button" className="link-button" onClick={onOpenSettings}>Atur budget →</button>
      </div>
      <div className="budget-list">
        {budgets.map((item) => (
          <div className="budget-item" key={item.id}>
            <span className="budget-item__emoji">{item.emoji}</span>
            <div className="budget-item__main">
              <div className="budget-item__row">
                <span className="budget-item__label">{item.label}</span>
                <span className="budget-item__numbers">
                  <strong>{formatRupiahCompact(item.used)}</strong>
                  <span> / {formatRupiahCompact(item.limit)}</span>
                </span>
              </div>
              <div className="budget-item__track">
                <div
                  className={`budget-item__fill budget-item__fill--${item.status}`}
                  style={{ width: `${Math.min(100, Math.max(2, item.pct))}%` }}
                />
              </div>
            </div>
            <span className={`budget-item__status budget-item__status--${item.status}`}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>
        ))}
      </div>
      <p className="budget-list__footnote">
        {budgets.some((item) => item.status !== 'safe')
          ? `⚠️ ${formatRupiah(budgets.filter((item) => item.status === 'over').reduce((sum, item) => sum + Math.abs(item.remaining), 0))} terlahap dari budget yang sudah terlampaui.`
          : 'Semua kategori masih dalam batas. Pertahankan! 🌱'}
      </p>
    </section>
  )
}
