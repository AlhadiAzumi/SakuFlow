import { useEffect, useState } from 'react'
import { isSavingsTx } from '../lib/categories'
import { formatRupiah, formatTimeAgo } from '../lib/format'

const VISIBLE_MS = 6000
const EXIT_MS = 300

export default function SyncToast({ tx, tick = Date.now(), onClose }) {
  const [phase, setPhase] = useState('idle')

  useEffect(() => {
    if (!tx?.id) {
      setPhase('idle')
      return undefined
    }
    setPhase('enter')
    const leaveTimer = setTimeout(() => setPhase('exit'), VISIBLE_MS)
    const doneTimer = setTimeout(() => {
      setPhase('idle')
      onClose?.()
    }, VISIBLE_MS + EXIT_MS)
    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(doneTimer)
    }
  }, [tx?.id, onClose])

  if (!tx || phase === 'idle') return null

  const close = () => {
    setPhase('exit')
    setTimeout(() => {
      setPhase('idle')
      onClose?.()
    }, EXIT_MS)
  }

  const label = isSavingsTx(tx) ? 'Tabungan' : tx.type === 'income' ? 'Masuk' : 'Keluar'

  return (
    <div
      className={`sync-toast fixed bottom-5 right-5 z-50 inline-flex max-w-[calc(100vw-40px)] items-center gap-2.5 rounded-full border border-slate-800 bg-slate-950 px-4 py-2.5 text-white shadow-lg ${phase === 'exit' ? 'is-leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative grid h-2 w-2 flex-none place-items-center" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-cyan-300 opacity-60" />
        <span className="relative h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
      </span>
      <span className="truncate text-[11.5px] font-bold tabular-nums">
        Sinkron terakhir: {formatTimeAgo(tx.receivedAt, tick)} • {label} {formatRupiah(tx.amount)}
      </span>
      <button type="button" className="sync-toast__close" aria-label="Tutup notifikasi" onClick={close}>
        ×
      </button>
    </div>
  )
}
