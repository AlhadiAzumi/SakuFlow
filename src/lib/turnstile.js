const DEFAULT_SITE_KEY = '0x4AAAAAAGSwzM8hwj91anY-'

// Site key aman dipakai di browser. Secret key tetap tersimpan di Supabase
// pada Authentication → Attack Protection, dan tidak pernah masuk repo ini.
export const TURNSTILE_SITE_KEY = String(
  import.meta.env.VITE_TURNSTILE_SITE_KEY || DEFAULT_SITE_KEY
).trim()
