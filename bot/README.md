# Bot WhatsApp — Catatan Uang Harian

Bot ini menerima chat seperti **"masuk uang 500 ribu"**, lalu menulis transaksi ke database Supabase yang **sama** dengan website. Karena website memakai Supabase Realtime, catatannya langsung muncul tanpa refresh.

```
Kamu chat WA
   ↓
Baileys (default)  →  messages.upsert
   atau
Meta Cloud API     →  webhook /webhook + cek HMAC
   ↓ deduplikasi message id
parse pesan (regex) → cari akun dari nomor WA
   ↓ insert ke public.transactions (service_role)
Supabase Realtime
   ↓
Website langsung update + bot balas "struk"
```

Mode default adalah **Baileys**: cukup scan QR, tanpa Meta Developer, tanpa token, dan tanpa Cloudflare Tunnel. Jalur Meta tetap disimpan sebagai opsi.

## Yang sudah ada

- **Parser regex** untuk nominal `ribu`/`rb`/`k`/`juta`/`jt`/`Rp...`, tipe masuk/keluar, kategori, dan tanggal (`hari ini`, `kemarin`, `tanggal N`, `YYYY-MM-DD`).
- **Link akun via OTP**: user isi nomor di website, bot kirim 6 digit kode, user balas kode itu di WA.
- **Balasan struk** tiap transaksi + perintah `ringkasan` dan `bantuan`.
- **Idempoten**: pesan dengan `message.id` sama tidak diproses dua kali (juga dijaga unique index di DB).
- **Verifikasi webhook** memakai HMAC-SHA256 (`X-Hub-Signature-256`) pada jalur Meta.
- **Dual mode**: Baileys sebagai default, Meta Cloud API bisa dipakai lewat `BOT_MODE=meta`.
- **Mode dry-run**: bisa dicoba end-to-end tanpa QR, kredensial Meta, maupun Supabase.

## 1. Pasang dependency

```bash
cd bot
npm install
```

## 2. Jalankan SQL di Supabase

Buka **Supabase → SQL Editor**, jalankan SQL ini (tabel `transactions` sudah dibuat dari README utama):

```sql
-- Kolom tambahan untuk menandai transaksi dari bot
alter table public.transactions
  add column if not exists source text not null default 'web',
  add column if not exists bot_message_id text;

create unique index if not exists transactions_bot_message_id_idx
  on public.transactions (bot_message_id)
  where bot_message_id is not null;

-- Pasangan nomor WhatsApp ↔ akun web
create table if not exists public.whatsapp_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  otp_code text,
  otp_expires_at timestamptz,
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_links enable row level security;

create policy "Users can read own WhatsApp link"
  on public.whatsapp_links for select
  using (auth.uid() = user_id);

-- Tabel transactions juga harus masuk publication realtime
-- (Database → Publications → supabase_realtime → centang transactions)
```

> Bot memakai **service_role key**, yang melewati RLS. Itu sebabnya policy di atas hanya perlu `select` untuk dibaca website lewat API bot. **Jangan pernah** memasukkan service_role key ke file `.env` website.

## 3. Isi `.env`

```bash
copy .env.example .env
```

Isi yang wajib:

```env
PORT=3001
WEB_ORIGIN=http://localhost:5173

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # dari Project Settings → API

BOT_DRY_RUN=false
```

Untuk **Baileys, `.env` tidak perlu diubah sama sekali**—semua kredensial Meta boleh dikosongkan. Mode default-nya sudah `baileys`. Kalau nanti mau balik ke Meta, tambahkan baris opsional:

```env
BOT_MODE=meta
```

File `.env` dibaca otomatis saat bot start (memakai `dotenv`). Setiap kali mengubah `.env`,
**restart bot** (`Ctrl+C` lalu `npm start`). Cek hasilnya di `http://localhost:3001/health`:

- `{"ok":true,"mode":"live","botMode":"baileys"}` → Supabase terbaca dan bot siap scan QR.
- `{"ok":true,"mode":"live","botMode":"meta"}` → jalur Meta aktif.
- `{"ok":true,"mode":"dry-run","botMode":"baileys"}` → uji lokal tanpa QR.

Penyebab paling umum `mode` tetap `dry-run`:

1. `BOT_DRY_RUN` masih `true` (nilai `false` harus huruf kecil, tanpa spasi).
2. `SUPABASE_URL` atau `SUPABASE_SERVICE_ROLE_KEY` kosong/salah. Kunci service_role asli
   panjangnya ±200+ karakter dan diawali `eyJ...` — bukan kunci `anon`.
3. Bot belum di-restart setelah mengubah `.env`.

