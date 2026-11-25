import { useCallback, useEffect, useState } from 'react'
import BotCommands from './BotCommands'
import FundFlowDiagram from './FundFlowDiagram'
import PixelIcon from './PixelIcon'
import LogoMark from './LogoMark'
import Reveal from './Reveal'
import SyncToast from './SyncToast'

const NAV = [
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Bot WhatsApp', href: '#bot-whatsapp' },
  { label: 'Perintah Bot', href: '#perintah-bot' },
  { label: 'Alur Dana', href: '#alur-dana' },
]

const FEATURE_BADGES = [
  { label: 'Bot WhatsApp Otomatis', icon: 'whatsapp' },
  { label: 'Diagram Alur Sankey', icon: 'waypoints' },
  { label: 'Sinkronisasi Cloud Supabase', icon: 'cloud' },
  { label: 'Mode Lokal & Online', icon: 'shield' },
  { label: 'Ringkasan Real-Time', icon: 'zap' },
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

const DEMO_COMMANDS = [
  {
    label: 'Kopi pagi',
    input: 'keluar 25rb buat kopi',
    title: 'Tersimpan di dashboard',
    amount: 'Rp25.000 • Makan & Minum',
    note: 'Bot tidak membalas chat. Cek hasilnya di website.',
  },
  {
    label: 'Gaji masuk',
    input: 'masuk gaji 3,5 jt',
    title: 'Tersimpan di dashboard',
    amount: 'Rp3.500.000 • Gaji',
    note: 'Bot tidak membalas chat. Saldo langsung bertambah.',
  },
  {
    label: 'Naik ojol',
    input: 'keluar 18rb transport',
    title: 'Tersimpan di dashboard',
    amount: 'Rp18.000 • Transport',
    note: 'Kategori otomatis terdeteksi dari pesanmu.',
  },
]

function Brand() {
  return (
    <a href="#top" className="flex items-center gap-2.5 no-underline">
      <LogoMark className="h-9 w-9 rounded-xl shadow-[0_8px_18px_rgba(37,99,235,0.28)]" />
      <span className="text-[15px] font-extrabold tracking-tight text-slate-900">
        Sakunode
      </span>
    </a>
  )
}

function DarkPill({ children, onClick, href, className = '' }) {
  const classes = `dark-pill group inline-flex items-center gap-2.5 rounded-full bg-slate-900 px-5 py-3 text-[13px] font-bold text-white transition duration-300 ease-out hover:bg-slate-800 ${className}`
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/30 transition duration-300 ease-out group-hover:translate-x-0.5">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12 12 4M6 4h6v6" />
          </svg>
        </span>
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/30 transition duration-300 ease-out group-hover:translate-x-0.5">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12 12 4M6 4h6v6" />
        </svg>
      </span>
    </button>
  )
}

