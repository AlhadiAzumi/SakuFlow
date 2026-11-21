import { useMemo, useState } from 'react'
import AddTransactionModal from './components/AddTransactionModal'
import AuthScreen from './components/AuthScreen'
import BudgetPanel from './components/BudgetPanel'
import CategoryBreakdown from './components/CategoryBreakdown'
import InsightCard from './components/InsightCard'
import MoneyFlow from './components/MoneyFlow'
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
import { currentMonthKey, formatMonthLabel, shiftMonth } from './lib/format'

const TABS = [
  { id: 'home', label: 'Beranda', icon: '⌂' },
  { id: 'notes', label: 'Catatan', icon: '≡' },
  { id: 'settings', label: 'Setelan', icon: '⚙' },
]

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-screen__mark">💸</div>
      <div className="loading-screen__spinner" />
      <p>Menyiapkan catatanmu…</p>
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast toast--${toast.tone}`} role="status" key={toast.id}>
      <span>{toast.tone === 'error' ? '⚠️' : '✓'}</span>
      {toast.message}
    </div>
  )
}

export default function App() {
  const {
    mode, user, authLoading, dataLoading, transactions, settings, toast,
    addTransaction, updateTransaction, deleteTransaction, showToast,
  } = useApp()

  const [tab, setTab] = useState('home')
  const [month, setMonth] = useState(currentMonthKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const monthItems = useMemo(() => getMonthTransactions(transactions, month), [transactions, month])
  const summary = useMemo(() => summarize(monthItems), [monthItems])
  const categories = useMemo(() => expenseByCategory(monthItems), [monthItems])
  const trend = useMemo(() => getTrend(transactions, month), [transactions, month])
  const insight = useMemo(() => getInsight(transactions, monthItems), [transactions, monthItems])
  const budgetStatus = useMemo(() => getBudgetStatus(monthItems, settings.budgets), [monthItems, settings.budgets])
  const savingsProgress = useMemo(() => getSavingsProgress(summary.balance, settings.savingsTarget), [summary.balance, settings.savingsTarget])
  const overBudget = budgetStatus.filter((item) => item.status === 'over')
  const nearBudget = budgetStatus.filter((item) => item.status === 'warning')

  if (authLoading) return <LoadingScreen />

  if (mode === 'cloud' && !user) {
    return (
      <>
        <AuthScreen />
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
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <button type="button" className="brand" onClick={() => setTab('home')}>
            <span className="brand-mark">💸</span>
            <span className="brand__text">
              <strong>Catatan Uang</strong>
              <small>Harian</small>
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
                {item.label}
              </button>
            ))}
          </nav>

          <div className="header-actions">
            {mode === 'cloud' && (
              <span className="live-badge" title="Data tersinkron langsung"><i /> Live</span>
            )}
            <div className="month-switcher">
              <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya">‹</button>
              <span>{formatMonthLabel(month)}</span>
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(month, 1))}
                disabled={month >= currentMonthKey()}
                aria-label="Bulan berikutnya"
              >›</button>
            </div>
            <div className="user-chip" title={mode === 'cloud' ? user?.email : 'Mode lokal'}>
              {mode === 'cloud' ? displayName.charAt(0).toUpperCase() : '⌂'}
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {dataLoading && mode === 'cloud' ? (
          <LoadingScreen />
        ) : tab === 'home' ? (
          <div className="page page--home">
            <div className="page-heading">
              <div>
                <span className="eyebrow">{formatMonthLabel(month).toUpperCase()}</span>
                <h1>Halo, {displayName} 👋</h1>
                <p>Yuk lihat ke mana uangmu pergi bulan ini.</p>
              </div>
              <button type="button" className="button button--primary button--add-desktop" onClick={openAdd}>
                + Catat uang
              </button>
            </div>

            {transactions.length === 0 && (
              <div className="welcome-banner">
                <span className="welcome-banner__icon">🌱</span>
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
                <span>🚨</span>
                <p>
                  <strong>{overBudget.length} kategori sudah melewati budget:</strong>{' '}
                  {overBudget.map((item) => `${item.emoji} ${item.label}`).join(', ')}. Cek pengeluaranmu, ya.
                </p>
              </div>
            )}
            {overBudget.length === 0 && nearBudget.length > 0 && (
              <div className="alert-banner alert-banner--warning" role="status">
                <span>⚠️</span>
                <p>
                  <strong>Hati-hati, budget hampir habis:</strong>{' '}
                  {nearBudget.map((item) => `${item.emoji} ${item.label} (${Math.round(item.pct)}%)`).join(', ')}.
                </p>
              </div>
            )}

            <section className="panel panel--flow">
              <MoneyFlow income={summary.income} expenses={categories} savingsTarget={settings.savingsTarget} />
            </section>

            <SavingsCard progress={savingsProgress} onOpenSettings={() => setTab('settings')} />

            <BudgetPanel budgets={budgetStatus} onOpenSettings={() => setTab('settings')} />

            <InsightCard insight={insight} />

            <div className="grid-2">
              <section className="panel">
                <span className="eyebrow">TREN 6 BULAN</span>
                <h2 className="panel__title">Naik turun uangmu</h2>
                <TrendChart trend={trend} />
              </section>
              <section className="panel">
                <span className="eyebrow">PER KATEGORI</span>
                <h2 className="panel__title">Pengeluaran terbesar</h2>
                <CategoryBreakdown categories={categories} />
              </section>
            </div>

            <section className="panel">
              <div className="panel__header-row">
                <div>
                  <span className="eyebrow">TERBARU</span>
                  <h2 className="panel__title">Catatan terakhir</h2>
                </div>
                <button type="button" className="link-button" onClick={() => setTab('notes')}>Lihat semua →</button>
              </div>
              <TransactionList items={[...monthItems].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5)} onEdit={openEdit} onDelete={handleDelete} compact />
            </section>
          </div>
        ) : tab === 'notes' ? (
          <div className="page page--notes">
            <div className="page-heading">
              <div>
                <span className="eyebrow">{formatMonthLabel(month).toUpperCase()}</span>
                <h1>Catatan uang</h1>
                <p>{monthItems.length} transaksi bulan ini. Ketuk catatan untuk mengubahnya.</p>
              </div>
              <button type="button" className="button button--primary button--add-desktop" onClick={openAdd}>
                + Catat uang
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
        <button type="button" className="fab" onClick={openAdd} aria-label="Tambah catatan">+</button>
      )}

      <nav className="bottom-nav" aria-label="Navigasi bawah">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => setTab(item.id)}
          >
            <span className="bottom-nav__icon">{item.icon}</span>
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
