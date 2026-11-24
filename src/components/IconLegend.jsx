import CategoryIcon from './CategoryIcon'
import PixelIcon from './PixelIcon'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/categories'

const HINTS = {
  makanan: 'Kopi, sarapan, jajan',
  transport: 'Ojol, bensin, parkir',
  belanja: 'Baju, sepatu, elektronik',
  rumah: 'Sewa, kos, perabot',
  tagihan: 'Listrik, internet, pulsa',
  hiburan: 'Nonton, game, langganan',
  kesehatan: 'Obat, dokter, vitamin',
  pendidikan: 'Buku, kursus, sekolah',
  lainnya: 'Belum masuk kategori lain',
  gaji: 'Upah, honor, gaji bulanan',
  usaha: 'Jualan, klien, proyek',
  penerimaan: 'Bonus, hadiah, transfer',
  pendapatan_lain: 'Pemasukan di luar gaji',
}

function LegendGroup({ title, note, items }) {
  return (
    <div className="icon-legend__group">
      <div className="icon-legend__group-head">
        <strong>{title}</strong>
        <span>{note}</span>
      </div>
      <div className="icon-legend__grid">
        {items.map((item) => (
          <div className="icon-legend__item" key={item.id} title={HINTS[item.id]}>
            <span className="icon-legend__icon"><CategoryIcon category={item} size={16} /></span>
            <span className="min-w-0">
              <strong>{item.label}</strong>
              <small>{HINTS[item.id]}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function IconLegend() {
  return (
    <section className="panel icon-legend">
      <div className="panel__header-row">
        <div>
          <h2 className="panel__title">Arti ikon di Sakunode</h2>
          <p className="icon-legend__desc">
            Ikon dipakai supaya catatan lebih cepat dikenali. Arahkan kursor ke ikon di dashboard untuk melihat namanya.
          </p>
        </div>
        <span className="pixel-eyebrow">LEGENDA</span>
      </div>

      <div className="icon-legend__body">
        <LegendGroup title="Uang keluar" note="Ke mana uangmu pergi" items={EXPENSE_CATEGORIES} />
        <LegendGroup title="Uang masuk" note="Dari mana uangmu datang" items={INCOME_CATEGORIES} />
      </div>

      <div className="icon-legend__nav">
        <span><PixelIcon name="house" size={14} /> Beranda</span>
        <span><PixelIcon name="receipt" size={14} /> Catatan</span>
        <span><PixelIcon name="settings" size={14} /> Setelan</span>
        <span><PixelIcon name="whatsapp" size={14} /> Bot WhatsApp</span>
      </div>
    </section>
  )
}
