// Routing berbasis pathname asli, tanpa tanda pagar di URL.
// State internal aplikasi dan URL selalu dijaga sinkron dari sini.

export const SETTINGS_ROUTES = {
  hub: '/setelan',
  profil: '/setelan/profil',
  budget: '/setelan/budget',
  whatsapp: '/setelan/whatsapp',
  data: '/setelan/data',
}

const SETTINGS_PATHS = Object.fromEntries(
  Object.entries(SETTINGS_ROUTES).map(([page, path]) => [path, page]),
)

export function normalizePath(pathname = '') {
  const cleaned = String(pathname).replace(/\/+$/, '')
  return cleaned || '/'
}

export function routeFromPath(pathname = '') {
  const path = normalizePath(pathname)

  if (path === '/masuk') {
    return { view: 'landing', showAuth: true, tab: 'home', settingsPage: 'hub' }
  }
  if (path === '/dashboard') {
    return { view: 'dashboard', showAuth: false, tab: 'home', settingsPage: 'hub' }
  }
  if (path === '/catatan') {
    return { view: 'dashboard', showAuth: false, tab: 'notes', settingsPage: 'hub' }
  }
  if (path === '/setelan' || path.startsWith('/setelan/')) {
    return {
      view: 'dashboard',
      showAuth: false,
      tab: 'settings',
      settingsPage: SETTINGS_PATHS[path] || 'hub',
    }
  }

  return { view: 'landing', showAuth: false, tab: 'home', settingsPage: 'hub' }
}

export function buildPath({ view, showAuth, tab, settingsPage }) {
  if (view === 'landing') return showAuth ? '/masuk' : '/'
  if (tab === 'settings') return SETTINGS_ROUTES[settingsPage] || '/setelan'
  if (tab === 'notes') return '/catatan'
  return '/dashboard'
}

export function isProtectedPath(pathname = '') {
  const path = normalizePath(pathname)
  return path === '/dashboard'
    || path === '/catatan'
    || path === '/setelan'
    || path.startsWith('/setelan/')
}

export function navigate(path, { replace = false } = {}) {
  if (typeof window === 'undefined') return
  const next = normalizePath(path)
  // Tetap panggil replaceState bila path sama tapi masih ada sisa hash dari
  // Supabase OAuth atau tautan verifikasi email.
  if (window.location.pathname === next && !window.location.hash) return
  window.history[replace ? 'replaceState' : 'pushState']({ sakunode: true }, '', next)
}
