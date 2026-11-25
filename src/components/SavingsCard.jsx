import PixelIcon from './PixelIcon'
import { formatRupiah } from '../lib/format'

export default function SavingsCard({ progress, onOpenSettings }) {
  if (progress.target <= 0) {
    return (
      <section className="savings-card savings-card--empty">
        <span className="savings-card__icon"><PixelIcon name="piggy" size={26} /></span>
        <div>
          <strong>Target tabungan belum dipasang</strong>
          <p>Tentukan target bulanan, lalu catat tabungan lewat bot WhatsApp atau tombol Catat uang.</p>
        </div>
        <button type="button" className="link-button" onClick={onOpenSettings}>Pasang target <PixelIcon name="arrow-right" size={14} /></button>
      </section>
    )
  }

  return (
    <section className={`savings-card ${progress.reached ? 'savings-card--reached' : ''}`}>
      <div className="savings-card__top">
        <div>
          <h2 className="panel__title">Tabunganmu bulan ini</h2>
        </div>
        <span className="savings-card__emoji">
          {progress.reached ? <PixelIcon name="trophy" size={28} /> : <PixelIcon name="piggy" size={28} />}
        </span>
      </div>
      <div className="savings-card__figures">
        <strong>{formatRupiah(progress.saved)}</strong>
        <span>dari target {formatRupiah(progress.target)}</span>
      </div>
      <div className="savings-card__track">
        <div className="savings-card__fill" style={{ width: `${progress.pct}%` }} />
      </div>
      <div className="savings-card__footer">
        <span>
          {progress.reached
            ? 'Target tercapai. Pertahankan kebiasaanmu.'
            : progress.saved > 0
              ? `${Math.round(progress.pct)}% dari target tercapai bulan ini`
              : 'Belum ada tabungan tercatat bulan ini'}
        </span>
        <button type="button" className="link-button" onClick={onOpenSettings}>Ubah target</button>
      </div>
    </section>
  )
}
