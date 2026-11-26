# Hardening autentikasi

Checklist ini menutup sisa risiko pada alur login dan penautan WhatsApp.
Sebagian perbaikan ada di kode (sudah diterapkan), sebagian wajib disetel di
dashboard Supabase karena tidak bisa dikerjakan dari aplikasi.

## 1. Jalankan migrasi database

Jalankan ulang `supabase/setup.sql` di Supabase → SQL Editor. Yang penting:

- kolom `whatsapp_links.link_token`
- index unik parsial `whatsapp_links_phone_verified_idx` (hanya `verified = true`)
- penghapusan unique constraint lama pada kolom `phone`

Tanpa migrasi ini, permintaan OTP akan gagal dan nomor masih bisa saling kunci.
Setelah migrasi, bersihkan permintaan lama yang masih menyimpan kode plaintext:

```sql
update public.whatsapp_links
set otp_code = null, link_token = null, otp_expires_at = null
where verified = false;
```

User yang sedang menunggu kode lama perlu meminta kode baru setelah deploy.

## 2. Setelan Supabase → Authentication

Buka **Authentication → Attack Protection** dan **Rate Limits**. Nilai yang
disarankan:

- **Turnstile/CAPTCHA wajib aktif** untuk sign-in dan sign-up. Secret key
  Turnstile hanya diisi di Supabase, bukan di repo.
- **Minimum password length** 8 karakter atau lebih.
- **Leaked password protection** aktif (cek terhadap database kebocoran).
- **Email confirmation wajib** (`mailer_autoconfirm` dimatikan) supaya alamat
  email benar-benar dimiliki pendaftar.
- **Rate limit sign-in per IP** dinaikkan proteksinya, misalnya 10 percobaan
  per menit; ini pengganti yang sebenarnya untuk pembatas di sisi browser.
- **Redirect URL** dibatasi ke domain produksi saja.

## 3. Cara memverifikasi

Uji dari terminal, ganti `<domain>` dengan domain aplikasi:

- `curl -i -X POST https://<domain>/api/link/request` → harus `401`, bukan `500`.
- Login dengan kata sandi salah lebih dari batas → Supabase membalas
  `429 Too Many Requests`, bukan pesan "email atau kata sandi salah".
- Kirim `/verif <kode>` tanpa token ke bot → nomor tidak boleh terhubung.
- Kirim `/verif <kode> <token>` dari nomor yang sama → nomor terhubung.

## 4. Yang tidak boleh diandalkan

Pembatas percobaan login di `src/lib/loginGuard.js` hanya menyimpan hitungan di
`localStorage`. Pengguna bisa menghapusnya kapan saja, jadi fungsinya semata
sebagai pengalaman pengguna (pesan "tunggu 30 menit"), bukan kontrol keamanan.
Kontrol yang mengikat tetap ada di Supabase.

## 5. Setelah deploy

- Urutan deploy: **SQL migrasi → project `bot/` → project website**. Kalau
  website lebih dulu, tombol OTP belum mendapat `linkToken` dari bot lama.
- Pastikan `WHATSAPP_APP_SECRET` dan `WHATSAPP_VERIFY_TOKEN` terisi di Vercel.
  Tanpa app secret, pengecekan signature webhook dilewati dan endpoint tetap
  bisa dipanggil siapa pun.
- Deploy ulang **kedua** target (`sakunode.web.id` dan folder `bot/`) karena
  verifikasi signature webhook ada di `bot/src/server.js`.
- Kalau log Vercel pernah memuat nomor atau isi pesan pengguna, putar ulang
  token WhatsApp dan service role key Supabase.