import { useEffect, useMemo, useState } from 'react'
import AddTransactionModal from './components/AddTransactionModal'
import AuthScreen from './components/AuthScreen'
import BudgetPanel from './components/BudgetPanel'
import CategoryBreakdown from './components/CategoryBreakdown'
import InsightCard from './components/InsightCard'
import LandingPage from './components/LandingPage'
import LogoMark from './components/LogoMark'
import MoneyFlow from './components/MoneyFlow'
import PixelIcon from './components/PixelIcon'
import Reveal from './components/Reveal'
import SavingsCard from './components/SavingsCard'
import Settings from './components/Settings'
import SummaryCards from './components/SummaryCards'
import TransactionList from './components/TransactionList'
import TrendChart from './components/TrendChart'
import { useApp } from './context/useApp'
import {
  expenseByCategory,
  getBudgetStatus,
  getInsight,
  getMonthTransactions,
  getSavingsProgress,
  getTrend,
  summarize,
} from './lib/analytics'
import { currentMonthKey, formatMonthLabel, formatRupiah, formatTimeAgo, shiftMonth } from './lib/format'

const TABS = [
  { id: 'home', label: 'Beranda', icon: 'house' },
  { id: 'notes', label: 'Catatan', icon: 'receipt' },
  { id: 'settings', label: 'Setelan', icon: 'settings' },
]

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-screen__mark"><LogoMark className="h-full w-full rounded-[16px]" /></div>
      <div className="loading-screen__spinner" />
      <p>Menyiapkan catatanmu…</p>
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast toast--${toast.tone}`} role="status" key={toast.id}>
      {toast.tone === 'error' ? <PixelIcon name="alert" size={16} /> : <PixelIcon name="check" size={16} />}
      {toast.message}
    </div>
  )
}

export default function App() {
  const {
    mode, user, authLoading, dataLoading, transactions, lastSyncedTx, settings, toast,
    addTransaction, updateTransaction, deleteTransaction, showToast,
  } = useApp()

  const [tab, setTab] = useState('home')
  const [view, setView] = useState('landing')
  const [showAuth, setShowAuth] = useState(false)
  const [month, setMonth] = useState(currentMonthKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [syncTick, setSyncTick] = useState(Date.now())

  const isLoggedIn = mode === 'local' || Boolean(user)

  const monthItems = useMemo(() => getMonthTransactions(transactions, month), [transactions, month])
  const summary = useMemo(() => summarize(monthItems), [monthItems])
  const categories = useMemo(() => expenseByCategory(monthItems), [monthItems])
  const trend = useMemo(() => getTrend(transactions, month), [transactions, month])
  const insight = useMemo(() => getInsight(transactions, monthItems), [transactions, monthItems])
  const budgetStatus = useMemo(() => getBudgetStatus(monthItems, settings.budgets), [monthItems, settings.budgets])
  const savingsProgress = useMemo(() => getSavingsProgress(summary.balance, settings.savingsTarget), [summary.balance, settings.savingsTarget])
  const overBudget = budgetStatus.filter((item) => item.status === 'over')
  const nearBudget = budgetStatus.filter((item) => item.status === 'warning')

  useEffect(() => {
    if (isLoggedIn && showAuth) {
      setShowAuth(false)
      setView('dashboard')
    }
  }, [isLoggedIn, showAuth])

  // Supaya label "baru saja" berubah sendiri tanpa refresh halaman.
  useEffect(() => {
    if (!lastSyncedTx) return undefined
    const timer = setInterval(() => setSyncTick(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [lastSyncedTx])

  if (authLoading) return <LoadingScreen />

  if (!isLoggedIn) {
    return (
      <>
        {showAuth ? (
          <AuthScreen onBack={() => setShowAuth(false)} />
        ) : (
          <LandingPage onEnter={() => setShowAuth(true)} />
        )}
        <Toast toast={toast} />
      </>
    )
  }

  if (view === 'landing') {
    return (
      <>
        <LandingPage isLoggedIn onEnter={() => setView('dashboard')} />
        <Toast toast={toast} />
      </>
    )
  }

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (tx) => {
    setEditing(tx)
    setModalOpen(true)
  }

  const handleSave = async (payload) => {
    try {
      if (editing) {
        await updateTransaction(editing.id, payload)
        showToast('Catatan diperbarui.')
      } else {
        await addTransaction(payload)
        showToast('Catatan tersimpan. Terus pantau uangmu!')
      }
      setModalOpen(false)
      setEditing(null)
    } catch (error) {
      throw error
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id)
      showToast('Catatan dihapus.')
    } catch (error) {
      showToast(error?.message || 'Gagal menghapus catatan.', 'error')
    }
  }

  const firstName = (user?.email || '').split('@')[0] || 'teman'
  const displayName = mode === 'local' ? 'teman' : firstName.charAt(0).toUpperCase() + firstName.slice(1)

  return (
    <div className="app-shell pixel-app">
      <header className="app-header">
        <div className="app-header__inner">
          <button type="button" className="brand" onClick={() => setView('landing')} title="Lihat halaman utama SakuFlow">
            <span className="brand-mark"><LogoMark className="h-full w-full rounded-[10px]" /></span>
            <span className="brand__text">
              <strong>SakuFlow</strong>
              <small>Catatan uang harian</small>
            </span>
          </button>

          <nav className="top-nav" aria-label="Navigasi utama">
            {TABS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={tab === item.id ? 'is-active' : ''}
                onClick={() => setTab(item.id)}
              >
                <PixelIcon name={item.icon} size={15} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="header-actions">
            {mode === 'cloud' && (
              <span className="live-badge" title="Data tersinkron langsung"><i /> Live</span>
            )}
            <div className="month-switcher">
              <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya"><PixelIcon name="chevron-left" size={17} /></button>
              <span>{formatMonthLabel(month)}</span>
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(month, 1))}
                disabled={month >= currentMonthKey()}
                aria-label="Bulan berikutnya"
              ><PixelIcon name="chevron-right" size={17} /></button>
            </div>
            <div className="user-chip" title={mode === 'cloud' ? user?.email : 'Mode lokal'}>
              {mode === 'cloud' ? displayName.charAt(0).toUpperCase() : <PixelIcon name="house" size={14} />}
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {dataLoading && mode === 'cloud' ? (
          <LoadingScreen />
        ) : tab === 'home' ? (
          <div className="page page--home">
            {lastSyncedTx && (
              <div
                className="sync-pill"
                title={lastSyncedTx.note || 'Transaksi terakhir tersinkron'}
                role="status"
              >
                <i />
                Sinkron terakhir: {formatTimeAgo(lastSyncedTx.receivedAt, syncTick)} •{' '}
                {lastSyncedTx.type === 'income' ? 'Masuk' : 'Keluar'}{' '}
                {formatRupiah(lastSyncedTx.amount)}
              </div>
            )}

            <div className="page-heading">
              <div>
                <span className="pixel-eyebrow">MODE CATAT / {mode === 'cloud' ? 'ONLINE' : 'LOKAL'}</span>
                <h1>Halo, {displayName}</h1>
                <p>Yuk lihat ke mana uangmu pergi <span className="text-gradient font-extrabold">bulan ini</span>.</p>
              </div>
              <button type="button" className="button button--primary button--add-desktop" onClick={openAdd}>
                <span className="button__icon"><PixelIcon name="plus" size={13} /></span>
                Catat uang
              </button>
            </div>

            {transactions.length === 0 && (
              <div className="welcome-banner">
                <span className="welcome-banner__icon"><PixelIcon name="sparkles" size={26} /></span>
                <div>
                  <strong>Langkah pertama dimulai dari satu catatan.</strong>
                  <p>Tambahkan uang masuk atau pengeluaran pertamamu untuk melihat peta uangmu.</p>
                </div>
                <button type="button" className="button button--primary" onClick={openAdd}>Catat sekarang</button>
              </div>
            )}

            <SummaryCards income={summary.income} expense={summary.expense} balance={summary.balance} />

            {overBudget.length > 0 && (
              <div className="alert-banner alert-banner--danger" role="status">
                <span className="alert-banner__icon"><PixelIcon name="alert" size={20} /></span>
                <p>
                  <strong>{overBudget.length} kategori sudah melewati budget:</strong>{' '}
                  {overBudget.map((item) => item.label).join(', ')}. Cek pengeluaranmu, ya.
                </p>
              </div>
            )}
            {overBudget.length === 0 && nearBudget.length > 0 && (
              <div className="alert-banner alert-banner--warning" role="status">
                <span className="alert-banner__icon"><PixelIcon name="alert" size={20} /></span>
                <p>
                  <strong>Hati-hati, budget hampir habis:</strong>{' '}
                  {nearBudget.map((item) => `${item.label} (${Math.round(item.pct)}%)`).join(', ')}.
                </p>
              </div>
            )}

            <Reveal delay={60}>
              <section className="panel panel--flow">
                <MoneyFlow income={summary.income} expenses={categories} savingsTarget={settings.savingsTarget} />
              </section>
            </Reveal>

            <Reveal delay={100}><SavingsCard progress={savingsProgress} onOpenSettings={() => setTab('settings')} /></Reveal>

            <Reveal delay={140}><BudgetPanel budgets={budgetStatus} onOpenSettings={() => setTab('settings')} /></Reveal>

            <Reveal delay={180}><InsightCard insight={insight} /></Reveal>

            <div className="grid-2">
              <Reveal className="h-full" delay={60}>
                <section className="panel h-full">
                  <h2 className="panel__title">Naik turun uangmu</h2>
                  <TrendChart trend={trend} />
                </section>
              </Reveal>
              <Reveal className="h-full" delay={120}>
                <section className="panel h-full">
                  <h2 className="panel__title">Pengeluaran terbesar</h2>
                  <CategoryBreakdown categories={categories} />
                </section>
              </Reveal>
            </div>

            <Reveal delay={100}>
              <section className="panel">
                <div className="panel__header-row">
                  <div>
                    <h2 className="panel__title">Catatan terakhir</h2>
                  </div>
                  <button type="button" className="link-button" onClick={() => setTab('notes')}>Lihat semua <PixelIcon name="arrow-right" size={14} /></button>
                </div>
                <TransactionList items={[...monthItems].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5)} onEdit={openEdit} onDelete={handleDelete} compact />
              </section>
            </Reveal>
          </div>
        ) : tab === 'notes' ? (
          <div className="page page--notes">
            <div className="page-heading">
              <div>
                <span className="pixel-eyebrow">BUKU CATATAN / {formatMonthLabel(month)}</span>
                <h1>Catatan <span className="text-gradient">uang</span></h1>
                <p>{monthItems.length} transaksi bulan ini. Ketuk catatan untuk mengubahnya.</p>
              </div>
              <button type="button" className="button button--primary button--add-desktop" onClick={openAdd}>
                <span className="button__icon"><PixelIcon name="plus" size={13} /></span>
                Catat uang
              </button>
            </div>
            <section className="panel">
              <TransactionList items={[...monthItems].sort((a, b) => (b.date || '').localeCompare(a.date || ''))} onEdit={openEdit} onDelete={handleDelete} />
            </section>
          </div>
        ) : (
          <Settings />
        )}
      </main>

      {tab !== 'settings' && (
        <button type="button" className="fab" onClick={openAdd} aria-label="Tambah catatan"><PixelIcon name="plus" size={24} /></button>
      )}

      <nav className="bottom-nav" aria-label="Navigasi bawah">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => setTab(item.id)}
          >
            <span className="bottom-nav__icon"><PixelIcon name={item.icon} size={19} /></span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <AddTransactionModal
        open={modalOpen}
        initial={editing}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
      />
      <Toast toast={toast} />
    </div>
  )
}
