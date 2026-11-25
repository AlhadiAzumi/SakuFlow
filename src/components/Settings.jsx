import PixelIcon from './PixelIcon'
import BudgetSettings from './BudgetSettings'
import DataSettings from './DataSettings'
import ProfilePanel from './ProfilePanel'
import WhatsAppLink from './WhatsAppLink'

const PAGES = [
  { id: 'profil', label: 'Profil', hint: 'Nama tampilan dan foto profil kamu.', icon: 'user' },
  { id: 'budget', label: 'Budget & Tabungan', hint: 'Atur batas pengeluaran dan target tabungan.', icon: 'target' },
  { id: 'whatsapp', label: 'WhatsApp', hint: 'Hubungkan nomor dan lihat perintah bot.', icon: 'whatsapp' },
  { id: 'data', label: 'Data & Akun', hint: 'Unduh data, keluar akun, dan panduan aplikasi.', icon: 'package' },
]

const PAGE_COPY = {
  profil: { title: 'Profil', desc: 'Ubah nama dan foto yang tampil di dashboard Sakunode.' },
  budget: { title: 'Budget & Tabungan', desc: 'Pasang target tabungan dan batas tiap kategori pengeluaran.' },
  whatsapp: { title: 'WhatsApp', desc: 'Hubungkan nomor kamu dan lihat daftar perintah bot di bawah.' },
  data: { title: 'Data & Akun', desc: 'Kelola data, akun, panduan, dan arti ikon di aplikasi.' },
}

export default function Settings({ page = 'hub', onPage }) {
  const go = (next) => onPage?.(next)

  if (!PAGE_COPY[page]) {
    return (
      <div className="settings-page">
        <div className="page-heading settings-heading">
          <div>
            <h1>Setelan <span className="text-gradient">Sakunode</span></h1>
            <p>Pilih bagian yang mau diatur. Sekarang lebih singkat dan tidak bertumpuk.</p>
          </div>
        </div>

        <div className="settings-hub">
          {PAGES.map((item) => (
            <button
              type="button"
              className="settings-hub__card"
              key={item.id}
              onClick={() => go(item.id)}
            >
              <span className="settings-hub__icon"><PixelIcon name={item.icon} size={19} /></span>
              <span className="settings-hub__body">
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </span>
              <span className="settings-hub__arrow"><PixelIcon name="chevron-right" size={15} /></span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const copy = PAGE_COPY[page]

  return (
    <div className="settings-page settings-subpage">
      <button type="button" className="settings-back" onClick={() => go('hub')}>
        <PixelIcon name="arrow-left" size={15} /> Kembali ke setelan
      </button>

      <div className="page-heading settings-heading">
        <div>
          <span className="pixel-eyebrow">SETELAN / {copy.title.toUpperCase()}</span>
          <h1>{copy.title}</h1>
          <p>{copy.desc}</p>
        </div>
      </div>

      {page === 'profil' && <ProfilePanel />}
      {page === 'budget' && <BudgetSettings />}
      {page === 'whatsapp' && <WhatsAppLink />}
      {page === 'data' && <DataSettings />}
    </div>
  )
}
