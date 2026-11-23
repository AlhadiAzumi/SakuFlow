import PixelIcon from './PixelIcon'
import { formatRupiah } from '../lib/format'

export default function SummaryCards({ income, expense, balance }) {
  const cards = [
    {
      label: 'Uang masuk',
      value: income,
      icon: 'arrow-down-left',
      tone: 'in',
      caption: 'Pemasukan bulan ini',
    },
    {
      label: 'Uang keluar',
      value: expense,
      icon: 'arrow-up-right',
      tone: 'out',
      caption: 'Pengeluaran bulan ini',
    },
    {
      label: balance >= 0 ? 'Sisa uang' : 'Defisit',
      value: Math.abs(balance),
      icon: balance >= 0 ? 'wallet' : 'alert',
      tone: balance >= 0 ? 'balance' : 'danger',
      caption: balance >= 0 ? 'Masih tersisa' : 'Pengeluaran melebihi pemasukan',
    },
  ]

  return (
    <div className="summary-grid">
      {cards.map((card) => (
        <article className={`summary-card summary-card--${card.tone}`} key={card.label}>
          <div className="summary-card__top">
            <span className="summary-card__label">{card.label}</span>
            <span className="summary-card__icon"><PixelIcon name={card.icon} size={16} /></span>
          </div>
          <strong className="summary-card__value">{formatRupiah(card.value)}</strong>
          <span className="summary-card__caption">{card.caption}</span>
        </article>
      ))}
    </div>
  )
}
