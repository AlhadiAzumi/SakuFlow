import { useState } from 'react'
import PixelIcon from './PixelIcon'

export const BOT_COMMANDS = [
  { command: 'masuk uang 500 ribu', meaning: 'Catat pemasukan Rp500.000.' },
  { command: 'keluar 25rb kopi', meaning: 'Catat Rp25.000, kategori Makan & Minum.' },
  { command: 'beli bensin 50 ribu kemarin', meaning: 'Catat pengeluaran dengan tanggal kemarin.' },
  { command: 'gaji 3,5 juta hari ini', meaning: 'Catat gaji tanggal hari ini.' },
  { command: 'nabung 15 ribu', meaning: 'Catat Rp15.000 sebagai tabungan.' },
  { command: 'kasi 65 ribu ke tabungan', meaning: 'Catat Rp65.000 sebagai tabungan.' },
  { command: 'hapus / clear / batal', meaning: 'Hapus 1 catatan terakhir.' },
  { command: 'hapus semua / clear all', meaning: 'Hapus seluruh catatan. Tidak bisa dibatalkan.' },
]

export default function BotCommands({ compact = false }) {
  const [demoOtp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString())

  return (
    <div className={`bot-commands${compact ? ' bot-commands--compact' : ''}`}>
      <p className="bot-commands__note">
        <PixelIcon name="info" size={16} />
        <span>
          <strong>Bot Sakunode itu satu arah.</strong> Bot hanya membaca dan menyimpan catatan,{' '}
          <strong>tidak membalas chat WhatsApp</strong>. Semua hasil langsung muncul di dashboard website.
        </span>
      </p>

      <div className="bot-commands__list">
        {BOT_COMMANDS.map(({ command, meaning }) => (
          <div className="bot-commands__row" key={command}>
            <code>{command}</code>
            <span>{meaning}</span>
          </div>
        ))}
      </div>

      <p className="bot-commands__foot">
        Nominal bisa ditulis <code>25rb</code>, <code>50 ribu</code>, <code>3,5 juta</code>, atau <code>Rp125.000</code>.
        Tanggal bisa pakai <code>kemarin</code>, <code>hari ini</code>, <code>tanggal 12</code>, atau <code>2026-11-24</code>.
      </p>
      <p className="bot-commands__foot">
        Contoh verifikasi WhatsApp: <code>/verif {demoOtp}</code>. Kode contoh dibuat acak setiap halaman dimuat.
      </p>
    </div>
  )
}
