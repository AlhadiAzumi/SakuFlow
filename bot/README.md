# Bot WhatsApp | Catatan Uang Harian (Meta Cloud API)

Bot ini menerima chat seperti **"masuk uang 500 ribu"**, lalu menulis transaksi ke database Supabase yang **sama** dengan website. Karena website memakai Supabase Realtime, catatannya langsung muncul tanpa refresh.

```
Meta WhatsApp Cloud API
   ↓ webhook POST /webhook + cek HMAC-SHA256
deduplikasi message.id
   ↓
parse pesan (regex) → cari akun dari nomor WA
   ↓ insert ke public.transactions (service_role)
Supabase Realtime
   ↓
Website langsung update + bot balas "struk"
```

Folder `bot/` sekarang **Meta-only**: Baileys, QR, dan sesi lokal sudah dihapus. Untuk deploy, pakai `bot/vercel.json` sebagai root project Vercel.

## Yang sudah ada

- **Parser regex** untuk nominal `ribu`/`rb`/`k`/`juta`/`jt`/`Rp...`, tipe masuk/keluar, kategori, dan tanggal.
- **Link akun via OTP**: user isi nomor di website, bot kirim 6 digit kode lewat Cloud API, user balas kode itu di WA.
- **Balasan struk** tiap transaksi + perintah `ringkasan` dan `bantuan`.
- **Idempoten**: `message.id` yang sama tidak diproses dua kali (dijaga juga unique index di DB).
- **Verifikasi webhook** HMAC-SHA256 lewat header `X-Hub-Signature-256`.
- **Mode dry-run** untuk mencoba tanpa token Meta maupun Supabase.

## 1. Pasang dependency

```bash
cd bot
npm install
```

## 2. Jalankan SQL di Supabase

Buka **Supabase → SQL Editor**, jalankan SQL ini:

```sql
alter table public.transactions
  add column if not exists source text not null default 'web',
  add column if not exists bot_message_id text;

create unique index if not exists transactions_bot_message_id_idx
  on public.transactions (bot_message_id)
  where bot_message_id is not null;

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

-- Pastikan tabel transactions masuk publication supabase_realtime
```

> Bot memakai **service_role key**, yang melewati RLS. Jangan pernah memasukkan service_role key ke variabel `VITE_` website.

## 3. Isi `.env`

```bash
copy .env.example .env
```

```env
PORT=3001
WEB_ORIGIN=http://localhost:5173

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # service_role, BUKAN anon

WHATSAPP_VERIFY_TOKEN=catatan-uang-secret
WHATSAPP_APP_SECRET=...
WHATSAPP_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_API_VERSION=v25.0

BOT_DRY_RUN=false
```

File `.env` dibaca otomatis saat start. Setiap kali mengubahnya, **restart bot**. Cek di `http://localhost:3001/health`:

- `{"ok":true,"mode":"live","botMode":"meta-cloud"}` → Supabase terbaca.
- `{"ok":true,"mode":"dry-run","botMode":"meta-cloud"}` → uji lokal tanpa kredensial.

## 4. Hubungkan ke website

Di `.env` website (proyek utama):

```env
VITE_BOT_API_URL=http://localhost:3001
```

Lalu jalankan ulang `npm run dev`. Menu **Setelan → Catat cukup dengan chat** akan muncul pada mode cloud.

## 5. Jalankan lokal

```bash
npm start
```

Untuk development dengan auto-reload: `npm run dev`.

Untuk uji tanpa WA/Supabase:

```bash
set BOT_DRY_RUN=true
set BOT_DRY_OTP_CODE=123456
npm start
```

Semua balasan tampil di terminal dengan prefix `[DRY-RUN WA → ...]`.

## 6. Deploy ke Vercel (Meta-only)

Project Vercel harus memakai **`bot/` sebagai Root Directory**, bukan root repo.

```bash
cd bot
npx vercel
```

- `bot/vercel.json` me-rewrite seluruh path ke `bot/api/index.js`.
- `bot/api/index.js` mengekspor Express `app` dari `src/server.js`.
- `app.listen()` hanya dipanggil bila `process.env.VERCEL` tidak ada.
- `npm run build` sudah tersedia (no-op) supaya Vercel tidak gagal build.

