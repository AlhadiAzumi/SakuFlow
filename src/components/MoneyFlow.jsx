import { useMemo } from 'react'
import PixelIcon from './PixelIcon'
import CategoryIcon from './CategoryIcon'
import { formatRupiah } from '../lib/format'

const SEGMENTS = 12

function buildItems(income, expenseItems, savings = 0) {
  const items = expenseItems
    .filter((item) => item.amount > 0)
    .map((item) => ({ ...item }))

  if (savings > 0) {
    items.push({
      id: 'tabungan',
      label: 'Tabungan',
      icon: 'piggy',
      color: '#2563EB',
      amount: savings,
      isSavings: true,
    })
  }

  const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0)
  const leftover = income - totalExpense - savings
  if (leftover > 0) {
    items.push({
      id: 'sisa',
      label: 'Sisa uang',
      icon: 'wallet',
      color: '#38BDF8',
      amount: leftover,
      isLeftover: true,
    })
  }
  return items.sort((a, b) => b.amount - a.amount)
}

export default function MoneyFlow({ income, expenses, savings = 0, savingsTarget = 0 }) {
  const items = useMemo(() => buildItems(income, expenses, savings), [income, expenses, savings])
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const hasLeftover = items.some((item) => item.isLeftover)
  const allocated = expenses.reduce((sum, item) => sum + item.amount, 0) + savings
  const sourceLabel = income > 0 && income >= allocated
    ? 'Uang masuk bulan ini'
    : 'Total uang teralokasi bulan ini'

  if (!items.length || total <= 0) {
    return (
      <div className="flow-empty">
        <div className="flow-empty__icon"><PixelIcon name="compass" size={34} /></div>
        <h3>Belum ada alur uang</h3>
        <p>Catat pemasukan atau pengeluaran pertamamu, dan di sini akan muncul peta ke mana uangmu pergi.</p>
      </div>
    )
  }

  return (
    <div className="flow-chart flow-board">
      <div className="flow-chart__heading">
        <div>
          <span className="pixel-eyebrow">PETA ALAH UANG / BULAN INI</span>
          <h2>Ke mana uangmu pergi?</h2>
        </div>
        <div className="flow-chart__total">
          <span>{sourceLabel}</span>
          <strong>{formatRupiah(total)}</strong>
          {savingsTarget > 0 && income > 0 && (
            <small>Target tabungan: {formatRupiah(savingsTarget)}</small>
          )}
        </div>
      </div>

      <p className="flow-chart__legend">
        <PixelIcon name="info" size={13} />
        Baca dari atas ke bawah: uang masuk dibagi ke pengeluaran, tabungan, dan sisa. Makin banyak kotak terisi, makin besar porsinya.
      </p>

      <div className="flow-board__map">
        <div className="flow-source">
          <span className="pixel-eyebrow">SUMBER</span>
          <strong>{formatRupiah(total)}</strong>
          <small>{sourceLabel}</small>
        </div>
        <div className="flow-bridge" aria-hidden="true">
          <span className="flow-bridge__line" />
          <PixelIcon name="arrow-right" size={18} />
          <span className="flow-bridge__text">DIBAGI KE {items.length} POS</span>
        </div>
      </div>

      <ol className="flow-board__list">
        {items.map((item, index) => {
          const pct = Math.round((item.amount / total) * 100)
          const filled = Math.max(1, Math.min(SEGMENTS, Math.round((item.amount / total) * SEGMENTS)))
          return (
            <li
              className="flow-dest"
              key={item.id}
              style={{ '--seg-color': item.color }}
              title={`${item.label}: ${formatRupiah(item.amount)} (${pct}% dari total)`}
            >
              <span className="flow-dest__rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="flow-dest__icon"><CategoryIcon category={item} size={18} /></span>
              <div className="flow-dest__main">
                <div className="flow-dest__top">
                  <strong>{item.label}</strong>
                  {index === 0 && <span className="flow-dest__badge">TERBESAR</span>}
                  <span className="flow-dest__pct">{pct}% dari total</span>
                </div>
                <div className="flow-dest__segments" aria-hidden="true">
                  {Array.from({ length: SEGMENTS }, (_, segment) => (
                    <span
                      key={segment}
                      className={`flow-segment${segment < filled ? ' is-filled' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flow-dest__amount">
                <strong>{formatRupiah(item.amount)}</strong>
                <small>{item.isLeftover ? 'tersisa' : item.isSavings ? 'ditabung' : 'terpakai'}</small>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="flow-board__foot">
        <PixelIcon name="check" size={13} />
        {income > 0 && hasLeftover
          ? 'Total semua pos di atas sama dengan uang masuk bulan ini. Sisa yang belum dipakai tetap tercatat.'
          : savings > 0
            ? 'Tabungan ikut masuk peta ini, tetapi tidak dihitung sebagai pengeluaran.'
            : 'Total semua pos di atas sama dengan total pengeluaran bulan ini. Belum ada tabungan yang tercatat.'}
      </p>
    </div>
  )
}
