import { useApp } from '../context/useApp'
import BudgetSettings from './BudgetSettings'
import WhatsAppLink from './WhatsAppLink'

export default function Settings() {
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
    <div className="settings-page">
      <section className="panel">
        <span className="eyebrow">AKUN & DATA</span>
        <h2 className="panel__title">Pengaturan</h2>

        <div className="settings-row">
          <div className="settings-row__icon">👤</div>
          <div className="settings-row__body">
            <strong>Akun</strong>
            <span>{mode === 'cloud' ? (user?.email || 'Akun terhubung') : 'Perangkat ini (tanpa login)'}</span>
          </div>
          <span className={`mode-badge mode-badge--${mode}`}>{mode === 'cloud' ? 'Cloud' : 'Lokal'}</span>
        </div>

        <div className="settings-row">
          <div className="settings-row__icon">📦</div>
          <div className="settings-row__body">
            <strong>Jumlah catatan</strong>
            <span>{transactions.length} transaksi tersimpan</span>
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="button button--outline" onClick={exportData}>
            ⬇ Unduh data (JSON)
          </button>
          {mode === 'cloud' ? (
            <button type="button" className="button button--ghost" onClick={handleSignOut}>Keluar akun</button>
          ) : (
            <button type="button" className="button button--danger-ghost" onClick={handleClear}>Hapus data lokal</button>
          )}
        </div>
      </section>

      <WhatsAppLink />

      <BudgetSettings />

      <section className="panel">
        <span className="eyebrow">CARA PAKAI</span>
        <h2 className="panel__title">Tiga langkah sederhana</h2>
        <ol className="howto">
          <li><span>1</span><div><strong>Catat sekali ketuk</strong><p>Pilih masuk/keluar, nominal, lalu kategori. Selesai dalam 10 detik.</p></div></li>
          <li><span>2</span><div><strong>Lihat peta uangmu</strong><p>Di beranda, ribbon warna-warni menunjukkan ke mana uangmu mengalir.</p></div></li>
          <li><span>3</span><div><strong>Baca insight mingguan</strong><p>Kami bandingkan pengeluaranmu supaya kamu tahu apakah lebih hemat atau boros.</p></div></li>
        </ol>
      </section>

      {mode === 'local' && (
        <section className="panel panel--tip">
          <span className="panel__tip-icon">☁️</span>
          <div>
            <strong>Mau data tersinkron di semua perangkat?</strong>
            <p>Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di file <code>.env</code>, lalu jalankan ulang aplikasi. Login dan sinkronisasi akan aktif otomatis.</p>
          </div>
        </section>
      )}

      <p className="settings-footer">Dibuat untuk membantu orang lebih sadar akan uangnya. 🌱</p>
    </div>
  )
}
