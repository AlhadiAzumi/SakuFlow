import { useMemo } from 'react'
import PixelIcon from './PixelIcon'
import CategoryIcon from './CategoryIcon'
import { formatRupiah, formatRupiahCompact } from '../lib/format'

const W = 900
const LEFT_X = 28
const LEFT_W = 172
const RIGHT_X = 686
const RIGHT_W = 14
const GAP = 12

function buildItems(income, expenseItems) {
  const items = expenseItems
    .filter((item) => item.amount > 0)
    .map((item) => ({ ...item }))
    .sort((a, b) => b.amount - a.amount)

  const totalExpense = items.reduce((sum, item) => sum + item.amount, 0)
  const leftover = income - totalExpense
  if (leftover > 0) {
    items.push({
      id: 'sisa',
      label: 'Sisa / Tabungan',
      icon: 'piggy',
      color: '#2563EB',
      amount: leftover,
      isLeftover: true,
    })
  }
  return items
}

function FlowCompact({ items, total, sourceLabel }) {
  return (
    <div className="flow-compact">
      <div className="flow-compact__source">
        <span className="flow-compact__source-dot" />
        <div>
          <span className="flow-compact__source-label">{sourceLabel}</span>
          <strong>{formatRupiah(total)}</strong>
        </div>
      </div>
      <div className="flow-compact__stream" aria-hidden="true" />
      <div className="flow-compact__items">
        {items.map((item) => (
          <div className="flow-compact__item" key={item.id}>
            <span className="flow-compact__emoji"><CategoryIcon category={item} size={14} /></span>
            <div className="flow-compact__body">
              <div className="flow-compact__row">
                <span>{item.label}</span>
                <strong>{formatRupiahCompact(item.amount)}</strong>
              </div>
              <div className="flow-compact__track">
                <div
                  className="flow-compact__fill"
                  style={{ width: `${Math.max(3, (item.amount / total) * 100)}%`, background: item.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MoneyFlow({ income, expenses, savingsTarget = 0 }) {
  const items = useMemo(() => buildItems(income, expenses), [income, expenses])
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const sourceLabel = income > 0 ? 'Uang masuk' : 'Uang keluar'

  if (!items.length || total <= 0) {
    return (
      <div className="flow-empty">
        <div className="flow-empty__icon"><PixelIcon name="compass" size={34} /></div>
        <h3>Belum ada alur uang</h3>
        <p>Catat pemasukan atau pengeluaran pertamamu, dan di sini akan muncul peta ke mana uangmu pergi.</p>
      </div>
    )
  }

  const height = Math.max(300, items.length * 68 + 110)
  const top = 62
  const bottom = height - 62
  const usable = bottom - top
  const totalGap = GAP * (items.length - 1)
  const scale = Math.max(0, (usable - totalGap) / total)
  const heights = items.map((item) => Math.max(20, item.amount * scale))
  const usedHeight = heights.reduce((sum, h) => sum + h, 0) + totalGap
  const startY = top + Math.max(0, (usable - usedHeight) / 2)
  const leftHeight = Math.max(48, usedHeight)
  const leftTop = startY + (usedHeight - leftHeight) / 2
  const mx = (LEFT_X + LEFT_W + RIGHT_X) / 2

  let rightCursor = startY
  let leftCursor = leftTop
  const nodes = items.map((item, index) => {
    const h = heights[index]
    const rightTop = rightCursor
    rightCursor += h + GAP
    const leftTopSegment = leftCursor
    const leftH = (item.amount / total) * leftHeight
    leftCursor += leftH
    return { ...item, h, rightTop, leftTopSegment, leftH }
  })

  return (
    <div className="flow-chart">
      <div className="flow-chart__heading">
        <div>
          <h2>Ke mana uangmu pergi?</h2>
        </div>
        <div className="flow-chart__total">
          <span>{sourceLabel} bulan ini</span>
          <strong>{formatRupiah(total)}</strong>
          {savingsTarget > 0 && income > 0 && (
            <small>Target tabungan: {formatRupiahCompact(savingsTarget)}</small>
          )}
        </div>
      </div>

      <div className="flow-chart__desktop">
        <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Diagram alur uang per kategori" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="sourceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>

          {nodes.map((node) => {
            const x1 = LEFT_X + LEFT_W
            const y1 = node.leftTopSegment
            const y2 = node.rightTop
            const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${RIGHT_X} ${y2} L ${RIGHT_X} ${y2 + node.h} C ${mx} ${y2 + node.h}, ${mx} ${y1 + node.leftH}, ${x1} ${y1 + node.leftH} Z`
            return (
              <path
                key={`link-${node.id}`}
                d={path}
                fill={node.color}
                fillOpacity="0.26"
                className="flow-ribbon"
              >
                <title>{`${node.label}: ${formatRupiah(node.amount)}`}</title>
              </path>
            )
          })}

          <rect
            x={LEFT_X}
            y={leftTop}
            width={LEFT_W}
            height={leftHeight}
            rx="16"
            fill="url(#sourceGradient)"
          />
          <text x={LEFT_X + LEFT_W / 2} y={leftTop + leftHeight / 2 - 8} textAnchor="middle" className="flow-svg__source-label">
            {sourceLabel}
          </text>
          <text x={LEFT_X + LEFT_W / 2} y={leftTop + leftHeight / 2 + 20} textAnchor="middle" className="flow-svg__source-value">
            {formatRupiahCompact(total)}
          </text>

          {nodes.map((node) => (
            <g key={`node-${node.id}`}>
              <rect
                x={RIGHT_X}
                y={node.rightTop}
                width={RIGHT_W}
                height={node.h}
                rx="7"
                fill={node.color}
              />
              <circle cx={RIGHT_X + RIGHT_W + 20} cy={node.rightTop + node.h / 2} r="13" fill={node.color} fillOpacity="0.14" />
              <foreignObject x={RIGHT_X + RIGHT_W + 8} y={node.rightTop + node.h / 2 - 12} width="24" height="24">
                <div className="flow-svg__icon" style={{ color: node.color }}><CategoryIcon category={node} size={14} /></div>
              </foreignObject>
              <text x={RIGHT_X + RIGHT_W + 44} y={node.rightTop + node.h / 2 - 2} className="flow-svg__label">
                {node.label}
              </text>
              <text x={RIGHT_X + RIGHT_W + 44} y={node.rightTop + node.h / 2 + 17} className="flow-svg__value">
                {formatRupiah(node.amount)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flow-chart__mobile">
        <FlowCompact items={items} total={total} sourceLabel={sourceLabel} />
      </div>
    </div>
  )
}
