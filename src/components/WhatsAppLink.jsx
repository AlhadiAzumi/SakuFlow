import { useCallback, useEffect, useState } from 'react'
import BotCommands from './BotCommands'
import PixelIcon from './PixelIcon'
import { useApp } from '../context/useApp'
import { supabase } from '../lib/supabase'

const API_URL = (import.meta.env.VITE_BOT_API_URL || '').replace(/\/$/, '')
const BOT_WA_URL = String(import.meta.env.VITE_BOT_WA_URL || 'https://wa.me/15551889428').trim()

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
  const [linkToken, setLinkToken] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [delivered, setDelivered] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

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

  // Setelah OTP diminta, pantau status tiap 3 detik. Bot tidak membalas chat,
  // jadi satu-satunya konfirmasi ada di halaman ini.
  useEffect(() => {
    if (!waiting || !API_URL || mode !== 'cloud') return undefined
    let active = true
    let timer

    const checkStatus = async () => {
      try {
        const data = await callApi('/api/link/status')
        if (!active) return
        if (data.linked) {
          setStatus({ linked: true, phone: data.phone })
          setWaiting(false)
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
  }, [waiting, callApi, mode, showToast])

  const requestOtp = async (event) => {
    event?.preventDefault()
    setLoading(true)
    setLinkToken('')
    try {
      const result = await callApi('/api/link/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      })
      setStatus({ linked: false, phone: result.phone })
      setOtp(String(result.otp || ''))
      setLinkToken(String(result.linkToken || ''))
      setWaiting(true)
      setDelivered(Boolean(result.delivered))
      setCooldown(60)
      setCopied(false)
      showToast(result.delivered
        ? 'Kode dikirim ke WhatsApp. Kirim lewat tautan bot, lalu cek status di sini.'
        : 'Kode siap. Kirim lewat tautan bot, lalu cek status di sini.')
    } catch (error) {
      showToast(error.message || 'Gagal mengirim kode OTP.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyOtp = async () => {
    if (!otp) return
    try {
      const command = linkToken ? `/verif ${otp} ${linkToken}` : otp
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Gagal menyalin. Salin manual, ya.', 'error')
    }
  }

  const refreshStatus = async () => {
    setLoading(true)
    try {
      const data = await callApi('/api/link/status')
      setStatus({ linked: Boolean(data.linked), phone: data.phone })
      if (data.linked) {
        setWaiting(false)
        setOtp('')
        setLinkToken('')
        showToast('Nomor WhatsApp sudah terhubung.')
      } else {
        showToast(otp && linkToken
          ? 'Kode masih menunggu. Kirim perintah terbaru ke bot.'
          : 'Belum terhubung. Kirim kode OTP dulu.')
      }
    } catch (error) {
      showToast(error.message || 'Gagal mengecek status koneksi.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const waHref = otp
    ? `${BOT_WA_URL}${BOT_WA_URL.includes('?') ? '&' : '?'}text=${encodeURIComponent(`/verif ${otp} ${linkToken}`)}`
    : BOT_WA_URL

  const disconnect = async () => {
    setLoading(true)
    try {
      await callApi('/api/link', { method: 'DELETE' })
      setStatus({ linked: false, phone: null })
      setWaiting(false)
      setOtp('')
      setLinkToken('')
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
        Kirim OTP atau catatan ke bot, data langsung tersimpan di Sakunode. Bot tidak membalas chat.
      </p>

      <BotCommands />

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
            <button type="submit" className="button button--primary" disabled={loading || cooldown > 0}>
              {loading ? 'Mengirim…' : cooldown > 0 ? `Tunggu ${cooldown} dtk` : 'Kirim kode OTP'}
            </button>
          </form>

          {waiting && (
            <div className="whatsapp-panel__otp" role="status">
              {otp && (
                <>
                  <span className="whatsapp-panel__otp-label">Kode OTP kamu</span>
                  <code className="whatsapp-panel__otp-code">{otp}</code>
                  <span className="whatsapp-panel__otp-label">Perintah verifikasi</span>
                  <code className="whatsapp-panel__otp-command">{linkToken ? `/verif ${otp} ${linkToken}` : otp}</code>
                </>
              )}
              <p>
                Kirim perintah terbaru persis seperti di atas lewat tautan bot. Kode baru membatalkan kode lama dan berlaku 5 menit.
              </p>
              <div className="whatsapp-panel__otp-actions">
                {otp && (
                  <button type="button" className="button button--ghost" onClick={copyOtp}>
                    {copied ? 'Perintah tersalin' : 'Salin perintah terbaru'}
                  </button>
                )}
                <button type="button" className="button button--ghost" onClick={requestOtp} disabled={loading || cooldown > 0}>
                  {cooldown > 0 ? `Kode baru ${cooldown} dtk` : 'Minta kode baru'}
                </button>
                <button type="button" className="button button--ghost" onClick={refreshStatus} disabled={loading}>
                  Cek status
                </button>
                <a href={waHref} target="_blank" rel="noreferrer">
                  Buka chat bot WhatsApp
                </a>
              </div>
              {!delivered && (
                <span className="whatsapp-panel__otp-note">
                  Pesan otomatis gagal. Pakai tautan bot di atas.
                </span>
              )}
            </div>
          )}
        </>
      )}
      <p className="whatsapp-panel__hint">Bot tidak membalas chat. Cek status di sini setelah kirim kode.</p>
    </section>
  )
}
