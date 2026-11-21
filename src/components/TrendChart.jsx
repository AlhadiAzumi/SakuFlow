import { formatMonthLabel, formatRupiahCompact, formatShortMonthLabel } from '../lib/format'

export default function TrendChart({ trend }) {
  const max = Math.max(1, ...trend.flatMap((item) => [item.income, item.expense]))

  return (
    <div className="trend">
      <div className="trend__legend">
        <span><i className="trend__dot trend__dot--in" />Uang masuk</span>
        <span><i className="trend__dot trend__dot--out" />Uang keluar</span>
      </div>
      <div className="trend__chart">
        {trend.map((item) => (
          <div className="trend__group" key={item.key} title={`${formatMonthLabel(item.key)}: masuk ${formatRupiahCompact(item.income)}, keluar ${formatRupiahCompact(item.expense)}`}>
            <div className="trend__bars">
              <div className="trend__bar trend__bar--in" style={{ height: `${Math.max(2, (item.income / max) * 100)}%` }} />
              <div className="trend__bar trend__bar--out" style={{ height: `${Math.max(2, (item.expense / max) * 100)}%` }} />
            </div>
            <span className="trend__label">{formatShortMonthLabel(item.key)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
