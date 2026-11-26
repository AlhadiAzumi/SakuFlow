import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import AddTransactionModal from './components/AddTransactionModal'
import AuthScreen from './components/AuthScreen'
import BudgetPanel from './components/BudgetPanel'
import CategoryBreakdown from './components/CategoryBreakdown'
import DashboardSidebar from './components/DashboardSidebar'
import InsightCard from './components/InsightCard'
import LandingPage from './components/LandingPage'
import LogoMark from './components/LogoMark'
import MoneyFlow from './components/MoneyFlow'
import PixelIcon from './components/PixelIcon'
import Reveal from './components/Reveal'
import SavingsCard from './components/SavingsCard'
import Settings from './components/Settings'
import SyncToast from './components/SyncToast'
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
import { currentMonthKey } from './lib/format'
import { DASHBOARD_TABS } from './lib/navigation'
import { buildPath, isProtectedPath, navigate, normalizePath, routeFromPath } from './lib/router'

const PromoPage = lazy(() => import('../animasi/PromoPage.tsx'))

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
    mode, user, authLoading, dataLoading, transactions, lastSyncedTx, settings, profile, toast,
    addTransaction, updateTransaction, deleteTransaction, showToast,
  } = useApp()

  const initialRoute = useMemo(
    () => routeFromPath(typeof window === 'undefined' ? '/' : window.location.pathname),
    [],
  )
  const [tab, setTab] = useState(initialRoute.tab)
  const [settingsPage, setSettingsPage] = useState(initialRoute.settingsPage)
  const [view, setView] = useState(initialRoute.view)
  const [showAuth, setShowAuth] = useState(initialRoute.showAuth)
  const [month, setMonth] = useState(currentMonthKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [syncTick, setSyncTick] = useState(Date.now())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isLoggedIn = mode === 'local' || Boolean(user)

  const monthItems = useMemo(() => getMonthTransactions(transactions, month), [transactions, month])
  const summary = useMemo(() => summarize(monthItems), [monthItems])
  const categories = useMemo(() => expenseByCategory(monthItems), [monthItems])
  const trend = useMemo(() => getTrend(transactions, month), [transactions, month])
  const insight = useMemo(() => getInsight(transactions, monthItems), [transactions, monthItems])
  const budgetStatus = useMemo(() => getBudgetStatus(monthItems, settings.budgets), [monthItems, settings.budgets])
  const savingsProgress = useMemo(() => getSavingsProgress(summary.savings, settings.savingsTarget), [summary.savings, settings.savingsTarget])
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

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [sidebarOpen])

  const pathname = typeof window !== 'undefined' ? normalizePath(window.location.pathname) : '/'
  const isPromoPath = pathname === '/promo'

  // Tombol back/forward browser ikut mengubah halaman yang aktif.
  useEffect(() => {
    const syncFromLocation = () => {
      const next = routeFromPath(window.location.pathname)
      setTab(next.tab)
      setSettingsPage(next.settingsPage)
      setView(next.view)
      setShowAuth(next.showAuth)
    }
    window.addEventListener('popstate', syncFromLocation)
    return () => window.removeEventListener('popstate', syncFromLocation)
  }, [])

  // Setiap perpindahan halaman internal tercermin sebagai pathname bersih.
  useEffect(() => {
    if (isPromoPath) return
    const next = buildPath({ view, showAuth, tab, settingsPage })
    if (normalizePath(window.location.pathname) !== next) navigate(next)
  }, [view, showAuth, tab, settingsPage, isPromoPath])

  // Halaman dashboard hanya boleh dibuka oleh pengguna yang sudah masuk.
  useEffect(() => {
    if (authLoading || isPromoPath) return
    const current = normalizePath(window.location.pathname)
    if (!isLoggedIn && isProtectedPath(current)) {
      navigate('/', { replace: true })
      setTab('home')
      setSettingsPage('hub')
      setView('landing')
      setShowAuth(false)
    } else if (isLoggedIn && (current === '/' || current === '/masuk')) {
      // Login dari landing, /masuk, OAuth, atau tautan email harus langsung
      // mendarat di dashboard. Path '/dashboard' juga menghapus sisa '#' di URL.
      navigate('/dashboard', { replace: true })
      setTab('home')
      setSettingsPage('hub')
      setView('dashboard')
      setShowAuth(false)
    }
  }, [authLoading, isLoggedIn, isPromoPath])

  if (isPromoPath) {
    return (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#090D16', color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>Menyiapkan animasi…</div>}>
        <PromoPage />
      </Suspense>
    )
  }

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

  const switchTab = (next, nextSettingsPage = 'hub') => {
    setTab(next)
    setSettingsPage(nextSettingsPage)
    setSidebarOpen(false)
  }

  const openAdd = () => {
    setEditing(null)
    setSidebarOpen(false)
    setModalOpen(true)
  }

  const openEdit = (tx) => {
    setEditing(tx)
    setSidebarOpen(false)
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
  const displayName = profile.username
    || (mode === 'local' ? 'teman' : firstName.charAt(0).toUpperCase() + firstName.slice(1))

  return (
    <div className={`app-shell pixel-app dash-shell${sidebarOpen ? ' is-sidebar-open' : ''}`}>
      <DashboardSidebar
        open={sidebarOpen}
        tab={tab}
        onTab={switchTab}
        month={month}
        onMonth={setMonth}
        mode={mode}
        displayName={displayName}
        email={user?.email || ''}
        avatar={profile.avatar}
        onOpenAdd={openAdd}
        onOpenProfile={() => switchTab('settings', 'profil')}
        onHome={() => { setView('landing'); setSidebarOpen(false) }}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dash-workspace">
        <header className="app-header dash-topbar">
          <div className="app-header__inner">
            <button
              type="button"
              className="dash-menu-button"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-controls="dashboard-sidebar"
              aria-expanded={sidebarOpen}
            >
              <PixelIcon name={sidebarOpen ? 'close' : 'menu'} size={16} />
              <span>{sidebarOpen ? 'Tutup' : 'Menu'}</span>
            </button>

            <button type="button" className="brand" onClick={() => setView('landing')} title="Lihat halaman utama Sakunode">
              <span className="brand-mark"><LogoMark className="h-full w-full rounded-[10px]" /></span>
              <span className="brand__text">
                <strong>Sakunode</strong>
                <small>Catatan uang harian</small>
              </span>
            </button>

            <div className="header-actions">
              <button
                type="button"
                className="user-chip"
                onClick={() => switchTab('settings', 'profil')}
                title="Buka profil & setelan"
                aria-label="Buka profil & setelan"
              >
                {profile.avatar
                  ? <img src={profile.avatar} alt="" />
                  : mode === 'cloud' ? displayName.charAt(0).toUpperCase() : <PixelIcon name="house" size={14} />}
              </button>
            </div>
          </div>
        </header>

        <main className="app-main dash-main">
          {dataLoading && mode === 'cloud' ? (
            <LoadingScreen />
          ) : tab === 'home' ? (
            <div className="page page--home">
              <div className="page-heading dash-intro">
                <div>
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
                    <strong>Mulai dari satu catatan.</strong>
                    <p>Catat uang pertamamu untuk melihat peta uangmu.</p>
                  </div>
                  <button type="button" className="button button--primary" onClick={openAdd}>Catat sekarang</button>
                </div>
              )}

              <SummaryCards income={summary.income} expense={summary.expense} savings={summary.savings} balance={summary.balance} />

              {overBudget.length > 0 && (
                <div className="alert-banner alert-banner--danger" role="status">
                  <span className="alert-banner__icon"><PixelIcon name="alert" size={20} /></span>
                  <p>
                    <strong>{overBudget.length} kategori melewati budget:</strong>{' '}
                    {overBudget.map((item) => item.label).join(', ')}.
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

              <div className="dash-card-grid">
                <Reveal className="dash-span-2" delay={60}>
                  <section className="panel panel--flow">
                    <MoneyFlow income={summary.income} expenses={categories} savings={summary.savings} savingsTarget={settings.savingsTarget} />
                  </section>
                </Reveal>

                <Reveal delay={100}><SavingsCard progress={savingsProgress} onOpenSettings={() => switchTab('settings', 'budget')} /></Reveal>

                <Reveal delay={140}><BudgetPanel budgets={budgetStatus} onOpenSettings={() => switchTab('settings', 'budget')} /></Reveal>

                <Reveal delay={180}><InsightCard insight={insight} /></Reveal>

                <Reveal delay={60}>
                  <section className="panel h-full">
                    <h2 className="panel__title">Naik turun uangmu</h2>
                    <TrendChart trend={trend} />
                  </section>
                </Reveal>

                <Reveal delay={120}>
                  <section className="panel h-full">
                    <h2 className="panel__title">Pengeluaran terbesar</h2>
                    <CategoryBreakdown categories={categories} />
                  </section>
                </Reveal>

                <Reveal className="dash-span-2" delay={100}>
                  <section className="panel">
                    <div className="panel__header-row">
                      <div>
                        <h2 className="panel__title">Catatan terakhir</h2>
                      </div>
                      <button type="button" className="link-button" onClick={() => switchTab('notes')}>Lihat semua <PixelIcon name="arrow-right" size={14} /></button>
                    </div>
                    <TransactionList items={[...monthItems].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5)} onEdit={openEdit} onDelete={handleDelete} compact />
                  </section>
                </Reveal>
              </div>
            </div>
          ) : tab === 'notes' ? (
            <div className="page page--notes">
              <div className="page-heading dash-intro">
                <div>
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
            <Settings page={settingsPage} onPage={setSettingsPage} />
          )}
        </main>
      </div>

      {tab !== 'settings' && (
        <button type="button" className="fab" onClick={openAdd} aria-label="Tambah catatan"><PixelIcon name="plus" size={24} /></button>
      )}

      <nav className="bottom-nav" aria-label="Navigasi bawah">
        {DASHBOARD_TABS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => switchTab(item.id)}
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
      <SyncToast tx={lastSyncedTx} tick={syncTick} />
    </div>
  )
}