## 4. Hubungkan ke website

Di file `.env` **website** (proyek utama), isi:

```env
VITE_BOT_API_URL=http://localhost:3001
```

Lalu jalankan ulang `npm run dev` di proyek utama. Menu **Setelan → Catat cukup dengan chat** akan muncul pada mode cloud.

## 5. Jalankan bot — Baileys (default)

```bash
npm start
```

QR akan muncul di terminal. Scan lewat **WhatsApp → Perangkat tertaut → Tautkan perangkat**. Setelah itu bot langsung menerima chat.

Boleh pakai **nomor utama** lewat mode **Self-Chat**: buka ruang **Chat ke Diri Sendiri**, lalu kirim perintah di sana. Bot mengenali chat diri sendiri dari nomor/LID miliknya sendiri (termasuk `remoteJidAlt`), jadi pesan `fromMe` ke kontak lain atau grup tetap diabaikan. Balasan bot juga otomatis diabaikan supaya tidak memicu balasan berulang.

Session tersimpan di `bot/auth/`. Folder ini sudah masuk `.gitignore`, jadi tidak akan ter-push ke GitHub. Kalau sesi logout atau mau ganti nomor:

```bash
npm run baileys:reset
npm start
```

**Penting:** sebelum reset/scan ulang, putuskan perangkat lama dulu di HP lewat **WhatsApp → Perangkat Tertaut → SakuFlow Bot → Putuskan**. Reset lokal saja tidak menghapus pairing di HP; kalau dibiarkan, dua sesi bisa bertabrakan dan memicu error `Bad MAC` (pesan tidak bisa didekripsi, balasan OTP tidak muncul).

> Baileys memakai protokol WhatsApp Web (unofficial), bukan API resmi Meta. Untuk pemakaian personal/portofolio dengan volume wajar ini paling praktis. Tetap jangan pakai nomor utama.

## 6. (Opsional) Balik ke Meta WhatsApp Cloud API

Kalau verifikasi Meta sudah approve dan mau memakai jalur resmi:

