import PixelIcon from './PixelIcon'

export default function InsightCard({ insight }) {
  return (
    <article className="insight-card">
      <div className="insight-card__badge"><PixelIcon name="sparkles" size={12} /> Insight minggu ini</div>
      <p className="insight-card__headline">{insight.headline}</p>
      <p className="insight-card__detail">{insight.detail}</p>
      <div className="insight-card__stats">
        <div>
          <span>7 hari terakhir</span>
          <strong>Rp{new Intl.NumberFormat('id-ID').format(insight.thisWeek)}</strong>
        </div>
        <div>
          <span>7 hari sebelumnya</span>
          <strong>Rp{new Intl.NumberFormat('id-ID').format(insight.lastWeek)}</strong>
        </div>
      </div>
    </article>
  )
}