Environment Variables di Vercel: samakan dengan daftar `.env` di atas, dengan `WEB_ORIGIN=https://<project>.vercel.app` dan `VITE_BOT_API_URL` diisi di project website.

Panduan lengkap Meta Business + webhook ada di [`../docs/DEPLOY-VERCEL.md`](../docs/DEPLOY-VERCEL.md).

## Cara pakai

**Sekali linking:**

1. Website → Setelan → **Kirim kode OTP**.
2. Kode 6 digit tampil di website (dan dikirim lewat Cloud API bila izin aktif).
3. Balas di WA dengan kode tersebut → status jadi **Terhubung**.

**Sehari-hari, tinggal chat:**

| Chat | Hasil |
| --- | --- |
| `masuk uang 500 ribu` | Pemasukan Rp500.000 |
| `gaji 3,5 juta hari ini` | Pemasukan Rp3.500.000, kategori Gaji |
| `keluar 25rb buat kopi` | Pengeluaran Rp25.000, kategori Makan & Minum |
| `beli bensin 50 ribu kemarin` | Pengeluaran Rp50.000, kategori Transportasi |
| `keluar 18rb transport tanggal 12` | Pengeluaran tanggal 12 bulan ini |
| `ringkasan` / `rekap` | Total masuk/keluar/sisa bulan ini |
| `riwayat` | 5 catatan terakhir |
| `status` | Status koneksi & jumlah catatan |
| `hapus` / `clear` / `batal` | Hapus 1 catatan terakhir |
| `hapus semua` / `clear all` | Hapus seluruh catatan (tidak bisa dibatalkan) |
| `bantuan` / `menu` | Daftar perintah |

Catatan: bot bersifat **satu arah**. Pesan dan perintah diproses, tetapi bot tidak mengirim balasan chat; hasilnya langsung terlihat di website.

## Endpoint API

| Method | Path | Fungsi | Auth |
| --- | --- | --- | --- |
| GET | `/health` | Cek status bot | tidak ada |
| GET | `/webhook` | Verifikasi `hub.challenge` Meta | `WHATSAPP_VERIFY_TOKEN` |
| POST | `/webhook` | Terima pesan WhatsApp | HMAC `X-Hub-Signature-256` |
| POST | `/api/link/request` | Kirim OTP | Bearer token Supabase |
| GET | `/api/link/status` | Cek status linking | Bearer token Supabase |
| DELETE | `/api/link` | Putuskan nomor | Bearer token Supabase |

## Testing

```bash
npm test

npm run simulate -- "masuk uang 500 ribu"

npm run send -- 6281234567890 "masuk uang 500 ribu"
```

Simulasi webhook manual (mode dry-run, tidak butuh token):

```bash
curl -X POST http://localhost:3001/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"entry\":[{\"changes\":[{\"value\":{\"messages\":[{\"id\":\"msg_1\",\"from\":\"6281234567890\",\"text\":{\"body\":\"masuk uang 500 ribu\"}}]}}]}]}"
```

## Troubleshooting

| Gejala | Solusi |
| --- | --- |
| Verifikasi webhook `403` | `hub.verify_token` beda dengan `WHATSAPP_VERIFY_TOKEN` |
| Webhook `401` | `WHATSAPP_APP_SECRET` salah / header HMAC tidak ada |
| OTP tidak sampai | Cek `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, dan nomor harus terdaftar di **API Setup → To** |
| *Test Messaging Account* `Disabled` | Verifikasi bisnis Meta belum approve di sisi Meta, bukan bug aplikasi |
| `Failed to fetch` di website | Bot belum jalan atau origin belum masuk `WEB_ORIGIN` |
| REST Supabase `403` | Jalankan ulang `supabase/setup.sql` untuk GRANT |
| `mode` tetap `dry-run` | `BOT_DRY_RUN` bukan `false`, atau kredensial Supabase kosong |

## Batasan saat ini

- Parser masih berbasis aturan; kalimat sangat bebas belum selalu dipahami.
- Bot tidak membalas chat WA (one-way); konfirmasi dan rekap hanya tampil di website.
- Edit satu transaksi masih lewat website; penghapusan lewat WA hanya untuk catatan terakhir atau semua catatan.
- Mode dry-run menyimpan data di memory, hilang saat bot dimatikan.
- Nomor WA dipakai sebagai identitas; pastikan user melakukan verifikasi OTP.