1. Tambahkan `BOT_MODE=meta` ke `.env` bot.
2. Buka [developers.facebook.com](https://developers.facebook.com) → buat App → tambahkan produk **WhatsApp**.
3. Di **WhatsApp → API Setup**, salin **Phone number ID** dan buat **Temporary access token** (atau token permanen lewat System User).
4. Di **App Settings → Basic**, salin **App Secret**.
5. Tambahkan webhook:
   - Callback URL: `https://domain-anda/webhook` (harus HTTPS; untuk lokal pakai tunnel seperti Cloudflare Tunnel / ngrok).
   - Verify token: bebas, misal `catatan-uang-secret` — isi juga di `WHATSAPP_VERIFY_TOKEN`.
6. Subscribe ke field `messages`.
7. Isi `.env` bot:

```env
BOT_MODE=meta
WHATSAPP_VERIFY_TOKEN=catatan-uang-secret
WHATSAPP_APP_SECRET=...
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v21.0
```

8. Restart bot. Endpoint `/webhook` tetap aktif di kedua mode, jadi `npm run send` tetap bisa dipakai untuk simulasi.

> **Deploy Vercel:** kalau mau memakai Meta Cloud API dari serverless, jalur yang disarankan ada di [`docs/DEPLOY-VERCEL.md`](../docs/DEPLOY-VERCEL.md). Endpoint-nya `/api/webhook`, `/api/health`, dan `/api/link/*`. Kode Baileys di folder ini tetap dipertahankan dan bisa dipakai lokal lewat `npm start` dengan mode default.

## Cara pakai

**Sekali linking:**
1. Website → Setelan → **Kirim kode OTP**.
2. Bot mengirim kode 6 digit ke nomor itu.
3. Balas di WA dengan kode tersebut → status jadi **Terhubung**.

**Sehari-hari, tinggal chat:**

| Chat | Hasil |
| --- | --- |
| `masuk uang 500 ribu` | Pemasukan Rp500.000, kategori Lainnya |
| `gaji 3,5 juta hari ini` | Pemasukan Rp3.500.000, kategori Gaji |
| `keluar 25rb buat kopi` | Pengeluaran Rp25.000, kategori Makan & Minum |
| `beli bensin 50 ribu kemarin` | Pengeluaran Rp50.000, kategori Transportasi, tanggal kemarin |
| `bayar listrik 300rb` | Pengeluaran Rp300.000, kategori Tagihan |
| `ringkasan` | Total masuk/keluar/sisa bulan ini |
| `bantuan` | Daftar contoh perintah |

## Endpoint API

| Method | Path | Fungsi | Auth |
| --- | --- | --- | --- |
| GET | `/health` | Cek status bot | – |
| GET | `/webhook` | Verifikasi webhook Meta | verify token |
| POST | `/webhook` | Terima pesan WA | HMAC (mode live) |
| POST | `/api/link/request` | Kirim OTP | Bearer token Supabase |
| GET | `/api/link/status` | Cek status linking | Bearer token Supabase |
| DELETE | `/api/link` | Putuskan nomor | Bearer token Supabase |

## Testing

```bash
# Unit test parser (8 test)
npm test

# Coba parse satu kalimat (tanpa bot jalan)
npm run simulate -- "masuk uang 500 ribu"

# Kirim pesan WA simulasi ke bot yang sedang jalan. Jalankan dengan BOT_DRY_RUN=true
# supaya balasan tampil di terminal (tanpa perlu QR maupun token Meta).
npm run send -- 6281234567890 "masuk uang 500 ribu"

# Dry-run: jalankan bot tanpa QR / kredensial Meta / Supabase
set BOT_DRY_RUN=true
set BOT_DRY_OTP_CODE=123456
npm start
```

Contoh simulasi webhook (dry-run, tidak perlu token Meta):

```bash
curl -X POST http://localhost:3001/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"entry\":[{\"changes\":[{\"value\":{\"messages\":[{\"id\":\"msg_1\",\"from\":\"6281234567890\",\"text\":{\"body\":\"masuk uang 500 ribu\"}}]}}]}]}"
```

Semua balasan WA akan tampil di terminal dengan prefix `[DRY-RUN WA → ...]`.

## Troubleshooting

### Test Messaging Account berlabel merah `Disabled`

Ini **masalah di sisi Meta**, bukan bug aplikasi. Sekarang ini **tidak menghalangi bot** karena mode default sudah Baileys — cukup scan QR dan chat WA asli langsung jalan.

Kalau tetap ingin menunggu jalur Meta:

1. Pantau email akun Meta + muat ulang **Business Support Home** sampai status portofolio berubah.
2. Cek **WhatsApp Manager → Phone numbers**. Kalau ada tombol **Verify / Verify again** (SMS atau telepon), lakukan — verifikasi nomor sering mempercepat aktivasi.
3. Pastikan tidak ada item lain yang masih pending di **Business Portfolio**.
4. Jangan hapus/ganti nomor test saat peninjauan berjalan (bisa mengulang antrean).

Begitu status aktif: tambahkan `BOT_MODE=meta` dan isi `WHATSAPP_TOKEN`, restart bot, lalu chat WA asli lewat webhook.

### `npm run send` balas `401`

Bot sudah memakai `WHATSAPP_APP_SECRET`, jadi webhook menolak pesan tanpa tanda tangan HMAC. Script `npm run send` sekarang membaca secret dari `bot/.env` dan mengirim header `X-Hub-Signature-256` otomatis. Kalau masih `401`, **restart bot** setelah mengubah `.env` (config dibaca sekali saat start).

### Web klik "Kirim kode OTP" muncul `Failed to fetch`

- Pastikan bot jalan dan `http://localhost:3001/health` balas `live`.
- Kalau web dibuka lewat IP jaringan/HP, tambahkan origin itu di `WEB_ORIGIN` (atau pakai `WEB_ORIGIN=*`) lalu restart bot.

### REST Supabase balas `403 permission denied`

Tabel belum punya `GRANT`. Jalankan ulang `supabase/setup.sql` — file itu sudah termasuk grant untuk `anon`, `authenticated`, dan `service_role`.

### Verifikasi webhook Meta balas `403`

`hub.verify_token` tidak sama dengan `WHATSAPP_VERIFY_TOKEN` di `bot/.env`. Samakan, lalu restart bot.

### Login gagal walau akun sudah dibuat

Cek `email_confirmed_at`. Kalau kosong, konfirmasi lewat **Supabase → Authentication → Users**, atau matikan **Confirm email** di provider Email agar pendaftaran berikutnya langsung aktif.

## Batasan saat ini

- Parser masih berbasis aturan. Kalimat sangat bebas belum selalu dipahami (rencana: fallback LLM).
- Belum bisa edit/hapus transaksi lewat WA (masih lewat website).
- Mode dry-run menyimpan data di memory, hilang saat bot dimatikan.
- Nomor WA dipakai sebagai identitas; pastikan user melakukan verifikasi OTP.
- Baileys bukan API resmi: sesi bisa logout dan perlu scan QR ulang. Pakai `npm run baileys:reset`.
