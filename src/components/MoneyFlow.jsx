import { useMemo } from 'react'
import PixelIcon from './PixelIcon'
import CategoryIcon from './CategoryIcon'
import { formatRupiah, formatRupiahCompact } from '../lib/format'

const W = 900
const LEFT_X = 24
const LEFT_W = 168
const RIGHT_X = 690
const RIGHT_W = 16
const GAP = 14

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
  const midX = (LEFT_X + LEFT_W + RIGHT_X) / 2

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
          <span className="pixel-eyebrow">PETA ALAH UANG / BULAN INI</span>
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

      <p className="flow-chart__legend">
        <PixelIcon name="waypoints" size={13} />
        Pita makin lebar = nominal makin besar. Kotak kiri sumber uang, kotak kanan tujuannya.
      </p>

      <div className="flow-chart__desktop">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          role="img"
          aria-label="Peta alur uang per kategori berbentuk pita kotak"
          preserveAspectRatio="xMidYMid meet"
          shapeRendering="crispEdges"
        >
          <defs>
            <pattern id="flowGrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 H 0 V 16" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={W} height={height} fill="url(#flowGrid)" opacity="0.5" />

          {nodes.map((node) => {
            const x1 = LEFT_X + LEFT_W
            const band = Math.max(4, Math.min(10, node.leftH * 0.65))
            const y1 = node.leftTopSegment + node.leftH / 2 - band / 2
            const y2 = node.rightTop + node.h / 2 - band / 2
            const path = `M ${x1} ${y1} H ${midX} V ${y2} H ${RIGHT_X} V ${y2 + band} H ${midX} V ${y1 + band} H ${x1} Z`
            return (
              <g key={`link-${node.id}`}>
                <path d={path} fill={node.color} fillOpacity="0.26" className="flow-ribbon">
                  <title>{`${node.label}: ${formatRupiah(node.amount)}`}</title>
                </path>
                {[0.2, 0.45, 0.7].map((ratio) => (
                  <rect
                    key={`tick-a-${ratio}-${node.id}`}
                    x={x1 + (midX - x1) * ratio}
                    y={y1 + band / 2 - 2}
                    width="4"
                    height="4"
                    fill="#ffffff"
                    fillOpacity="0.5"
                  />
                ))}
                {[0.35, 0.65].map((ratio) => (
                  <rect
                    key={`tick-b-${ratio}-${node.id}`}
                    x={midX + (RIGHT_X - midX) * ratio}
                    y={y2 + band / 2 - 2}
                    width="4"
                    height="4"
                    fill="#ffffff"
                    fillOpacity="0.5"
                  />
                ))}
              </g>
            )
          })}

          <rect x={LEFT_X + 6} y={leftTop + 6} width={LEFT_W} height={leftHeight} fill="#0F172A" opacity="0.16" />
          <rect x={LEFT_X} y={leftTop} width={LEFT_W} height={leftHeight} fill="#2563EB" />
          <rect x={LEFT_X + 5} y={leftTop + 5} width={LEFT_W - 10} height={leftHeight - 10} fill="none" stroke="#38BDF8" strokeWidth="2" />
          <text x={LEFT_X + LEFT_W / 2} y={leftTop + leftHeight / 2 - 8} textAnchor="middle" className="flow-svg__source-label">
            SUMBER UANG
          </text>
          <text x={LEFT_X + LEFT_W / 2} y={leftTop + leftHeight / 2 + 18} textAnchor="middle" className="flow-svg__source-value">
            {formatRupiahCompact(total)}
          </text>

          {nodes.map((node) => (
            <g key={`node-${node.id}`}>
              <rect x={RIGHT_X + 5} y={node.rightTop + 5} width={RIGHT_W} height={node.h} fill="#0F172A" opacity="0.16" />
              <rect x={RIGHT_X} y={node.rightTop} width={RIGHT_W} height={node.h} fill={node.color} />
              <rect
                x={RIGHT_X + RIGHT_W + 10}
                y={node.rightTop + node.h / 2 - 14}
                width="28"
                height="28"
                fill="#ffffff"
                stroke={node.color}
                strokeWidth="2"
              />
              <foreignObject
                x={RIGHT_X + RIGHT_W + 16}
                y={node.rightTop + node.h / 2 - 8}
                width="16"
                height="16"
              >
                <div className="flow-svg__icon" style={{ color: node.color }}><CategoryIcon category={node} size={16} /></div>
              </foreignObject>
              <text x={RIGHT_X + RIGHT_W + 46} y={node.rightTop + node.h / 2 - 2} className="flow-svg__label">
                {node.label}
              </text>
              <text x={RIGHT_X + RIGHT_W + 46} y={node.rightTop + node.h / 2 + 17} className="flow-svg__value">
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
