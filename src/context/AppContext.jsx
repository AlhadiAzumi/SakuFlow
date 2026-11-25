import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCategory, isSavingsTx } from '../lib/categories'
import { formatRupiah } from '../lib/format'
import { isCloudMode, supabase } from '../lib/supabase'

const STORAGE_KEY = 'catatan-uang:transactions:v1'
const SETTINGS_KEY = 'catatan-uang:settings:v1'
const PROFILE_KEY = 'catatan-uang:profiles:v1'

const defaultSettings = { budgets: {}, savingsTarget: 0 }
const defaultProfile = { username: '', avatar: '' }

export const AppContext = createContext(null)

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const readLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeLocal = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage bisa penuh atau diblokir; aplikasi tetap jalan di memori.
  }
}

const readSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object') return defaultSettings
    return {
      budgets: parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : {},
      savingsTarget: Math.max(0, Number(parsed.savingsTarget) || 0),
    }
  } catch {
    return defaultSettings
  }
}

const writeSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Abaikan kegagalan penyimpanan; state tetap dipakai di memori.
  }
}

const readProfiles = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const readProfile = (key) => {
  const profile = readProfiles()[key]
  return {
    username: typeof profile?.username === 'string' ? profile.username : '',
    avatar: typeof profile?.avatar === 'string' ? profile.avatar : '',
  }
}

