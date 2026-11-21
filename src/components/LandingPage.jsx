import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowUpRightFromSquare,
  BadgeCheck,
  Bus,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleCheck,
  Cloud,
  Coffee,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Utensils,
  Waypoints,
  Zap,
} from 'lucide-react'
import LogoMark from './LogoMark'

const NAV = [
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Bot WhatsApp', href: '#bot-whatsapp' },
  { label: 'Alur Dana', href: '#alur-dana' },
]

const FEATURE_BADGES = [
  { label: 'Bot WhatsApp Otomatis', icon: MessageCircle },
  { label: 'Diagram Alur Sankey', icon: Waypoints },
  { label: 'Sinkronisasi Cloud Supabase', icon: Cloud },
  { label: 'Mode Lokal & Online', icon: ShieldCheck },
  { label: 'Ringkasan Real-Time', icon: Zap },
]

const PERSONAS = [
  {
    tab: 'Mahasiswa & Anak Kost',
    title: 'Uang jajan terkontrol',
    desc: 'Catat pengeluaran harian tanpa perlu buka spreadsheet. Cukup chat, lalu lihat sisa uang bulan ini.',
    points: ['Budget makan & kopi', 'Pengingat budget hampir habis', 'Ringkasan lewat WhatsApp'],
    stat: 'Rp1.250.000',
    statLabel: 'Rata-rata hemat per bulan',
  },
  {
    tab: 'Freelancer',
    title: 'Arus kas klien lebih jelas',
    desc: 'Pemasukan dari berbagai proyek masuk otomatis ke satu tempat, lengkap dengan kategori dan tanggal.',
    points: ['Pisahkan gaji & proyek', 'Lacak pembayaran masuk', 'Ekspor data ke JSON'],
    stat: 'Rp8.450.000',
    statLabel: 'Saldo yang tercatat rapi',
  },
  {
    tab: 'Pekerja Harian',
    title: 'Gaji habis? Tahu sebabnya',
    desc: 'Kenali kategori pengeluaran terbesar hanya dengan melihat diagram alur dana yang mudah dibaca.',
    points: ['Diagram alur uang', 'Kategori pengeluaran', 'Target tabungan'],
    stat: '12 detik',
    statLabel: 'Rata-rata waktu mencatat',
  },
]

function Brand() {
  return (
    <a href="#top" className="flex items-center gap-2.5 no-underline">
      <LogoMark className="h-9 w-9 rounded-xl shadow-[0_8px_18px_rgba(37,99,235,0.28)]" />
      <span className="text-[15px] font-extrabold tracking-tight text-slate-900">
        SakuFlow
      </span>
    </a>
  )
}

function DarkPill({ children, onClick, href, className = '' }) {
  const classes = `group inline-flex items-center gap-2.5 rounded-full bg-slate-900 px-5 py-3 text-[13px] font-bold text-white shadow-[0_12px_26px_rgba(15,23,42,0.22)] transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_32px_rgba(15,23,42,0.28)] ${className}`
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 transition duration-300 ease-out group-hover:rotate-45">
          <ArrowUpRight size={13} />
        </span>
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 transition duration-300 ease-out group-hover:rotate-45">
        <ArrowUpRight size={13} />
      </span>
    </button>
  )
}

