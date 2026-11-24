import { useEffect, useRef, useState } from 'react'
import PixelIcon from './PixelIcon'
import { useApp } from '../context/useApp'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const AVATAR_SIZE = 128

function cropToAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca gambar.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Format gambar tidak dikenali.'))
      image.onload = () => {
        const side = Math.min(image.width, image.height)
        const canvas = document.createElement('canvas')
        canvas.width = AVATAR_SIZE
        canvas.height = AVATAR_SIZE
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(
          image,
          (image.width - side) / 2,
          (image.height - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_SIZE,
          AVATAR_SIZE,
        )
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ProfilePanel() {
  const { profile, updateProfile, showToast } = useApp()
  const [username, setUsername] = useState(profile.username)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    setUsername(profile.username)
    setAvatar(profile.avatar)
  }, [profile])

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar JPG atau PNG, ya.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Ukuran gambar maksimal 5 MB.')
      return
    }
    try {
      setAvatar(await cropToAvatar(file))
    } catch (err) {
      setError(err?.message || 'Gagal memproses gambar.')
    }
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    if (!username.trim()) {
      setError('Nama profil tidak boleh kosong.')
      return
    }
    setBusy(true)
    try {
      await updateProfile({ username, avatar })
      showToast('Profil kamu diperbarui.')
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan profil. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel profile-panel">
      <div className="panel__header-row">
        <div>
          <h2 className="panel__title">Profil kamu</h2>
          <p className="profile-panel__desc">Nama dan foto ini yang tampil di dashboard Sakunode.</p>
        </div>
        <span className="pixel-eyebrow">IDENTITAS</span>
      </div>

      <form onSubmit={save} className="profile-panel__form">
        <div className="profile-panel__identity">
          <span className="profile-avatar" aria-hidden="true">
            {avatar ? <img src={avatar} alt="" /> : <PixelIcon name="user" size={28} />}
          </span>
          <div className="profile-panel__photo-actions">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={pickPhoto} className="sr-only" />
            <button type="button" className="button button--outline" onClick={() => inputRef.current?.click()}>
              <PixelIcon name="edit" size={14} /> {avatar ? 'Ganti foto' : 'Tambah foto'}
            </button>
            {avatar && (
              <button type="button" className="button button--ghost" onClick={() => { setAvatar(''); setError('') }}>
                <PixelIcon name="trash" size={14} /> Hapus foto
              </button>
            )}
            <small>JPG/PNG • maks 5 MB • dipotong kotak 128 px</small>
          </div>
        </div>

        <label className="field profile-panel__field">
          <span className="field__label">Nama tampilan</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={24}
            placeholder="Nama panggilanmu"
          />
          <small>Maksimal 24 karakter. Boleh beda dari nama email.</small>
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="profile-panel__footer">
          <button type="submit" className="button button--primary" disabled={busy}>
            <PixelIcon name="check" size={14} /> {busy ? 'Menyimpan…' : 'Simpan profil'}
          </button>
          <span className="profile-panel__preview">Halo, <strong>{username.trim() || 'teman'}</strong>!</span>
        </div>
      </form>
    </section>
  )
}
