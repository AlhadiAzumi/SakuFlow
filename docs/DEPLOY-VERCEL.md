# Deploy Meta Cloud API di Vercel (Baileys tetap ada)

Arsitektur yang dipakai:

```
Vercel  → website (Vite) + /api/webhook + /api/link/*
Supabase → database + Realtime
Lokal / VPS → bot Baileys (opsional, jalur terpisah)
```

Kode Baileys di `bot/src/baileys.js` **tidak dihapus dan tidak dipanggil** oleh serverless Vercel. Kamu bisa tetap `cd bot && npm start` dengan `BOT_MODE` default (`baileys`) kapan saja.

## 1. Siapkan Meta Business

1. Buka **Business Support Home** → verifikasi bisnis (centang hijau). Status *Test Messaging Account* yang masih `Disabled` umumnya karena verifikasi ini belum selesai.
2. Buka [Meta for Developers](https://developers.facebook.com/apps/) → buat/opses aplikasi → **Add Product → WhatsApp**.
3. Pilih **WhatsApp Business Account (WABA)**, lalu salin:
   - **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **App Secret** (App Settings → Basic) → `WHATSAPP_APP_SECRET`
4. Di **WhatsApp → API Setup**, ambil token:
   - Temporary token (aktif 24 jam) untuk mencoba, atau
   - Permanent token lewat System User dengan izin `whatsapp_business_messaging`.
   - Masukkan ke `WHATSAPP_TOKEN`.
5. Masih di **API Setup → To**, tambahkan nomor HP penerima lalu verifikasi dengan kode yang dikirim Meta. Nomor ini yang boleh mencoba chat.
6. **App → Webhook → Configuration**:
   - Callback URL: `https://<project>.vercel.app/api/webhook`
   - Verify token: bebas, misal `catatan-uang-secret` (samakan dengan `WHATSAPP_VERIFY_TOKEN`)
   - Klik **Verify and Save**, lalu subscribe field **`messages`**.

## 2. Environment variable di Vercel

Project Settings → Environment Variables. **Jangan** pakai prefix `VITE_` untuk secret.

| Variable | Contoh | Fungsi |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | server only |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | server only, jangan pernah di-`VITE_` |
| `WHATSAPP_TOKEN` | `EAAG...` | kirim pesan |
| `WHATSAPP_PHONE_NUMBER_ID` | `123456789` | kirim pesan |
| `WHATSAPP_APP_SECRET` | `abc...` | verifikasi HMAC webhook |
| `WHATSAPP_VERIFY_TOKEN` | `catatan-uang-secret` | verifikasi GET webhook |
| `WEB_ORIGIN` | `https://<project>.vercel.app` | CORS untuk `/api/link/*` |
| `BOT_MODE` | `meta` | opsional; jalur `/api/` tetap pakai Cloud API |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | browser |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | browser |
| `VITE_BOT_API_URL` | `https://<project>.vercel.app` | browser; boleh kosong bila sama domain |

`vercel.json` sudah mengatur build Vite (`npm run build` → `dist/`), jadi tidak perlu konfigurasi tambahan.

## 3. Deploy & cek

```bash
git push origin main   # Vercel auto-deploy
```

Lalu buka:

```
https://<project>.vercel.app/api/health
```

Semua flag penting harus `true`: `metaConfigured`, `verifyTokenConfigured`, `appSecretConfigured`, `supabaseConfigured`.

## 4. Uji coba

1. Dari nomor yang sudah terdaftar di **API Setup → To**, kirim `masuk uang 10 ribu`.
2. Cek **Vercel → Functions → Logs** dan tabel `transactions` di Supabase.
3. Untuk OTP: buka Setelan → Hubungkan WhatsApp di website, lalu balas 6 digit dari bot.

Endpoint yang tersedia:

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/health` | status konfigurasi (tanpa secret) |
| GET | `/api/webhook` | verifikasi Meta |
| POST | `/api/webhook` | terima pesan WhatsApp |
| POST | `/api/link/request` | kirim OTP |
| GET | `/api/link/status` | cek status hubungan |
| DELETE | `/api/link` | putuskan nomor |

## 5. Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| Webhook verification `403` | `hub.verify_token` beda dengan `WHATSAPP_VERIFY_TOKEN` |
| Webhook `401` | `WHATSAPP_APP_SECRET` salah; HMAC tidak cocok |
| OTP tidak terkirim | `/api/health` → `metaConfigured: false`, atau nomor belum terdaftar di *To* |
| Token tiba-tiba mati | Temporary token hanya 24 jam; buat permanent token |
| *Test Messaging Account Disabled* | Verifikasi bisnis Meta belum approve — ini di sisi Meta |
| Error CORS di browser | `WEB_ORIGIN` belum sama dengan domain website |
| Balasan tidak muncul | Cek Log function Vercel; pastikan field `messages` sudah di-subscribe |

## Catatan Baileys

- Deploy Vercel **tidak mengubah** `bot/.env` dan tidak menyentuh folder `bot/auth/`.
- Untuk memakai Baileys lagi, jalankan seperti biasa:

```bash
cd bot
npm start
```

- Jangan menaruh `BOT_MODE=meta` di `bot/.env` kalau masih mau Baileys lokal. Environment Vercel dan `bot/.env` adalah dua tempat yang berbeda.
