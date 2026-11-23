import LogoMark from './LogoMark'
import PixelIcon from './PixelIcon'
import { DASHBOARD_TABS } from '../lib/navigation'
import { currentMonthKey, formatMonthLabel, formatTimeAgo, shiftMonth } from '../lib/format'

export default function DashboardSidebar({
  open,
  tab,
  onTab,
  month,
  onMonth,
  mode,
  displayName,
  email,
  lastSyncedTx,
  syncTick,
  onOpenAdd,
  onHome,
  onClose,
}) {
  return (
    <>
      <aside
        id="dashboard-sidebar"
        className={`dash-sidebar${open ? ' is-open' : ''}`}
        aria-label="Panel navigasi dashboard"
      >
        <button type="button" className="dash-sidebar__brand" onClick={onHome}>
          <span className="dash-sidebar__brand-mark"><LogoMark className="h-full w-full rounded-[8px]" /></span>
          <span>
            <strong>SakuFlow</strong>
            <small>CATATAN UANG HARIAN</small>
          </span>
        </button>

        <nav className="dash-sidebar__nav" aria-label="Navigasi utama dashboard">
          <p className="dash-sidebar__label">MENU UTAMA</p>
          <ul>
            {DASHBOARD_TABS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`dash-sidebar__link${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => onTab(item.id)}
                  aria-current={tab === item.id ? 'page' : undefined}
                >
                  <PixelIcon name={item.icon} size={18} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="dash-sidebar__label dash-sidebar__label--gap">PERIODE CATATAN</p>
          <div className="dash-sidebar__month">
            <button type="button" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya">
              <PixelIcon name="chevron-left" size={16} />
            </button>
            <span>{formatMonthLabel(month)}</span>
            <button
              type="button"
              onClick={() => onMonth(shiftMonth(month, 1))}
              disabled={month >= currentMonthKey()}
              aria-label="Bulan berikutnya"
            >
              <PixelIcon name="chevron-right" size={16} />
            </button>
          </div>

          <button type="button" className="dash-sidebar__add" onClick={onOpenAdd}>
            <PixelIcon name="plus" size={15} />
            Catat uang baru
          </button>
        </nav>

        <div className="dash-sidebar__account">
          <div className="dash-sidebar__identity">
            <span className="dash-sidebar__avatar">
              {mode === 'cloud' ? displayName.charAt(0).toUpperCase() : <PixelIcon name="house" size={15} />}
            </span>
            <div>
              <strong>{displayName}</strong>
              <span>{mode === 'cloud' ? email : 'Perangkat ini'}</span>
            </div>
          </div>

          <div className="dash-sidebar__status">
            <span className="dash-sidebar__mode">{mode === 'cloud' ? 'ONLINE · LIVE' : 'MODE LOKAL'}</span>
            {lastSyncedTx && (
              <span className="dash-sidebar__sync" title={lastSyncedTx.note || 'Transaksi terakhir tersinkron'}>
                <i />
                Sinkron {formatTimeAgo(lastSyncedTx.receivedAt, syncTick)}
              </span>
            )}
          </div>

          <button type="button" className="dash-sidebar__home" onClick={onHome}>
            Lihat beranda <PixelIcon name="arrow-up-right" size={13} />
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="dash-backdrop"
        aria-label="Tutup menu navigasi"
        onClick={onClose}
      />
    </>
  )
}
