import PixelIcon from './PixelIcon'
import IconLegend from './IconLegend'
import { useApp } from '../context/useApp'

export default function DataSettings() {
  const { mode, user, transactions, exportData, clearLocalData, signOut, showToast } = useApp()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      showToast(err?.message || 'Gagal keluar.', 'error')
    }
  }

  const handleClear = () => {
    if (window.confirm('Hapus semua catatan di perangkat ini? Tindakan ini tidak bisa dibatalkan.')) {
      clearLocalData()
    }
  }

  return (
    <>
      <section className="panel">
        <h2 className="panel__title">Akun &amp; data</h2>

        <div className="settings-row">
          <div className="settings-row__icon"><PixelIcon name="user" size={18} /></div>
          <div className="settings-row__body">
            <strong>Akun</strong>
            <span>{mode === 'cloud' ? (user?.email || 'Akun terhubung') : 'Perangkat ini (tanpa login)'}</span>
          </div>
          <span className={`mode-badge mode-badge--${mode}`}>{mode === 'cloud' ? 'Cloud' : 'Lokal'}</span>
        </div>

        <div className="settings-row">
          <div className="settings-row__icon"><PixelIcon name="package" size={18} /></div>
          <div className="settings-row__body">
            <strong>Jumlah catatan</strong>
            <span>{transactions.length} transaksi tersimpan</span>
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="button button--outline" onClick={exportData}>
            <PixelIcon name="download" size={16} /> Unduh data (Excel)
          </button>
          {mode === 'cloud' ? (
            <button type="button" className="button button--ghost" onClick={handleSignOut}>
              <PixelIcon name="logout" size={16} /> Keluar akun
            </button>
          ) : (
            <button type="button" className="button button--danger-ghost" onClick={handleClear}>
              <PixelIcon name="trash" size={16} /> Hapus data lokal
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">Cara pakai Sakunode</h2>
        <ol className="howto">
          <li><span>1</span><div><strong>Catat sekali ketuk</strong><p>Pilih jenis, isi nominal. Selesai.</p></div></li>
          <li><span>2</span><div><strong>Lihat peta uangmu</strong><p>Arah uangmu tampil di beranda.</p></div></li>
          <li><span>3</span><div><strong>Baca insight</strong><p>Bandingkan pengeluaran tiap bulan.</p></div></li>
        </ol>
      </section>

      {mode === 'local' && (
        <section className="panel panel--tip">
          <span className="panel__tip-icon"><PixelIcon name="cloud" size={22} /></span>
          <div>
            <strong>Sinkron di semua perangkat?</strong>
            <p>Isi kunci Supabase di <code>.env</code>, lalu jalankan ulang aplikasi.</p>
          </div>
        </section>
      )}

      <IconLegend />
    </>
  )
}
