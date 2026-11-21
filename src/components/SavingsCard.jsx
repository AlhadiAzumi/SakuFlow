import { ArrowRight, PiggyBank, Trophy } from 'lucide-react'
import { formatRupiah } from '../lib/format'

export default function SavingsCard({ progress, onOpenSettings }) {
  if (progress.target <= 0) {
    return (
      <section className="savings-card savings-card--empty">
        <span className="savings-card__icon"><PiggyBank size={26} /></span>
        <div>
          <strong>Target tabungan belum dipasang</strong>
          <p>Tentukan target bulanan, dan sisa uangmu akan terlihat sebagai progres tabungan.</p>
        </div>
        <button type="button" className="link-button" onClick={onOpenSettings}>Pasang target <ArrowRight size={14} /></button>
      </section>
    )
  }

  return (
    <section className={`savings-card ${progress.reached ? 'savings-card--reached' : ''}`}>
      <div className="savings-card__top">
        <div>
          <h2 className="panel__title">Sisa uangmu jadi tabungan</h2>
        </div>
        <span className="savings-card__emoji">
          {progress.reached ? <Trophy size={28} /> : <PiggyBank size={28} />}
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
        <span>{progress.reached ? 'Target tercapai. Sisa uangmu aman.' : `${Math.round(progress.pct)}% tercapai bulan ini`}</span>
        <button type="button" className="link-button" onClick={onOpenSettings}>Ubah target</button>
      </div>
    </section>
  )
}