function SectionHeading({ title, accent, desc, id, accentClassName = '' }) {
  return (
    <div id={id} className="mx-auto max-w-2xl scroll-mt-28 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[38px] sm:leading-[1.15]">
        {title} <span className={['text-gradient', accentClassName].filter(Boolean).join(' ')}>{accent}</span>
      </h2>
      {desc && <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-[15px]">{desc}</p>}
    </div>
  )
}

export default function LandingPage({ onEnter, isLoggedIn = false }) {
  const [persona, setPersona] = useState(1)
  const [demo, setDemo] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(null)
  const [demoSync, setDemoSync] = useState(null)
  const closeDemoSync = useCallback(() => setDemoSync(null), [])

  const showDemoSync = () => {
    setDemoSync({
      id: `demo-${Date.now()}`,
      amount: 25000,
      type: 'expense',
      note: 'kopi',
      receivedAt: new Date().toISOString(),
    })
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveSection(`#${visible.target.id}`)
    }, { rootMargin: '-25% 0px -62% 0px', threshold: [0, 0.1, 0.5] })

    NAV.forEach((item) => {
      const element = document.getElementById(item.href.slice(1))
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  const navLabel = isLoggedIn ? 'Dashboard' : 'Masuk'
  const primaryLabel = isLoggedIn ? 'Buka Dashboard' : 'Mulai Catat Gratis'
  const footerHref = (link) => {
    if (link === 'Kebijakan Privasi') return '/privacy'
    if (link === 'Syarat & Ketentuan') return '/terms'
    if (link === 'Kontak') return 'mailto:sakunode@gmail.com'
    if (link === 'GitHub') return 'https://github.com/AlhadiAzumi/Sakunode'
    return NAV.find((item) => item.label === link)?.href || '#top'
  }
  const isExternalLink = (link) => link === 'GitHub'
  const navClass = (href, mobile = false) => [
    mobile ? 'block' : 'whitespace-nowrap',
    'rounded-lg px-3 py-1.5 text-[13px] transition',
    activeSection === href
      ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
      : 'font-semibold text-slate-500 hover:bg-blue-50 hover:text-blue-700',
  ].join(' ')

  return (
    <div id="top" className="pixel-landing min-h-screen bg-white text-slate-900">
      {/* ---------- 1. Floating glass navbar ---------- */}
      <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_12px_40px_rgba(37,99,235,0.08)] backdrop-blur-xl sm:px-6">
          <Brand />
          <div className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={activeSection === item.href ? 'true' : undefined}
                onClick={() => setActiveSection(item.href)}
                className={navClass(item.href)}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-3 border-r border-slate-200 pr-3 lg:flex">
              <a href="/privacy" className="whitespace-nowrap text-[11.5px] font-semibold text-slate-500 transition hover:text-blue-700">
                Privasi
              </a>
              <a href="/terms" className="whitespace-nowrap text-[11.5px] font-semibold text-slate-500 transition hover:text-blue-700">
                Syarat
              </a>
            </div>
            <DarkPill onClick={onEnter} className="hidden sm:inline-flex">{navLabel}</DarkPill>
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden"
            >
              <PixelIcon name={menuOpen ? 'close' : 'menu'} size={18} />
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-xl lg:hidden">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={activeSection === item.href ? 'true' : undefined}
                onClick={() => {
                  setActiveSection(item.href)
                  setMenuOpen(false)
                }}
                className={navClass(item.href, true)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-4 border-t border-slate-100 px-3 pt-3 text-[11.5px] font-semibold text-slate-500">
              <a href="/privacy">Kebijakan Privasi</a>
              <a href="/terms">Syarat &amp; Ketentuan</a>
            </div>
            <button type="button" onClick={onEnter} className="mt-2 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white">
              {isLoggedIn ? 'Buka Dashboard' : 'Masuk ke Sakunode'}
            </button>
          </div>
        )}
      </header>

      {/* ---------- 2. Hero ---------- */}
      <section className="px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="hero-shell pixel-hero mx-auto max-w-7xl px-5 pb-28 pt-14 sm:px-10 sm:pt-20">
          <span className="pixel-stars" aria-hidden="true" />
          <Reveal className="relative z-10 mx-auto max-w-3xl text-center">
            <span className="pixel-eyebrow justify-center text-blue-100">CATAT • CEK • EVALUASI • ULANGI</span>
            <h1 className="text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl lg:text-[64px]">
              Catat Keuangan Harian
              <br className="hidden sm:block" /> Lebih Cepat dengan{' '}
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <PixelIcon name="sparkles" size={24} className="text-sky-200 drop-shadow-[0_0_10px_rgba(125,211,252,0.9)] sm:text-4xl" />
                <span>Sakunode</span>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
              Sakunode adalah aplikasi pencatatan keuangan harian terintegrasi bot WhatsApp dan dashboard visualisasi arus kas. Catat uang masuk, keluar, dan tabungan cukup lewat chat, lalu lihat ke mana uangmu pergi lewat diagram alur yang enak dibaca.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onEnter}
                className="pixel-hero-cta group inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-white/20 px-6 py-3.5 text-[13px] font-bold text-white backdrop-blur-md hover:bg-white/30"
              >
                {primaryLabel}
                <PixelIcon name="arrow-right" size={15} className="transition duration-300 ease-out group-hover:translate-x-1" />
              </button>
              <DarkPill href="#cara-kerja">Lihat Cara Kerja</DarkPill>
            </div>
          </Reveal>

          {/* 3 kartu pratinjau UI */}
          <Reveal delay={120} className="relative z-10 mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-3 md:gap-5">
            {/* Kiri: simulasi chat WA */}
            <article className="float-a pixel-card rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white">
                  <PixelIcon name="whatsapp" size={17} />
                </span>
                <div>
                  <p className="text-[13px] font-extrabold leading-tight">Bot WhatsApp</p>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Membaca pesan
                  </p>
                </div>
              </div>
              <div className="pixel-chip-row">
                {DEMO_COMMANDS.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setDemo(index)}
                    className={`pixel-chip ${demo === index ? 'is-active' : ''}`}
                    aria-pressed={demo === index}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2.5">
                <div className="pixel-chat pixel-chat--in max-w-[92%]">
                  {DEMO_COMMANDS[demo].input}
                  <span className="pixel-caret" aria-hidden="true" />
                </div>
                <div className="pixel-chat pixel-chat--out ml-auto max-w-[96%]" aria-live="polite">
                  <strong>{DEMO_COMMANDS[demo].title}</strong>
                  <span className="font-semibold tabular-nums text-slate-700">{DEMO_COMMANDS[demo].amount}</span>
                  <span>{DEMO_COMMANDS[demo].note}</span>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[10px] font-semibold leading-relaxed text-slate-500">
                <PixelIcon name="info" size={12} className="mt-0.5 shrink-0 text-blue-600" />
                Pratinjau hasil di dashboard, bukan balasan WhatsApp.
              </p>
            </article>

            {/* Tengah: kartu utama */}
            <article className="float-b pixel-card relative rounded-3xl border border-white/70 bg-white/95 p-5 backdrop-blur-xl md:-mt-4 md:scale-[1.03]">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-slate-500">Saldo &amp; Arus Kas</p>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><PixelIcon name="layout-dashboard" size={15} /></span>
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
            <article className="float-c pixel-card rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[13px] font-extrabold">Transaksi terbaru</p>
                <PixelIcon name="chevron-right" size={15} className="text-slate-400" />
              </div>
              <div className="space-y-3">
                {[
                  { icon: 'food', label: 'Makan & Minum', sub: 'Kopi pagi', amount: '-Rp25.000', tone: 'text-slate-900' },
                  { icon: 'bus', label: 'Transport', sub: 'Bensin', amount: '-Rp50.000', tone: 'text-slate-900' },
                  { icon: 'briefcase', label: 'Gaji', sub: 'Pemasukan', amount: '+Rp3.500.000', tone: 'text-blue-600' },
                ].map((tx) => (
                  <div key={tx.label} className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><PixelIcon name={tx.icon} size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-bold">{tx.label}</p>
                      <p className="text-[10px] text-slate-400">{tx.sub}</p>
                    </div>
                    <p className={`preview-value shrink-0 text-[11px] font-extrabold ${tx.tone}`}>{tx.amount}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700">
                <PixelIcon name="circle-check" size={13} /> Tersinkron otomatis
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ---------- 2b. Pixel ticker ---------- */}
      <div className="pixel-ticker" aria-hidden="true">
        <div className="pixel-ticker__track">
          {[0, 1].map((group) => (
            <div key={group} className="pixel-ticker__group">
              {['Catat lebih cepat', 'Lihat arah uangmu', 'Sinkron real-time', 'Tanpa spreadsheet'].map((text) => (
                <span key={text}>{text}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- 3. Strip fitur ---------- */}
      <section id="fitur" className="scroll-mt-28 bg-slate-50/70 px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Dirancang untuk Pencatatan Harian Tanpa Ribet
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
            Sakunode menggabungkan bot WhatsApp untuk pencatatan cepat dan dashboard web untuk visualisasi arus kas. Semua yang kamu butuhkan untuk tahu ke mana uang pergi ada dalam satu tempat yang ringan.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {FEATURE_BADGES.map(({ label, icon }) => (
              <span
                key={label}
                className="soft-lift pixel-badge inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-bold text-slate-600"
              >
                <PixelIcon name={icon} size={14} className="text-blue-600" /> {label}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------- 4. Studi kasus interaktif ---------- */}
      <section id="cara-kerja" className="scroll-mt-28 px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-7xl">
          <SectionHeading
            title="Kelola Arus Kas dengan Cara yang"
            accent="Paling Mudah"
            desc="Satu alur kerja yang bisa dipakai siapa saja. Tinggal pilih yang paling mirip denganmu."
          />

          <div className="mt-9 flex flex-wrap justify-center gap-2">
            {PERSONAS.map((item, index) => (
              <button
                key={item.tab}
                type="button"
                onClick={() => setPersona(index)}
                className={`pixel-chip ${persona === index ? 'is-active' : ''}`}
              >
                {item.tab}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PERSONAS.map((item, index) => {
              const active = persona === index
              return (
                <Reveal key={item.tab} delay={index * 90} className="h-full">
                  <article
                    className={`soft-lift relative h-full overflow-hidden rounded-3xl border p-7 ${
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
                              <PixelIcon name="check" size={12} />
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
                </Reveal>
              )
            })}
          </div>
        </Reveal>
      </section>

      {/* ---------- 5. WA → Dashboard ---------- */}
      <section id="bot-whatsapp" className="scroll-mt-28 bg-slate-50/70 px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-6xl">
          <SectionHeading
            title="Catat Transaksi Cukup Lewat"
            accent="Chat WhatsApp"
            desc="Ketik seperti bicara normal. Sakunode yang mengenali nominal, jenis, dan kategorinya."
          />

          <div className="soft-lift mx-auto mt-12 max-w-4xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.1)] sm:p-9">
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white"><PixelIcon name="whatsapp" size={17} /></span>
                  <div>
                    <p className="text-[13px] font-extrabold">Pesan masuk</p>
                    <p className="text-[10px] font-semibold text-slate-400">Dari nomor yang sudah terhubung</p>
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-md bg-slate-900 px-5 py-4 text-sm font-semibold text-white">
                  keluar 25rb buat kopi
                </div>
                <div className="mt-5 flex items-center gap-2 text-[11px] font-bold text-blue-600">
                  <PixelIcon name="sparkles" size={14} /> Pesan dibaca otomatis dalam hitungan detik
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-[11px] font-semibold text-blue-700">
                  <PixelIcon name="badge-check" size={15} /> Tidak perlu buka aplikasi untuk mencatat
                </div>
                <button
                  type="button"
                  onClick={showDemoSync}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                >
                  <PixelIcon name="zap" size={13} /> Lihat notifikasi sinkron
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <p className="text-[12px] font-extrabold text-slate-900">Hasil pembacaan pesan</p>
                <div className="mt-4 space-y-3">
                  {[
                    { icon: 'coffee', label: 'Kategori terdeteksi', value: 'Makan & Minum' },
                    { icon: 'credit-card', label: 'Nominal', value: 'Rp25.000' },
                    { icon: 'arrow-up-right', label: 'Jenis', value: 'Pengeluaran' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-white bg-white px-3.5 py-3 shadow-sm">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><PixelIcon name={icon} size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-slate-400">{label}</p>
                        <p className="preview-value truncate text-[12.5px] font-extrabold text-slate-900">{value}</p>
                      </div>
                      <PixelIcon name="circle-check" size={16} className="text-blue-600" />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onEnter}
                  className="mt-5 w-full rounded-full bg-blue-600 px-5 py-3.5 text-[13px] font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Simpan ke Sakunode
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- 5b. Daftar perintah bot ---------- */}
      <section id="perintah-bot" className="scroll-mt-28 px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-5xl">
          <SectionHeading
            title="Perintah Bot WhatsApp"
            accent="Yang Bisa Kamu Kirim"
            desc="Tidak perlu hafal format khusus. Ketik seperti bicara normal, lalu lihat hasilnya di dashboard."
          />
          <div className="soft-lift mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.1)] sm:p-8">
            <BotCommands />
          </div>
        </Reveal>
      </section>

      {/* ---------- 6. Diagram node aliran uang ---------- */}
      <section id="alur-dana" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-6xl">
          <SectionHeading
            title="Pantau Aliran Uangmu"
            accent="Secara Real-Time"
            accentClassName="sm:inline-block sm:whitespace-nowrap"
            desc="Satu pusat saldo yang terhubung ke semua kategori. Perubahan dari WhatsApp langsung terlihat di sini."
          />

          <div className="mt-12">
            <FundFlowDiagram />
          </div>
        </Reveal>
      </section>

      {/* ---------- 7. Kecepatan + CTA + footer ---------- */}
      <section className="bg-slate-50/70 px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[38px] sm:leading-[1.15]">
              Pencatatan Selesai dalam <span className="text-gradient">Hitungan Detik</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
              Tidak perlu membuka banyak menu. Ketik satu kalimat, Sakunode langsung menyimpannya dan menampilkannya di dashboard.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {['Auto-kategorisasi', 'Tersimpan instan', 'Sinkron realtime', 'Tanpa ribet'].map((chip) => (
                <span key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11.5px] font-bold text-slate-600">
                  <PixelIcon name="check" size={13} className="text-blue-600" /> {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="soft-lift rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(37,99,235,0.09)] sm:p-8">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><PixelIcon name="cloud" size={20} /></span>
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
                    {step.done ? <PixelIcon name="check" size={14} /> : <span className="text-[10px]">{i + 1}</span>}
                  </span>
                  <span className="text-[12px] font-bold text-slate-700">{step.label}</span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-400">baru saja</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 p-4">
              <p className="flex items-center gap-2 text-[11.5px] font-bold text-blue-800">
                <PixelIcon name="shield" size={15} /> Data hanya bisa diakses akunmu sendiri
              </p>
              <p className="mt-1 text-[10.5px] text-blue-600/80">Dilindungi Supabase Row Level Security.</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} className="hero-shell mx-auto mt-24 max-w-6xl rounded-[32px] px-6 py-14 text-center sm:px-12 sm:py-16">
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
              className="pixel-hero-cta group mt-8 inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-white/20 px-6 py-3.5 text-[13px] font-bold text-white backdrop-blur-md hover:bg-white/30"
            >
              {primaryLabel}
              <PixelIcon name="arrow-right" size={15} className="transition duration-300 ease-out group-hover:translate-x-1" />
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-slate-500">
              Catat keuangan harian dengan cepat lewat chat, lalu pahami ke mana uangmu pergi.
            </p>
            <a
              href="https://github.com/AlhadiAzumi/Sakunode"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline"
            >
              GitHub <PixelIcon name="external" size={12} />
            </a>
          </div>
          {[
            { title: 'Produk', links: ['Fitur', 'Cara Kerja', 'Bot WhatsApp', 'Perintah Bot', 'Alur Dana'] },
            { title: 'Perusahaan', links: ['Tentang Sakunode', 'Kebijakan Privasi', 'Syarat & Ketentuan', 'GitHub'] },
            { title: 'Bantuan', links: ['Panduan Mulai', 'Kontak', 'Status Layanan'] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-extrabold text-slate-900">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href={footerHref(link)}
                      target={isExternalLink(link) ? '_blank' : undefined}
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
        </Reveal>
        <div className="mx-auto mt-10 max-w-7xl text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} Sakunode. Dibuat untuk membantu arus kas yang lebih tenang.
        </div>
      </footer>

      <SyncToast tx={demoSync} onClose={closeDemoSync} />
    </div>
  )
}
