import { EXPENSE_CATEGORIES, getCategory } from './categories'
import { formatRupiah, shiftMonth, toDateKey } from './format'

export const getMonthTransactions = (transactions, monthKey) =>
  transactions.filter((tx) => String(tx.date || '').startsWith(monthKey))

export const summarize = (items) => {
  const income = items
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
  const expense = items
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
  return { income, expense, balance: income - expense }
}

export const expenseByCategory = (items) => {
  const totals = {}
  items.filter((tx) => tx.type === 'expense').forEach((tx) => {
    totals[tx.category] = (totals[tx.category] || 0) + (Number(tx.amount) || 0)
  })

  const total = Object.values(totals).reduce((sum, value) => sum + value, 0)
  return Object.entries(totals)
    .map(([id, amount]) => ({ ...getCategory('expense', id), amount }))
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({ ...item, pct: total > 0 ? (item.amount / total) * 100 : 0 }))
}

export const getTrend = (transactions, monthKey, count = 6) =>
  Array.from({ length: count }, (_, index) => {
    const key = shiftMonth(monthKey, index - (count - 1))
    const { income, expense } = summarize(getMonthTransactions(transactions, key))
    return { key, income, expense }
  })

export const getBudgetStatus = (monthItems, budgets = {}) => {
  const spent = {}
  monthItems.filter((tx) => tx.type === 'expense').forEach((tx) => {
    spent[tx.category] = (spent[tx.category] || 0) + (Number(tx.amount) || 0)
  })

  return Object.entries(budgets || {})
    .map(([id, limit]) => ({ id, limit: Math.max(0, Number(limit) || 0) }))
    .filter((item) => item.limit > 0)
    .map((item) => {
      const category = getCategory('expense', item.id)
      const used = spent[item.id] || 0
      const pct = (used / item.limit) * 100
      return {
        ...category,
        limit: item.limit,
        used,
        pct,
        remaining: item.limit - used,
        status: pct >= 100 ? 'over' : pct >= 80 ? 'warning' : 'safe',
      }
    })
    .sort((a, b) => b.pct - a.pct)
}

export const getSavingsProgress = (balance, target) => {
  const goal = Math.max(0, Number(target) || 0)
  const saved = Math.max(0, Number(balance) || 0)
  return {
    target: goal,
    saved,
    pct: goal > 0 ? Math.min(100, (saved / goal) * 100) : 0,
    reached: goal > 0 && saved >= goal,
  }
}

const expenseInRange = (transactions, from, to) =>
  transactions
    .filter((tx) => {
      if (tx.type !== 'expense') return false
      const key = String(tx.date || '')
      return key >= from && (!to || key < to)
    })
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

export const getInsight = (transactions, monthItems) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thisStart = new Date(today)
  thisStart.setDate(today.getDate() - 6)
  const prevStart = new Date(thisStart)
  prevStart.setDate(thisStart.getDate() - 7)

  const thisWeek = expenseInRange(transactions, toDateKey(thisStart))
  const lastWeek = expenseInRange(transactions, toDateKey(prevStart), toDateKey(thisStart))
  const categories = expenseByCategory(monthItems)
  const top = categories[0]

  let headline
  if (lastWeek > 0 && thisWeek > lastWeek) {
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    headline = `Pengeluaran 7 hari terakhir naik ${pct}% dibanding minggu sebelumnya. Yuk, cek kategori terbesarmu.`
  } else if (lastWeek > 0 && thisWeek < lastWeek) {
    const pct = Math.round(((lastWeek - thisWeek) / lastWeek) * 100)
    headline = `Kamu lebih hemat ${pct}% dalam 7 hari terakhir. Pertahankan!`
  } else if (thisWeek > 0) {
    headline = `Kamu mengeluarkan ${formatRupiah(thisWeek)} dalam 7 hari terakhir. Terus catat supaya polanya makin jelas.`
  } else {
    headline = 'Mulai catat pengeluaran harianmu, dan kami akan bantu lihat polanya.'
  }

  const detail = top
    ? `Kategori terbesar bulan ini: ${top.label} (${formatRupiah(top.amount)}, ${Math.round(top.pct)}% dari total pengeluaran).`
    : `Ada ${EXPENSE_CATEGORIES.length} kategori yang siap dipakai saat kamu mulai mencatat.`

  return { headline, detail, thisWeek, lastWeek, top }
}