const writeProfile = (key, profile) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...readProfiles(), [key]: profile }))
  } catch {
    // Foto profil bisa saja terlalu besar untuk localStorage; state tetap dipakai.
  }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(isCloudMode)
  const [transactions, setTransactions] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [settings, setSettings] = useState(defaultSettings)
  const [profile, setProfile] = useState(defaultProfile)
  const [toast, setToast] = useState(null)
  const [lastSyncedTx, setLastSyncedTx] = useState(null)

  // Id yang dibuat/dihapus lewat web tidak perlu memicu toast realtime dobel.
  const localInsertIds = useRef(new Set())
  const localDeleteIds = useRef(new Set())
  const rememberLocalId = useCallback((ref, id) => {
    if (!id) return
    ref.current.add(id)
    setTimeout(() => ref.current.delete(id), 15000)
  }, [])

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!isCloudMode) {
      setSession({ user: { id: 'local', email: 'Perangkat ini' } })
      setAuthLoading(false)
      setTransactions(readLocal())
      setSettings(readSettings())
      setDataLoading(false)
      return undefined
    }

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setAuthLoading(false)
    }).catch(() => {
      if (!active) return
      setAuthLoading(false)
      showToast('Gagal memuat sesi login.', 'error')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [showToast])

  const userId = session?.user?.id

  // Nama & foto profil tersimpan di metadata akun Supabase. Cache lokal dipakai
  // untuk mode lokal dan sebagai fallback kalau metadata belum tersedia.
  const metadataName = session?.user?.user_metadata?.display_name
  const metadataAvatar = session?.user?.user_metadata?.avatar_url
  useEffect(() => {
    const key = userId || 'local'
    const cached = readProfile(key)
    setProfile(userId
      ? {
          username: typeof metadataName === 'string' && metadataName.trim() ? metadataName : cached.username,
          avatar: typeof metadataAvatar === 'string' && metadataAvatar ? metadataAvatar : cached.avatar,
        }
      : cached)
  }, [userId, metadataName, metadataAvatar])

  useEffect(() => {
    if (!userId) {
      if (isCloudMode) setTransactions([])
      setLastSyncedTx(null)
      setDataLoading(false)
      return undefined
    }
    if (!isCloudMode) {
      setTransactions(readLocal())
      setLastSyncedTx(null)
      setDataLoading(false)
      return undefined
    }

    let active = true
    let channel
    setDataLoading(true)
    setLastSyncedTx(null)
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          showToast('Gagal memuat catatan: ' + error.message, 'error')
        } else {
          const items = data || []
          setTransactions(items)
          // Kalau user baru saja kirim chat sebelum web dibuka, event realtime
          // sudah terlewat. Ambil transaksi terbaru (maks. 24 jam) sebagai
          // konfirmasi "Sinkron terakhir" saat halaman pertama dibuka.
          const latest = items[0]
          const age = latest ? Date.now() - new Date(latest.created_at || latest.date).getTime() : Infinity
          if (latest && age <= 24 * 60 * 60 * 1000) {
            setLastSyncedTx({
              id: latest.id,
              amount: latest.amount,
              type: latest.type,
              note: latest.note || '',
              receivedAt: latest.created_at || new Date().toISOString(),
            })
          }
        }
        setDataLoading(false)
      })

    // Realtime: perubahan dari web, bot WhatsApp, atau tool lain langsung muncul di sini.
    channel = supabase
      .channel(`tx-live-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (!active) return

        if (payload.eventType === 'INSERT') {
          const tx = payload.new
          setTransactions((prev) => prev.some((item) => item.id === tx.id)
            ? prev
            : [tx, ...prev])
          setLastSyncedTx({
            id: tx.id,
            amount: tx.amount,
            type: tx.type,
            note: tx.note || '',
            receivedAt: tx.created_at || new Date().toISOString(),
          })
          if (!localInsertIds.current.has(tx.id)) {
            const label = isSavingsTx(tx) ? 'Tabungan' : tx.type === 'income' ? 'Masuk' : 'Keluar'
            showToast(`Catatan baru masuk: ${label} ${formatRupiah(tx.amount)}`)
          }
          localInsertIds.current.delete(tx.id)
        } else if (payload.eventType === 'UPDATE') {
          setTransactions((prev) => prev.map((item) => (item.id === payload.new.id ? payload.new : item)))
        } else if (payload.eventType === 'DELETE' && payload.old?.id) {
          const id = payload.old.id
          setTransactions((prev) => prev.filter((item) => item.id !== id))
          setLastSyncedTx((prev) => (prev?.id === id ? null : prev))
          if (!localDeleteIds.current.has(id)) showToast('Catatan terakhir dihapus')
          localDeleteIds.current.delete(id)
        }
      })
      .subscribe()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, showToast, rememberLocalId])

  useEffect(() => {
    if (!isCloudMode || !userId) return undefined
    let active = true
    supabase
      .from('user_settings')
      .select('budgets, savings_target')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          showToast('Gagal memuat pengaturan: ' + error.message, 'error')
          return
        }
        setSettings({
          budgets: data?.budgets && typeof data.budgets === 'object' ? data.budgets : {},
          savingsTarget: Math.max(0, Number(data?.savings_target) || 0),
        })
      })
    return () => { active = false }
  }, [userId, showToast])

  const updateSettings = useCallback(async (patch) => {
    const next = { ...settings, ...patch }
    next.savingsTarget = Math.max(0, Math.round(Number(next.savingsTarget) || 0))
    next.budgets = Object.fromEntries(
      Object.entries(next.budgets || {})
        .map(([key, value]) => [key, Math.max(0, Math.round(Number(value) || 0))])
        .filter(([, value]) => value > 0),
    )

    if (isCloudMode) {
      const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        budgets: next.budgets,
        savings_target: next.savingsTarget,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
    } else {
      writeSettings(next)
    }
    setSettings(next)
    return next
  }, [settings, userId])

  const updateProfile = useCallback(async (patch) => {
    const username = String(patch?.username ?? '').trim().slice(0, 24)
    if (!username) throw new Error('Nama profil tidak boleh kosong.')
    const next = { username, avatar: typeof patch?.avatar === 'string' ? patch.avatar : '' }

    if (isCloudMode && userId) {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: next.username, avatar_url: next.avatar || null },
      })
      if (error) throw error
    }
    writeProfile(userId || 'local', next)
    setProfile(next)
    return next
  }, [userId])

  const buildRecord = useCallback((payload) => ({
    id: createId(),
    user_id: userId || 'local',
    type: payload.type === 'income' ? 'income' : 'expense',
    amount: Math.max(0, Math.round(Number(payload.amount) || 0)),
    category: payload.category || 'lainnya',
    note: (payload.note || '').trim(),
    date: payload.date,
    created_at: new Date().toISOString(),
  }), [userId])

  const addTransaction = useCallback(async (payload) => {
    const record = buildRecord(payload)
    if (isCloudMode) {
      // Tandai dulu supaya event INSERT realtime tidak memunculkan toast dobel.
      rememberLocalId(localInsertIds, record.id)
      const { data, error } = await supabase.from('transactions').insert(record).select().single()
      if (error) {
        localInsertIds.current.delete(record.id)
        throw error
      }
      setTransactions((prev) => [data, ...prev])
      return data
    }
    setTransactions((prev) => {
      const next = [record, ...prev]
      writeLocal(next)
      return next
    })
    return record
  }, [buildRecord, rememberLocalId])

  const updateTransaction = useCallback(async (id, payload) => {
    const patch = {
      type: payload.type === 'income' ? 'income' : 'expense',
      amount: Math.max(0, Math.round(Number(payload.amount) || 0)),
      category: payload.category || 'lainnya',
      note: (payload.note || '').trim(),
      date: payload.date,
    }
    if (isCloudMode) {
      const { data, error } = await supabase.from('transactions').update(patch).eq('id', id).select().single()
      if (error) throw error
      setTransactions((prev) => prev.map((item) => (item.id === id ? data : item)))
      return data
    }
    setTransactions((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      writeLocal(next)
      return next
    })
    return patch
  }, [])

  const deleteTransaction = useCallback(async (id) => {
    if (isCloudMode) {
      rememberLocalId(localDeleteIds, id)
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) {
        localDeleteIds.current.delete(id)
        throw error
      }
    }
    setTransactions((prev) => {
      const next = prev.filter((item) => item.id !== id)
      if (!isCloudMode) writeLocal(next)
      return next
    })
    setLastSyncedTx((prev) => (prev?.id === id ? null : prev))
  }, [rememberLocalId])

  const signIn = useCallback(async (email, password, captchaToken = '') => {
    if (!isCloudMode) return
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email, password, displayName = '', captchaToken = '') => {
    if (!isCloudMode) return { needsConfirmation: false }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName.trim().slice(0, 24) } : {},
        emailRedirectTo: window.location.origin,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    if (error) throw error
    // Tanpa sesi berarti Supabase masih meminta verifikasi email.
    return { needsConfirmation: !data?.session }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isCloudMode) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!isCloudMode) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const exportData = useCallback(async () => {
    const typeLabel = (tx) => isSavingsTx(tx) ? 'Tabungan' : tx.type === 'income' ? 'Masuk' : 'Keluar'
    const categoryLabel = (tx) => getCategory(tx.type, tx.category).label

    const sheets = [
      {
        name: 'Transaksi',
        rows: [
          ['Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Catatan', 'Sumber', 'ID'],
          ...transactions
            .filter((tx) => !isSavingsTx(tx))
            .map((tx) => [
              tx.date || '',
              typeLabel(tx),
              categoryLabel(tx),
              Math.max(0, Number(tx.amount) || 0),
              tx.note || '',
              tx.source || 'web',
              tx.id || '',
            ]),
        ],
      },
      {
        name: 'Tabungan',
        rows: [
          ['Tanggal', 'Nominal', 'Catatan', 'Sumber', 'ID'],
          ...transactions
            .filter(isSavingsTx)
            .map((tx) => [
              tx.date || '',
              Math.max(0, Number(tx.amount) || 0),
              tx.note || '',
              tx.source || 'web',
              tx.id || '',
            ]),
        ],
      },
      {
        name: 'Budget',
        rows: [
          ['Jenis', 'Kategori', 'Nominal'],
          ...Object.entries(settings.budgets || {})
            .map(([id, value]) => [
              'Budget',
              getCategory('expense', id).label,
              Math.max(0, Number(value) || 0),
            ]),
          ['Target tabungan', 'Per bulan', Math.max(0, Number(settings.savingsTarget) || 0)],
        ],
      },
      {
        name: 'Profil',
        rows: [
          ['Kolom', 'Nilai'],
          ['Nama', profile.username || ''],
          ['Email', session?.user?.email || ''],
          ['Mode', isCloudMode ? 'Cloud' : 'Lokal'],
          ['Jumlah transaksi', transactions.length],
          ['Diekspor pada', new Date().toLocaleString('id-ID')],
        ],
      },
    ]

    try {
      // JSZip hanya dimuat saat user benar-benar mengunduh, supaya bundle awal tetap ringan.
      const { buildWorkbookBlob } = await import('../lib/exportExcel')
      const blob = await buildWorkbookBlob(sheets)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `catatan-uang-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showToast('Data berhasil diunduh sebagai Excel.')
    } catch (error) {
      showToast(error?.message || 'Gagal membuat file Excel.', 'error')
    }
  }, [transactions, settings, profile, session?.user?.email, showToast])

  const clearLocalData = useCallback(() => {
    writeLocal([])
    writeSettings(defaultSettings)
    setTransactions([])
    setSettings(defaultSettings)
    showToast('Semua catatan & pengaturan di perangkat ini dihapus.')
  }, [showToast])

  const value = useMemo(() => ({
    mode: isCloudMode ? 'cloud' : 'local',
    user: session?.user || null,
    authLoading,
    dataLoading,
    transactions,
    lastSyncedTx,
    settings,
    updateSettings,
    profile,
    updateProfile,
    toast,
    showToast,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    exportData,
    clearLocalData,
  }), [
    authLoading, dataLoading, transactions, lastSyncedTx, settings, updateSettings, profile, updateProfile, toast, showToast,
    addTransaction, updateTransaction, deleteTransaction,
    signIn, signUp, signInWithGoogle, signOut, exportData, clearLocalData,
    session?.user,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

