import { useEffect, useRef, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { TURNSTILE_SITE_KEY } from '../lib/turnstile'
import PixelIcon from './PixelIcon'
import { useApp } from '../context/useApp'
import {
  clearLoginFailures,
  formatWait,
  getLoginLock,
  isCredentialError,
  LOGIN_WINDOW_LABEL,
  recordFailedLogin,
} from '../lib/loginGuard'
import { fetchAuthSettings } from '../lib/supabase'
import LogoMark from './LogoMark'

const COPY = {
  signin: {
    title: 'Selamat datang kembali',
    desc: 'Masuk untuk melihat peta uangmu dan lanjut mencatat.',
    action: 'Masuk ke akun',
  },
  signup: {
    title: 'Buat akun baru',
    desc: 'Mulai catat pemasukan dan pengeluaran. Gratis, tanpa kartu kredit.',
    action: 'Buat akun',
  },
}

function friendlyError(error) {
  const text = String(error?.message || error || '')
  const lower = text.toLowerCase()
  if (lower.includes('captcha') || lower.includes('turnstile')) return 'Verifikasi keamanan gagal. Tunggu sebentar lalu coba lagi.'
  if (lower.includes('invalid login credentials')) return 'Email atau kata sandi salah. Coba lagi, atau daftar dulu kalau belum punya akun.'
  if (lower.includes('email not confirmed')) return 'Email belum terverifikasi. Buka tautan verifikasi di inbox kamu (cek juga folder Spam).'
  if (lower.includes('already registered') || lower.includes('user already exists')) return 'Email ini sudah terdaftar. Silakan masuk.'
  if (lower.includes('password should be at least') || lower.includes('weak password')) return 'Kata sandi minimal 6 karakter.'
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) return 'Login Google belum diaktifkan di Supabase. Ikuti panduan singkat di bawah tombol.'
  if (lower.includes('redirect') && (lower.includes('not allowed') || lower.includes('invalid'))) return 'URL redirect belum diizinkan. Tambahkan alamat website ini di Supabase → Authentication → URL Configuration.'
  return text || 'Autentikasi gagal. Coba lagi.'
}

