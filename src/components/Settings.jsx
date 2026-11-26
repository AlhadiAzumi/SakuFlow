import PixelIcon from './PixelIcon'
import BudgetSettings from './BudgetSettings'
import DataSettings from './DataSettings'
import ProfilePanel from './ProfilePanel'
import WhatsAppLink from './WhatsAppLink'

const PAGES = [
  { id: 'profil', label: 'Profil', hint: 'Nama dan foto.', icon: 'user' },
  { id: 'budget', label: 'Budget & Tabungan', hint: 'Batas dan target.', icon: 'target' },
  { id: 'whatsapp', label: 'WhatsApp', hint: 'Nomor dan perintah bot.', icon: 'whatsapp' },
  { id: 'data', label: 'Data & Akun', hint: 'Data, akun, panduan.', icon: 'package' },
]

const PAGE_COPY = {
  profil: { title: 'Profil', desc: 'Nama dan foto di dashboard.' },
  budget: { title: 'Budget & Tabungan', desc: 'Atur target dan batas kategori.' },
  whatsapp: { title: 'WhatsApp', desc: 'Hubungkan nomor dan lihat perintah bot.' },
  data: { title: 'Data & Akun', desc: 'Data, akun, dan panduan.' },
}

export default function Settings({ page = 'hub', onPage }) {
  const go = (next) => onPage?.(next)

  if (!PAGE_COPY[page]) {
    return (
      <div className="settings-page">
        <div className="page-heading settings-heading">
          <div>
            <h1>Setelan <span className="text-gradient">Sakunode</span></h1>
            <p>Pilih bagian yang mau diatur.</p>
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
