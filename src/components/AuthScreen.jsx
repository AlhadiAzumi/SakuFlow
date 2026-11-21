import { useState } from 'react'
import { useApp } from '../context/useApp'

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useApp()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setNotice('Akun dibuat! Cek emailmu untuk verifikasi, lalu masuk di sini.')
        setMode('signin')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err?.message || 'Autentikasi gagal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const google = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err?.message || 'Login Google gagal.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="brand-mark">💸</span>
          <div>
            <strong>Catatan Uang Harian</strong>
            <small>Tahu ke mana uangmu pergi</small>
          </div>
        </div>

        <div className="auth-card__intro">
          <h1>Selamat datang kembali 👋</h1>
          <p>Masuk untuk melihat peta uangmu dan lanjut mencatat.</p>
        </div>

        <form onSubmit={submit} className="auth-card__form">
          <label className="field">
            <span className="field__label">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" required />
          </label>
          <label className="field">
            <span className="field__label">Kata sandi</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button type="submit" className="button button--primary button--full" disabled={loading}>
            {loading ? 'Tunggu…' : mode === 'signin' ? 'Masuk' : 'Buat akun'}
          </button>
        </form>

        <div className="auth-card__divider"><span>atau</span></div>
        <button type="button" className="button button--outline button--full" onClick={google} disabled={loading}>
          <span aria-hidden="true">🔵</span> Lanjut dengan Google
        </button>

        <p className="auth-card__switch">
          {mode === 'signin' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}>
            {mode === 'signin' ? 'Daftar dulu' : 'Masuk'}
          </button>
        </p>
      </div>
      <p className="auth-footnote">Data keuanganmu hanya bisa diakses oleh akunmu sendiri.</p>
    </div>
  )
}
