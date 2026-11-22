# SakuFlow — Catatan Uang Harian

Aplikasi pencatat keuangan berbasis web (PWA) yang membantu pengguna melihat **ke mana uang mereka pergi**. Fokus utamanya bukan sekadar tabel saldo, tapi visualisasi alur uang dan insight mingguan yang mudah dipahami.

Tampilan memakai gaya *light-mode fintech SaaS*: latar `slate-50`, kartu kaca putih, aksen gradasi biru, dan CTA pil gelap. Stack frontend: React + Vite + Tailwind CSS v4 + `lucide-react`. Pengunjung yang belum login melihat landing page lengkap; setelah login masuk ke dashboard yang memakai sistem desain yang sama.

## Fitur MVP

- **Catat cepat**: pemasukan/pengeluaran, nominal (format Rupiah), kategori, tanggal, dan catatan opsional. Bisa ditambah maupun diubah.
- **Peta uang**: diagram alur (sankey) dari "uang masuk" ke tiap kategori, termasuk "sisa/tabungan".
- **Ringkasan bulan ini**: uang masuk, uang keluar, dan sisa/defisit.
- **Insight mingguan**: perbandingan pengeluaran 7 hari terakhir vs 7 hari sebelumnya + kategori terbesar.
- **Budget per kategori**: pasang batas bulanan dan dapat peringatan saat pemakaian mencapai 80% atau melewati batas.
- **Target tabungan**: sisa pemasukan otomatis dibaca sebagai progres tabungan bulanan.
- **Tren 6 bulan** dan **ranking kategori** pengeluaran.
- **Riwayat transaksi**: pencarian, filter masuk/keluar, hapus, dan edit dengan sekali ketuk.
- **PWA**: bisa dipasang ke home screen HP dan tetap terbuka saat offline.
- **Dua mode penyimpanan**: lokal (localStorage) atau cloud (Supabase Auth + Postgres).
- **Bot WhatsApp** (mode cloud): catat cukup dengan chat, langsung muncul di website lewat Realtime.

## Menjalankan

```bash
npm install
npm run dev
```

Buka alamat yang muncul di terminal (biasanya `http://localhost:5173`).

Build produksi:

```bash
npm run build
npm run preview
```

## Mode lokal vs cloud

Aplikasi otomatis memakai **mode lokal** selama file `.env` belum diisi. Data disimpan di browser perangkat dan langsung bisa dicoba tanpa akun.

Untuk mengaktifkan **mode cloud + akun**:

1. Salin `.env.example` menjadi `.env`.
2. Buat project di [supabase.com](https://supabase.com) (tier gratis cukup).
3. Di Supabase: **Project Settings → API**, salin `Project URL` dan `anon public key` ke `.env`:

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

4. Buat tabel & aturan akses. **Cara tercepat (dan disarankan):** buka `supabase/setup.sql`, salin seluruh isinya, paste di **Supabase → SQL Editor**, lalu klik **Run**. File itu adalah versi lengkap — termasuk `GRANT` hak akses dan aktivasi Realtime. SQL ringkas di bawah hanya untuk gambaran:

```sql
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount integer not null check (amount >= 0),
  category text not null,
  note text not null default '',
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

alter table public.transactions enable row level security;

create policy "Users can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Tabel pengaturan budget & target tabungan
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  budgets jsonb not null default '{}'::jsonb,
  savings_target integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Kolom tambahan untuk transaksi yang dibuat bot WhatsApp
alter table public.transactions
  add column if not exists source text not null default 'web',
  add column if not exists bot_message_id text;

create unique index if not exists transactions_bot_message_id_idx
  on public.transactions (bot_message_id)
  where bot_message_id is not null;

-- Pasangan nomor WhatsApp ↔ akun web (diisi bot lewat service_role)
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
```

5. Aktifkan **Realtime** untuk tabel `transactions` di **Database → Publications → supabase_realtime** (centang tabel tersebut). Ini membuat perubahan dari web/bot langsung muncul tanpa refresh.
6. Aktifkan provider login di **Authentication → Providers**. Email sudah aktif secara default; untuk Google, isi Client ID/Secret dan tambahkan redirect URL Supabase ke daftar authorized redirect.
7. Jalankan ulang `npm run dev`. Halaman login akan muncul otomatis, dengan indikator **Live** di header.

> Catatan: kunci `anon` aman dipakai di sisi klien karena akses data dijaga oleh Row Level Security (RLS).

## Struktur singkat

```
src/
  App.jsx                  shell, navigasi, orkestrasi halaman
  context/AppContext.jsx   state global + adapter lokal/cloud + Realtime
  context/useApp.js        hook akses context
  lib/
    analytics.js           agregasi bulanan, insight, tren, budget, tabungan
    categories.js          daftar kategori + warna/emoji
    format.js              Rupiah & tanggal
    supabase.js            inisialisasi client (atau mode lokal)
  components/              UI (grafik alur, ringkasan, form, budget, bot, dll.)
bot/                       server bot WhatsApp (Node + Express)
  src/parser.js            parser regex pesan
  src/store.js             adapter Supabase (service_role) + dry-run
  src/server.js            Express + API linking (webhook Meta tetap ada)
  src/baileys.js           transport WA default (scan QR)
scripts/generate-icons.mjs generator ikon PWA
```

## Bot WhatsApp

Bot sudah tersedia di folder `bot/` dan memakai database Supabase yang sama dengan
web. Chat seperti **"masuk uang 500 ribu"** langsung muncul di website lewat Realtime.
Panduan lengkap ada di **`bot/README.md`**. Untuk menjalankan jalur Meta Cloud API
dari Vercel (tanpa menghapus Baileys), lihat **`docs/DEPLOY-VERCEL.md`**.

```
WhatsApp → Baileys (default, scan QR) → bot server (Node) → parse pesan → Supabase
              atau Meta Cloud API webhook
                                                          ↓ Realtime
                                                    Web React langsung update
```

Singkatnya:

1. Jalankan `npm install` di folder `bot/`, salin `.env.example` → `.env`, isi kredensial Supabase **service_role** (jangan pernah dipakai di web). Kredensial Meta tidak perlu diisi untuk mode default.
2. Isi `VITE_BOT_API_URL=http://localhost:3001` di `.env` website, lalu jalankan ulang web.
3. Jalankan `npm start` di folder `bot/`, lalu scan QR dengan nomor cadangan.
4. Di website: **Setelan → Catat cukup dengan chat → Kirim kode OTP**, lalu balas kode 6 digit itu di WA.
5. Sekarang tinggal chat: `keluar 25rb buat kopi`, `gaji 3,5 juta`, `ringkasan`, dll.
6. Tiap `message.id` hanya diproses sekali. Jalur Meta opsional (`BOT_MODE=meta`) tetap memakai HMAC-SHA256.

Bisa dicoba dulu tanpa QR/Meta/Supabase dengan `BOT_DRY_RUN=true` — balasan bot muncul di terminal.

## Ide lanjutan

- Notifikasi push saat budget terlampaui.
- Impor CSV dari bank / e-wallet.
- Kantong tabungan terpisah dengan target per tujuan (liburan, darurat, dll.).
- Widget home screen untuk catat sekali ketuk.
- Versi Flutter memakai database & API yang sama, supaya bisa ke Android/iOS.