function SectionHeading({ title, accent, desc, id }) {
  return (
    <div id={id} className="mx-auto max-w-2xl scroll-mt-28 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[38px] sm:leading-[1.15]">
        {title} <span className="text-gradient">{accent}</span>
      </h2>
      {desc && <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-[15px]">{desc}</p>}
    </div>
  )
}

export default function LandingPage({ onEnter, isLoggedIn = false }) {
  const [persona, setPersona] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)

  const navLabel = isLoggedIn ? 'Dashboard' : 'Masuk'
  const primaryLabel = isLoggedIn ? 'Buka Dashboard' : 'Mulai Catat Gratis'

  return (
    <div id="top" className="min-h-screen bg-white text-slate-900">
      {/* ---------- 1. Floating glass navbar ---------- */}
      <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_12px_40px_rgba(37,99,235,0.08)] backdrop-blur-xl sm:px-6">
          <Brand />
          <div className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DarkPill onClick={onEnter} className="hidden sm:inline-flex">{navLabel}</DarkPill>
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden"
            >
              <span className="text-lg leading-none">{menuOpen ? '×' : '≡'}</span>
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-xl lg:hidden">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </a>
            ))}
            <button type="button" onClick={onEnter} className="mt-2 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white">
              {isLoggedIn ? 'Buka Dashboard' : 'Masuk ke SakuFlow'}
            </button>
          </div>
        )}
      </header>

      {/* ---------- 2. Hero ---------- */}
      <section className="px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="hero-shell mx-auto max-w-7xl px-5 pb-28 pt-14 sm:px-10 sm:pt-20">
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h1 className="text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl lg:text-[64px]">
              Catat Keuangan Harian
              <br className="hidden sm:block" /> Lebih Cepat dengan{' '}
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles size={24} className="text-sky-200 drop-shadow-[0_0_10px_rgba(125,211,252,0.9)] sm:text-4xl" />
                <span>SakuFlow</span>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
              Catat uang masuk dan keluar cukup lewat chat. Lihat ke mana uangmu pergi lewat diagram alur yang enak dibaca — tanpa ribet, tanpa spreadsheet.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onEnter}
                className="group inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-white/20 px-6 py-3.5 text-[13px] font-bold text-white shadow-lg backdrop-blur-md transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/30"
              >
                {primaryLabel}
                <ArrowRight size={15} className="transition duration-300 ease-out group-hover:translate-x-1" />
              </button>
              <DarkPill href="#cara-kerja">Lihat Cara Kerja</DarkPill>
            </div>
          </div>

          {/* 3 kartu pratinjau UI */}
          <div className="relative z-10 mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-3 md:gap-5">
            {/* Kiri: simulasi chat WA */}
            <article className="float-a rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white">
                  <MessageCircle size={17} />
                </span>
                <div>
                  <p className="text-[13px] font-extrabold leading-tight">Bot WhatsApp</p>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online sekarang
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-blue-600 px-3.5 py-2.5 text-[11.5px] font-medium text-white">
                  keluar 25rb buat kopi
                </div>
                <div className="ml-auto max-w-[92%] rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-600">
                  <p className="font-bold text-slate-900">Uang keluar tersimpan</p>
                  <p className="mt-0.5 font-semibold tabular-nums">Rp25.000 • Makan &amp; Minum</p>
                  <p className="mt-1 text-[10px] text-slate-400">Cek websitenya, datanya langsung muncul.</p>
                </div>
              </div>
            </article>

            {/* Tengah: kartu utama */}
            <article className="float-b relative rounded-3xl border border-white/70 bg-white/95 p-5 shadow-[0_30px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl md:-mt-4 md:scale-[1.03]">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-slate-500">Saldo &amp; Arus Kas</p>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><LayoutDashboard size={15} /></span>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-400">Total Saldo</p>
              <p className="preview-value text-[26px] font-extrabold tracking-tight text-slate-900">Rp8.450.000</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50/80 p-3">
                  <p className="text-[10px] font-bold text-slate-500">Pemasukan</p>
                  <p className="preview-value mt-0.5 text-[13px] font-extrabold text-blue-700">Rp12.300.000</p>
                </div>
                <div className="rounded-xl bg-rose-50/80 p-3">
                  <p className="text-[10px] font-bold text-slate-500">Pengeluaran</p>
                  <p className="preview-value mt-0.5 text-[13px] font-extrabold text-rose-600">Rp3.850.000</p>
                </div>
              </div>
              <div className="mt-4 flex h-14 items-end gap-1.5">
                {[38, 62, 45, 78, 54, 88, 66].map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-blue-100 to-blue-500"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </article>

            {/* Kanan: transaksi terbaru */}
            <article className="float-c rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[13px] font-extrabold">Transaksi terbaru</p>
                <ChevronRight size={15} className="text-slate-400" />
              </div>
              <div className="space-y-3">
                {[
                  { icon: Utensils, label: 'Makan & Minum', sub: 'Kopi pagi', amount: '-Rp25.000', tone: 'text-slate-900' },
                  { icon: Bus, label: 'Transport', sub: 'Bensin', amount: '-Rp50.000', tone: 'text-slate-900' },
                  { icon: BriefcaseBusiness, label: 'Gaji', sub: 'Pemasukan', amount: '+Rp3.500.000', tone: 'text-blue-600' },
                ].map((tx) => {
                  const TxIcon = tx.icon
                  return (
                  <div key={tx.label} className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><TxIcon size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-bold">{tx.label}</p>
                      <p className="text-[10px] text-slate-400">{tx.sub}</p>
                    </div>
                    <p className={`preview-value shrink-0 text-[11px] font-extrabold ${tx.tone}`}>{tx.amount}</p>
                  </div>
                  )
                })}
              </div>
              <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700">
                <CircleCheck size={13} /> Tersinkron otomatis
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ---------- 3. Strip fitur ---------- */}
      <section id="fitur" className="scroll-mt-28 bg-slate-50/70 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Dirancang untuk Pencatatan Harian Tanpa Ribet
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
            Semua yang kamu butuhkan untuk tahu ke mana uang pergi, dalam satu tempat yang ringan.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {FEATURE_BADGES.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="soft-lift inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-bold text-slate-600 shadow-sm"
              >
                <Icon size={14} className="text-blue-600" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4. Studi kasus interaktif ---------- */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            title="Kelola Arus Kas dengan Cara yang"
            accent="Paling Mudah"
            desc="Satu alur kerja yang bisa dipakai siapa saja — tinggal pilih yang paling mirip denganmu."
          />

          <div className="mt-9 flex flex-wrap justify-center gap-2">
            {PERSONAS.map((item, index) => (
              <button
                key={item.tab}
                type="button"
                onClick={() => setPersona(index)}
                className={`rounded-full px-4 py-2.5 text-[12px] font-bold transition ${
                  persona === index
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {item.tab}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PERSONAS.map((item, index) => {
              const active = persona === index
              return (
                <article
                  key={item.tab}
                  className={`soft-lift relative overflow-hidden rounded-3xl border p-7 ${
                    active
                      ? 'border-transparent bg-gradient-to-br from-sky-400 via-blue-600 to-blue-800 text-white shadow-[0_26px_60px_rgba(37,99,235,0.32)]'
                      : 'border-slate-200 bg-white text-slate-900 shadow-[0_12px_34px_rgba(37,99,235,0.06)]'
                  }`}
                >
                  {active && (
                    <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
                  )}
                  <div className="relative">
                    <span className={`text-[10px] font-extrabold uppercase tracking-[0.16em] ${active ? 'text-blue-100' : 'text-blue-600'}`}>
                      {item.tab}
                    </span>
                    <h3 className="mt-3 text-xl font-extrabold tracking-tight">{item.title}</h3>
                    <p className={`mt-2 text-[13px] leading-relaxed ${active ? 'text-blue-50/85' : 'text-slate-500'}`}>
                      {item.desc}
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {item.points.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-[12px] font-semibold">
                          <span className={`grid h-5 w-5 place-items-center rounded-full ${active ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                            <Check size={12} />
                          </span>
                          {point}
                        </li>
                      ))}
                    </ul>
                    <div className={`mt-6 rounded-2xl p-4 ${active ? 'bg-white/15' : 'bg-slate-50'}`}>
                      <p className={`preview-value text-2xl font-extrabold tracking-tight ${active ? 'text-white' : 'text-blue-700'}`}>
                        {item.stat}
                      </p>
                      <p className={`mt-0.5 text-[10.5px] font-semibold ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                        {item.statLabel}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- 5. WA → Dashboard ---------- */}
      <section id="bot-whatsapp" className="scroll-mt-28 bg-slate-50/70 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="Catat Transaksi Cukup Lewat"
            accent="Chat WhatsApp"
            desc="Ketik seperti bicara normal. SakuFlow yang mengenali nominal, jenis, dan kategorinya."
          />

          <div className="soft-lift mx-auto mt-12 max-w-4xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.1)] sm:p-9">
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white"><MessageCircle size={17} /></span>
                  <div>
                    <p className="text-[13px] font-extrabold">Pesan masuk</p>
                    <p className="text-[10px] font-semibold text-slate-400">Dari nomor yang sudah terhubung</p>
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-md bg-slate-900 px-5 py-4 text-sm font-semibold text-white">
                  keluar 25rb buat kopi
                </div>
                <div className="mt-5 flex items-center gap-2 text-[11px] font-bold text-blue-600">
                  <Sparkles size={14} /> Pesan dibaca otomatis dalam hitungan detik
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-[11px] font-semibold text-blue-700">
                  <BadgeCheck size={15} /> Tidak perlu buka aplikasi untuk mencatat
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <p className="text-[12px] font-extrabold text-slate-900">Hasil pembacaan pesan</p>
                <div className="mt-4 space-y-3">
                  {[
                    { icon: Coffee, label: 'Kategori terdeteksi', value: 'Makan & Minum' },
                    { icon: CreditCard, label: 'Nominal', value: 'Rp25.000' },
                    { icon: ArrowUpRight, label: 'Jenis', value: 'Pengeluaran' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-white bg-white px-3.5 py-3 shadow-sm">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-slate-400">{label}</p>
                        <p className="preview-value truncate text-[12.5px] font-extrabold text-slate-900">{value}</p>
                      </div>
                      <CircleCheck size={16} className="text-blue-600" />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onEnter}
                  className="mt-5 w-full rounded-full bg-blue-600 px-5 py-3.5 text-[13px] font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Simpan ke SakuFlow
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 6. Diagram node aliran uang ---------- */}
      <section id="alur-dana" className="scroll-mt-28 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="Pantau Aliran Uangmu"
            accent="Secara Real-Time"
            desc="Satu pusat saldo yang terhubung ke semua kategori. Perubahan dari WhatsApp langsung terlihat di sini."
          />

          <div className="relative mx-auto mt-12 h-[430px] max-w-5xl sm:h-[460px]">
            <svg viewBox="0 0 1000 440" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M 500 220 C 360 220, 280 100, 155 100" stroke="#bfdbfe" strokeWidth="2" fill="none" />
              <path d="M 500 220 C 360 220, 280 340, 155 340" stroke="#bfdbfe" strokeWidth="2" fill="none" />
              <path d="M 500 220 C 640 220, 720 100, 845 100" stroke="#bfdbfe" strokeWidth="2" fill="none" />
              <path d="M 500 220 C 640 220, 720 340, 845 340" stroke="#bfdbfe" strokeWidth="2" fill="none" />
              <circle cx="155" cy="100" r="6" fill="#2563eb" />
              <circle cx="155" cy="340" r="6" fill="#2563eb" />
              <circle cx="845" cy="100" r="6" fill="#2563eb" />
              <circle cx="845" cy="340" r="6" fill="#2563eb" />
            </svg>

            <div className="absolute left-1/2 top-1/2 z-10 w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-blue-100 bg-white p-5 text-center shadow-[0_24px_60px_rgba(37,99,235,0.16)] sm:w-[260px]">
              <LogoMark className="mx-auto mb-3 h-10 w-10 rounded-xl shadow-lg" />
              <p className="text-[11px] font-bold text-slate-500">Saldo &amp; Arus Kas</p>
              <p className="preview-value mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Rp8.450.000</p>
              <p className="mt-1 text-[10px] font-semibold text-blue-600">+ Rp2.100.000 bulan ini</p>
            </div>

            {[
              { icon: ArrowDownLeft, label: 'Pemasukan', value: 'Rp12,3 jt', pos: 'left-0 top-[8%] sm:top-[12%]' },
              { icon: ReceiptText, label: 'Kebutuhan Pokok', value: 'Rp1,8 jt', pos: 'left-0 bottom-[8%] sm:bottom-[12%]' },
              { icon: Coffee, label: 'Jajan & Kopi', value: 'Rp650 rb', pos: 'right-0 top-[8%] sm:top-[12%]' },
              { icon: PiggyBank, label: 'Tabungan', value: 'Rp2 jt', pos: 'right-0 bottom-[8%] sm:bottom-[12%]' },
            ].map(({ icon: Icon, label, value, pos }) => (
              <div
                key={label}
                className={`soft-lift absolute z-10 flex w-[150px] items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.1)] backdrop-blur sm:w-[175px] ${pos}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon size={15} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[10.5px] font-extrabold text-slate-900">{label}</span>
                  <span className="preview-value block text-[10px] font-bold text-slate-400">{value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 7. Kecepatan + CTA + footer ---------- */}
      <section className="bg-slate-50/70 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[38px] sm:leading-[1.15]">
              Pencatatan Selesai dalam <span className="text-gradient">Hitungan Detik</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
              Tidak perlu membuka banyak menu. Ketik satu kalimat, SakuFlow menyimpan transaksinya dan langsung mengirim struk konfirmasi.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {['Auto-kategorisasi', 'Struk instan', 'Sinkron realtime', 'Tanpa ribet'].map((chip) => (
                <span key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11.5px] font-bold text-slate-600">
                  <Check size={13} className="text-blue-600" /> {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="soft-lift rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(37,99,235,0.09)] sm:p-8">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Cloud size={20} /></span>
              <div>
                <p className="text-[14px] font-extrabold">Sinkronisasi saldo instan</p>
                <p className="mt-1 text-[12px] text-slate-500">Data dari WhatsApp langsung muncul di dashboard tanpa refresh.</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600">LIVE</span>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: 'Pesan diterima', done: true },
                { label: 'Transaksi tersimpan', done: true },
                { label: 'Dashboard diperbarui', done: true },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full ${step.done ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {step.done ? <Check size={14} /> : <span className="text-[10px]">{i + 1}</span>}
                  </span>
                  <span className="text-[12px] font-bold text-slate-700">{step.label}</span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-400">baru saja</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 p-4">
              <p className="flex items-center gap-2 text-[11.5px] font-bold text-blue-800">
                <ShieldCheck size={15} /> Data hanya bisa diakses akunmu sendiri
              </p>
              <p className="mt-1 text-[10.5px] text-blue-600/80">Dilindungi Supabase Row Level Security.</p>
            </div>
          </div>
        </div>

        <div className="hero-shell mx-auto mt-24 max-w-6xl rounded-[32px] px-6 py-14 text-center sm:px-12 sm:py-16">
          <div className="relative z-10">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-[42px] sm:leading-[1.15]">
              Mulai Rapikan Arus Kasmu Sekarang
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-blue-100">
              Gratis dipakai, bisa langsung dicoba tanpa kartu kredit. Data tetap milikmu.
            </p>
            <button
              type="button"
              onClick={onEnter}
              className="group mt-8 inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-white/20 px-6 py-3.5 text-[13px] font-bold text-white backdrop-blur-md transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/30"
            >
              {primaryLabel}
              <ArrowRight size={15} className="transition duration-300 ease-out group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-slate-500">
              Catat keuangan harian dengan cepat lewat chat, lalu pahami ke mana uangmu pergi.
            </p>
            <a
              href="https://github.com/AlhadiAzumi/SakuFlow"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline"
            >
              GitHub <ArrowUpRightFromSquare size={12} />
            </a>
          </div>
          {[
            { title: 'Produk', links: ['Fitur', 'Cara Kerja', 'Bot WhatsApp', 'Alur Dana'] },
            { title: 'Perusahaan', links: ['Tentang SakuFlow', 'Kebijakan Privasi', 'GitHub'] },
            { title: 'Bantuan', links: ['Panduan Mulai', 'Kontak', 'Status Layanan'] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-extrabold text-slate-900">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href={
                        link === 'Kebijakan Privasi'
                          ? 'https://github.com/AlhadiAzumi/SakuFlow/blob/main/PRIVACY.md'
                          : link === 'GitHub'
                            ? 'https://github.com/AlhadiAzumi/SakuFlow'
                            : '#top'
                      }
                      target={link === 'Fitur' || link === 'Cara Kerja' || link === 'Bot WhatsApp' || link === 'Alur Dana' ? undefined : '_blank'}
                      rel="noreferrer"
                      className="text-[11.5px] font-medium text-slate-500 transition hover:text-blue-600"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-7xl text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} SakuFlow. Dibuat untuk membantu arus kas yang lebih tenang.
        </div>
      </footer>
    </div>
  )
}
