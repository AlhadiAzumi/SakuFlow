import PixelIcon from './PixelIcon'

export const BOT_COMMANDS = [
  { command: 'masuk uang 500 ribu', meaning: 'Catat pemasukan Rp500.000.' },
  { command: 'keluar 25rb kopi', meaning: 'Catat Rp25.000, kategori Makan & Minum.' },
  { command: 'beli bensin 50 ribu kemarin', meaning: 'Catat pengeluaran dengan tanggal kemarin.' },
  { command: 'gaji 3,5 juta hari ini', meaning: 'Catat gaji tanggal hari ini.' },
  { command: 'nabung 15 ribu', meaning: 'Catat Rp15.000 sebagai tabungan.' },
  { command: 'kasi 65 ribu ke tabungan', meaning: 'Catat Rp65.000 sebagai tabungan.' },
  { command: 'ringkasan / rekap', meaning: 'Lihat total masuk, keluar, tabungan, dan sisa bulan ini.' },
  { command: 'riwayat', meaning: 'Lihat 5 catatan terakhir kamu.' },
  { command: 'status', meaning: 'Cek apakah nomor WhatsApp sudah terhubung.' },
  { command: 'hapus / clear / batal', meaning: 'Hapus 1 catatan terakhir.' },
  { command: 'hapus semua / clear all', meaning: 'Hapus seluruh catatan. Tidak bisa dibatalkan.' },
  { command: 'bantuan / menu', meaning: 'Tampilkan daftar perintah dari bot.' },
]

export default function BotCommands({ compact = false }) {
  return (
    <div className={`bot-commands${compact ? ' bot-commands--compact' : ''}`}>
      <p className="bot-commands__note">
        <PixelIcon name="info" size={16} />
        <span>
          <strong>Bot Sakunode itu satu arah.</strong> Bot membaca pesan dan perintahmu, tetapi{' '}
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
    </div>
  )
}
