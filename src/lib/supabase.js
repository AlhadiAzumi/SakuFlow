import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const isCloudMode = Boolean(url && anonKey)

export const supabase = isCloudMode
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

// Endpoint settings Supabase bersifat publik (memakai anon key) dan dipakai
// hanya untuk mendeteksi apakah provider Google sudah diaktifkan di dashboard.
export async function fetchAuthSettings() {
  if (!isCloudMode) return null
  try {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } })
    if (!response.ok) return null
    const data = await response.json()
    return {
      googleEnabled: Boolean(data?.external?.google),
      mailerAutoconfirm: Boolean(data?.mailer_autoconfirm),
      disableSignup: Boolean(data?.disable_signup),
    }
  } catch {
    return null
  }
}
