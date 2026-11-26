-- ============================================================
-- Catatan Uang Harian, setup database Supabase
-- Cara pakai: Supabase → SQL Editor → New query → paste semua → Run
-- Aman dijalankan ulang (idempotent).
-- ============================================================

-- ---------- 1. Transaksi (dipakai web + bot WhatsApp) ----------
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

-- Kolom tambahan: asal transaksi & id pesan WA (anti dobel)
alter table public.transactions
  add column if not exists source text not null default 'web',
  add column if not exists bot_message_id text;

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

create unique index if not exists transactions_bot_message_id_idx
  on public.transactions (bot_message_id)
  where bot_message_id is not null;

-- Membuat event Realtime DELETE ikut membawa data baris lama
alter table public.transactions replica identity full;

alter table public.transactions enable row level security;

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);


-- ---------- 2. Budget & target tabungan ----------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  budgets jsonb not null default '{}'::jsonb,
  savings_target integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ---------- 3. Pasangan nomor WhatsApp ↔ akun web ----------
-- Diisi/dibaca bot memakai service_role (melewati RLS).
-- Website hanya perlu select lewat API bot.
create table if not exists public.whatsapp_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null,
  otp_code text,
  link_token text,
  otp_expires_at timestamptz,
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Token rahasia milik pemohon. Verifikasi wajib menyertakan token ini supaya
-- kode OTP saja tidak cukup untuk mengikat nomor ke sebuah akun.
alter table public.whatsapp_links add column if not exists link_token text;

-- Nomor hanya unik setelah terverifikasi. Permintaan yang masih pending tidak
-- boleh "memesan" nomor, karena itu membuat nomor orang lain bisa dikunci.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.whatsapp_links'::regclass
      and contype = 'u'
      and conkey = array[
        (select attnum from pg_attribute
          where attrelid = 'public.whatsapp_links'::regclass and attname = 'phone')
      ]
  loop
    execute format('alter table public.whatsapp_links drop constraint %I', c.conname);
  end loop;
end $$;

create unique index if not exists whatsapp_links_phone_verified_idx
  on public.whatsapp_links (phone)
  where verified;

alter table public.whatsapp_links enable row level security;

drop policy if exists "Users can read own WhatsApp link" on public.whatsapp_links;
create policy "Users can read own WhatsApp link"
  on public.whatsapp_links for select
  using (auth.uid() = user_id);


-- ---------- 4. Hak akses tabel ----------
-- Di sebagian project, tabel baru tidak otomatis dapat grant untuk
-- anon/authenticated/service_role → semua query REST kena "permission denied".
-- RLS tetap berlaku untuk anon/authenticated, jadi ini aman.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.transactions
  to anon, authenticated, service_role;

grant select, insert, update on public.user_settings
  to anon, authenticated, service_role;

grant select on public.whatsapp_links to anon, authenticated;
grant all on public.whatsapp_links to service_role;

-- Supaya tabel yang dibuat kemudian otomatis dapat grant yang sama
alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;


-- ---------- 5. Aktifkan Realtime untuk transactions ----------
-- Ini yang bikin website langsung update saat bot menulis data.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;

-- Cek hasil: transactions harus muncul di daftar
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
