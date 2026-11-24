import { useCallback, useEffect, useState } from 'react'
import BotCommands from './BotCommands'
import PixelIcon from './PixelIcon'
import { useApp } from '../context/useApp'
import { supabase } from '../lib/supabase'

const API_URL = (import.meta.env.VITE_BOT_API_URL || '').replace(/\/$/, '')

const getToken = async () => {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

export default function WhatsAppLink() {
  const { mode, showToast } = useApp()
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState({ linked: false, phone: null })
  const [checking, setChecking] = useState(Boolean(API_URL) && mode === 'cloud')
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [delivered, setDelivered] = useState(false)

  const callApi = useCallback(async (path, options = {}) => {
    const token = await getToken()
    if (!token) throw new Error('Sesi login tidak ditemukan. Masuk lagi, ya.')
    let response
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      })
    } catch {
      throw new Error(`Tidak bisa menghubungi bot di ${API_URL}. Pastikan bot jalan (npm start) dan alamat web ini terdaftar di WEB_ORIGIN.`)
    }
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'Permintaan gagal.')
    return payload
  }, [])

  useEffect(() => {
    if (!API_URL || mode !== 'cloud') return
    let active = true
    callApi('/api/link/status')
      .then((data) => { if (active) setStatus({ linked: Boolean(data.linked), phone: data.phone }) })
      .catch(() => {})
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [callApi, mode])

  // Saat kode OTP tampil, pantau status koneksi tiap 3 detik. Begitu nomor
  // terhubung dari sisi bot, UI langsung berubah tanpa refresh manual.
  useEffect(() => {
    if (!otp || !API_URL || mode !== 'cloud') return undefined
    let active = true
    let timer

    const checkStatus = async () => {
      try {
        const data = await callApi('/api/link/status')
        if (!active) return
        if (data.linked) {
          setStatus({ linked: true, phone: data.phone })
          setOtp('')
          showToast('Nomor WhatsApp berhasil dihubungkan.')
          return
        }
      } catch {
        // Jangan hentikan polling hanya karena satu request gagal.
      }
      if (active) timer = setTimeout(checkStatus, 3000)
    }

    checkStatus()
    return () => { active = false; clearTimeout(timer) }
  }, [otp, callApi, mode, showToast])

  const requestOtp = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const result = await callApi('/api/link/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      })
      setStatus({ linked: false, phone: result.phone })
      setOtp(String(result.otp || ''))
      setDelivered(Boolean(result.delivered))
      showToast(result.delivered
        ? 'Kode OTP dikirim ke WhatsApp. Balas pesan bot dengan kode tersebut.'
        : 'Kode OTP siap. Kirim manual lewat tautan WhatsApp di bawah, ya.')
    } catch (error) {
      showToast(error.message || 'Gagal mengirim kode OTP.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async () => {
    setLoading(true)
    try {
      await callApi('/api/link', { method: 'DELETE' })
      setStatus({ linked: false, phone: null })
      setOtp('')
      showToast('Nomor WhatsApp diputuskan.')
    } catch (error) {
      showToast(error.message || 'Gagal memutuskan nomor.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!API_URL || mode !== 'cloud') {
    return (
      <section className="panel panel--tip">
        <span className="panel__tip-icon"><PixelIcon name="bot" size={22} /></span>
        <div>
          <strong>Catat lewat WhatsApp (mode cloud)</strong>
          <p>Fitur bot perlu Supabase aktif dan <code>VITE_BOT_API_URL</code> diisi. Baca petunjuk di folder <code>bot/README.md</code>.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel whatsapp-panel">
      <h2 className="panel__title">Catat cukup dengan chat</h2>
      <p className="whatsapp-panel__desc">
        Setelah mengirim kode OTP atau catatan transaksi ke bot WhatsApp, data langsung tersimpan otomatis di Sakunode (bot tidak mengirim balasan chat).
      </p>

      <BotCommands compact />

      {checking ? (
        <p className="whatsapp-panel__muted">Mengecek status koneksi…</p>
      ) : status.linked ? (
        <div className="whatsapp-panel__linked">
          <span className="whatsapp-panel__check"><PixelIcon name="check" size={15} /></span>
          <div>
            <strong>Terhubung</strong>
            <span>+{status.phone}</span>
          </div>
          <button type="button" className="button button--ghost" onClick={disconnect} disabled={loading}>Putuskan</button>
        </div>
      ) : (
        <>
          <form className="whatsapp-panel__form" onSubmit={requestOtp}>
            <label className="field">
              <span className="field__label">Nomor WhatsApp (format 08…)</span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="081234567890"
                required
              />
            </label>
            <button type="submit" className="button button--primary" disabled={loading}>
              {loading ? 'Mengirim…' : 'Kirim kode OTP'}
            </button>
          </form>

          {otp && (
            <div className="whatsapp-panel__otp" role="status">
              <span className="whatsapp-panel__otp-label">Kode OTP kamu</span>
              <code className="whatsapp-panel__otp-code">{otp}</code>
              <p>Salin kode ini, lalu kirim ke bot WhatsApp agar nomormu langsung terhubung.</p>
              <a href="https://wa.me/15551889428" target="_blank" rel="noreferrer">
                Buka WhatsApp bot
              </a>
              {!delivered && (
                <span className="whatsapp-panel__otp-note">
                  Pesan otomatis tidak terkirim. Silakan kirim manual lewat tautan tersebut.
                </span>
              )}
            </div>
          )}
        </>
      )}
      <p className="whatsapp-panel__hint">Balas bot dengan 6 digit kode OTP dari menu Setelan Sakunode.</p>
    </section>
  )
}
