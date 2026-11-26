import { useState } from 'react'
import PixelIcon from './PixelIcon'

export const BOT_COMMANDS = [
  { command: 'masuk uang 500 ribu', meaning: 'Pemasukan Rp500.000.' },
  { command: 'keluar 25rb kopi', meaning: 'Rp25.000, Makan & Minum.' },
  { command: 'beli bensin 50 ribu kemarin', meaning: 'Tanggal kemarin.' },
  { command: 'gaji 3,5 juta hari ini', meaning: 'Gaji hari ini.' },
  { command: 'nabung 15 ribu', meaning: 'Tabungan Rp15.000.' },
  { command: 'kasi 65 ribu ke tabungan', meaning: 'Tabungan Rp65.000.' },
  { command: 'hapus / clear / batal', meaning: 'Hapus catatan terakhir.' },
  { command: 'hapus semua / clear all', meaning: 'Hapus semua catatan.' },
]

export default function BotCommands({ compact = false }) {
  const [demoOtp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString())

  return (
    <div className={`bot-commands${compact ? ' bot-commands--compact' : ''}`}>
      <p className="bot-commands__note">
        <PixelIcon name="info" size={16} />
        <span>
          <strong>Bot Sakunode satu arah.</strong> Catatan masuk ke dashboard, tanpa balasan WhatsApp.
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
        Nominal: <code>25rb</code>, <code>3,5 juta</code>. Tanggal: <code>kemarin</code>, <code>tanggal 12</code>. Verifikasi: <code>/verif {demoOtp}</code>.
      </p>
    </div>
  )
}