export default function AuthScreen({ onBack }) {
  const { signIn, signUp, signInWithGoogle, mode: appMode } = useApp()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [googleEnabled, setGoogleEnabled] = useState(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef(null)
  const needsCaptcha = appMode === 'cloud'
  const [loginLock, setLoginLock] = useState(() => getLoginLock(email))

  useEffect(() => {
    setLoginLock(getLoginLock(email))
  }, [email])

  useEffect(() => {
    if (!loginLock.locked) return undefined
    const timer = window.setTimeout(() => {
      setLoginLock(getLoginLock(email))
    }, Math.min(Math.max(loginLock.remainingMs, 0) + 50, 1000))
    return () => window.clearTimeout(timer)
  }, [email, loginLock])

  useEffect(() => {
    let active = true
    fetchAuthSettings().then((settings) => {
      if (active) setGoogleEnabled(settings ? settings.googleEnabled : null)
    })
    return () => { active = false }
  }, [])

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setNotice('')
    setSentEmail('')
    setConfirmPassword('')
    setCaptchaToken('')
    turnstileRef.current?.reset()
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('Nama tampilan minimal 2 karakter.')
        return
      }
      if (password.length < 6) {
        setError('Kata sandi minimal 6 karakter.')
        return
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi kata sandi belum sama.')
        return
      }
    } else {
      const guard = getLoginLock(email)
      setLoginLock(guard)
      if (guard.locked) {
        setError('Terlalu banyak percobaan gagal. Tunggu sebentar sebelum mencoba lagi.')
        return
      }
      if (password.length < 6) {
        setError('Kata sandi minimal 6 karakter.')
        return
      }
    }

    if (needsCaptcha && !captchaToken) {
      setError('Verifikasi keamanan belum selesai. Tunggu sebentar lalu coba lagi.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, name, captchaToken)
        if (result?.needsConfirmation) {
          setSentEmail(email)
        } else {
          setNotice('Akun berhasil dibuat. Selamat datang di Sakunode!')
        }
      } else {
        await signIn(email, password, captchaToken)
        clearLoginFailures(email)
        setLoginLock(getLoginLock(email))
      }
    } catch (err) {
      if (mode === 'signin' && isCredentialError(err)) {
        const next = recordFailedLogin(email)
        setLoginLock(next)
        if (next.locked) {
          setError('Terlalu banyak percobaan gagal. Akun ini dikunci sementara.')
        } else {
          setError(`${friendlyError(err)} Sisa ${next.attemptsLeft} percobaan dalam ${LOGIN_WINDOW_LABEL}.`)
        }
      } else {
        setError(friendlyError(err))
      }
    } finally {
      turnstileRef.current?.reset()
      setCaptchaToken('')
      setLoading(false)
    }
  }

  const google = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(friendlyError(err))
      setLoading(false)
    }
  }

  const copy = COPY[mode]
  const isLocked = mode === 'signin' && loginLock.locked

  return (
    <div className="auth-page pixel-app">
      {onBack && (
        <button type="button" onClick={onBack} className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[12px] font-bold text-slate-600 shadow-sm backdrop-blur transition hover:text-blue-700">
          <PixelIcon name="arrow-left" size={14} /> Kembali ke beranda
        </button>
      )}
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="brand-mark"><LogoMark className="h-full w-full rounded-[10px]" /></span>
          <div>
            <strong>Sakunode</strong>
            <small>Catat cepat, arah uang jelas</small>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Jenis akses">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth-tab${mode === 'signin' ? ' is-active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            <PixelIcon name="house" size={14} /> Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab${mode === 'signup' ? ' is-active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            <PixelIcon name="user" size={14} /> Daftar
          </button>
        </div>

        <div className="auth-card__intro">
          <h1>{copy.title}</h1>
          <p>{copy.desc}</p>
        </div>

        {sentEmail ? (
          <div className="auth-success" role="status">
            <span className="auth-success__icon"><PixelIcon name="check" size={20} /></span>
            <h2>Cek emailmu dulu</h2>
            <p>
              Kami kirim tautan verifikasi ke <strong>{sentEmail}</strong>. Buka tautan itu, lalu masuk dengan email dan kata sandimu.
            </p>
            <small>Cek folder Spam kalau email tidak muncul dalam beberapa menit.</small>
            <button type="button" className="button button--outline button--full" onClick={() => switchMode('signin')}>
              Sudah verifikasi? Masuk sekarang
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-card__form">
            {mode === 'signup' && (
              <label className="field">
                <span className="field__label">Nama tampilan</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama panggilanmu" maxLength={24} required />
                <small className="field__hint">Tampil di dashboard. Boleh beda dari email.</small>
              </label>
            )}
            <label className="field">
              <span className="field__label">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" required />
            </label>
            <label className="field">
              <span className="field__label">Kata sandi</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
            </label>
            {mode === 'signup' && (
              <label className="field">
                <span className="field__label">Ulangi kata sandi</span>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Tulis ulang kata sandi" autoComplete="new-password" required />
              </label>
            )}
            {needsCaptcha && (
              <div className="auth-captcha">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken('')}
                  onError={() => {
                    setCaptchaToken('')
                    setError('Verifikasi keamanan gagal dimuat. Periksa koneksi lalu muat ulang halaman.')
                  }}
                  options={{ theme: 'light', size: 'flexible' }}
                />
                <small className="field__hint">Verifikasi otomatis, tanpa perlu menjawab tebakan.</small>
              </div>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="form-notice" role="status">{notice}</p>}
            {mode === 'signin' && loginLock.count > 0 && (
              <p className="auth-lock-note" role="status" aria-live="polite">
                {isLocked
                  ? `Pembatasan aktif. Bisa coba lagi dalam ${formatWait(loginLock.remainingMs)}.`
                  : `Sisa ${loginLock.attemptsLeft} percobaan dalam ${LOGIN_WINDOW_LABEL}.`}
              </p>
            )}
            <button
              type="submit"
              className="button button--primary button--full"
              disabled={loading || isLocked || (needsCaptcha && !captchaToken)}
            >
              {isLocked ? 'Dikunci sementara' : loading ? 'Tunggu…' : copy.action}
              <span className="button__icon"><PixelIcon name="arrow-up-right" size={13} /></span>
            </button>
            {mode === 'signup' && (
              <small className="auth-card__fineprint">Dengan daftar, kamu setuju menyimpan catatan keuanganmu di akun ini.</small>
            )}
          </form>
        )}

        <div className="auth-card__divider"><span>atau</span></div>
        <button
          type="button"
          className="button button--outline button--full"
          onClick={google}
          disabled={loading || googleEnabled === false}
        >
          <PixelIcon name="globe" size={17} />
          {googleEnabled === false ? 'Google belum tersedia' : 'Lanjut dengan Google'}
        </button>

        {googleEnabled === false && (
          <details className="auth-setup">
            <summary>Kenapa tombol Google belum bisa?</summary>
            <ol>
              <li>Di Supabase: <strong>Authentication → Providers → Google</strong>, aktifkan provider dan isi Client ID + Client Secret.</li>
              <li>Di Google Cloud Console: tambahkan redirect URI <code>https://&lt;project-ref&gt;.supabase.co/auth/v1/callback</code> pada OAuth Client.</li>
              <li>Di Supabase: <strong>Authentication → URL Configuration</strong>, tambahkan <code>{typeof window !== 'undefined' ? window.location.origin : 'https://sakunode.web.id'}</code> ke Site URL / Additional Redirect URLs.</li>
            </ol>
          </details>
        )}

        {!sentEmail && (
          <p className="auth-card__switch">
            {mode === 'signin' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Daftar dulu' : 'Masuk'}
            </button>
          </p>
        )}
      </div>
      <p className="auth-footnote">Data keuanganmu hanya bisa diakses oleh akunmu sendiri.</p>
    </div>
  )
}
