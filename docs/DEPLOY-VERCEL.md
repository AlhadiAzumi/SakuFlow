# Deploy Bot Meta Cloud API ke Vercel

Folder `bot/` sekarang **Meta-only** (Baileys sudah dihapus) dan siap di-deploy sebagai project Vercel tersendiri.

```
Meta WhatsApp Cloud API
   ↓ webhook POST /webhook
Vercel Serverless (bot/api/index.js → Express app)
   ↓
Supabase (service_role) → Realtime → website Sakunode
```

## 1. Siapkan Meta Business

1. Buka **Business Support Home** → verifikasi bisnis (centang hijau). Status *Test Messaging Account* yang masih `Disabled` umumnya karena verifikasi ini belum selesai.
2. Buka [Meta for Developers](https://developers.facebook.com/apps/) → pilih/buat App → **Add Product → WhatsApp**.
3. Pilih WABA, lalu salin:
   - **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **App Secret** (App Settings → Basic) → `WHATSAPP_APP_SECRET`
4. Di **WhatsApp → API Setup**, ambil token:
   - Temporary token (24 jam) untuk mencoba, atau
   - Permanent token lewat System User dengan izin `whatsapp_business_messaging`.
   - Masukkan ke `WHATSAPP_TOKEN`.
5. Di **API Setup → To**, tambahkan & verifikasi nomor HP penerima.
6. **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://<project>.vercel.app/webhook`
   - Verify token: bebas, misal `catatan-uang-secret`. Samakan dengan `WHATSAPP_VERIFY_TOKEN`
   - Verify & Save → subscribe field **`messages`**.

> Beda dengan deploy lama di root repo yang memakai `/api/webhook`. Kalau root directory Vercel-mu `bot/`, URL-nya `/webhook`.

## 2. Deploy `bot/`

Di Vercel → **Add New → Project** → import repo → **Root Directory: `bot/`**.

Konfigurasi build terdeteksi otomatis:

| Pengaturan | Nilai |
|---|---|
| Root Directory | `bot` |
| Build Command | `npm run build` (no-op: `echo "Serverless function ready"`) |
| Output Directory | tidak perlu diisi |

`bot/vercel.json` me-rewrite semua path ke `/api/index.js`, dan `bot/api/index.js` mengekspor Express `app`. `app.listen()` hanya jalan saat `VERCEL` tidak diset, jadi tidak ada port yang dibuka di serverless.

## 3. Environment Variables (project `bot/`)

Jangan pakai prefix `VITE_` untuk secret.

| Variable | Contoh |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `WHATSAPP_TOKEN` | `EAAG...` |
| `WHATSAPP_PHONE_NUMBER_ID` | `123456789` |
| `WHATSAPP_APP_SECRET` | `abc...` |
| `WHATSAPP_VERIFY_TOKEN` | `catatan-uang-secret` |
| `WHATSAPP_API_VERSION` | `v25.0` |
| `WEB_ORIGIN` | `https://sakunode.web.id` (domain lama boleh tetap masuk daftar kalau masih redirect) |
| `BOT_DRY_RUN` | `false` |

Variabel `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `VITE_BOT_API_URL` tetap diisi di **project website**, bukan di project bot. Tambahkan juga `VITE_TURNSTILE_SITE_KEY` bila ingin menimpa nilai bawaan, dan aktifkan Secret Key Turnstile di Supabase → **Authentication → Attack Protection**. `VITE_BOT_WA_URL` opsional untuk menimpa tautan `wa.me` nomor bot yang dipakai sebagai cadangan kirim OTP manual. Nilai bawaan sudah ada di kode dan bukan kontak pribadi.

## 4. Cek & uji

```bash
curl https://<project>.vercel.app/health
```

Contoh respons sehat:

```json
{ "ok": true, "mode": "live", "botMode": "meta-cloud" }
```

Lalu uji verifikasi webhook (ganti `TOKEN_KAMU` dengan verify token aslimu. Jangan kirim ke sini):

```bash
curl "https://<project>.vercel.app/webhook?hub.mode=subscribe&hub.challenge=TEST123&hub.verify_token=TOKEN_KAMU"
```

Harus balas `TEST123`. Terakhir, kirim `masuk uang 10 ribu` dari nomor yang terdaftar di **API Setup → To**, lalu cek **Functions → Logs** dan tabel `transactions`.

## Endpoint

| Method | Path | Fungsi |
|---|---|---|
| GET | `/health` | Status bot |
| GET | `/webhook` | Verifikasi `hub.challenge` |
| POST | `/webhook` | Terima pesan (HMAC) |
| POST | `/api/link/request` | Kirim OTP |
| GET | `/api/link/status` | Cek status linking |
| DELETE | `/api/link` | Putuskan nomor |

## Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| Verifikasi webhook `403` | `hub.verify_token` beda dengan `WHATSAPP_VERIFY_TOKEN` |
| Webhook `401` | `WHATSAPP_APP_SECRET` salah; HMAC tidak cocok |
| Tidak ada balasan | Field `messages` belum di-subscribe, atau nomor belum di *To* |
| OTP tidak sampai | Cek `WHATSAPP_TOKEN` + `PHONE_NUMBER_ID`, dan nomor harus terdaftar |
| Token mati mendadak | Temporary token hanya 24 jam |
| *Test Messaging Account Disabled* | Verifikasi bisnis Meta belum approve di sisi Meta |
| Error CORS di website | `WEB_ORIGIN` belum sama dengan domain website |
| Deploy gagal build | Pastikan Root Directory = `bot/` agar script `build` terbaca |

## Catatan

- Deploy ini **tidak mengubah** project website di root repo. Website tetap memakai `VITE_BOT_API_URL` yang mengarah ke domain bot.
- File `auth/`, QR, dan sesi Baileys sudah tidak ada di folder `bot/`.
- Untuk menjalankan lokal: `cd bot && npm start` dengan `.env` yang sama.
