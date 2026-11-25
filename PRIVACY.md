# Kebijakan Privasi | Sakunode

**Terakhir diperbarui:** 26 November 2026

Sakunode adalah aplikasi pencatatan keuangan harian yang dioperasikan di **https://sakunode.web.id**. Sakunode terintegrasi dengan bot WhatsApp dan dashboard web untuk visualisasi arus kas. Kebijakan ini menjelaskan data apa yang kami kumpulkan, bagaimana kami memakainya, dan hak kamu atas data tersebut.

---

## Versi Bahasa Indonesia

### 1. Pendahuluan dan Identitas Aplikasi

Sakunode adalah aplikasi pencatatan keuangan harian berbasis web yang bisa diakses di [https://sakunode.web.id](https://sakunode.web.id/). Pengguna dapat mencatat pemasukan, pengeluaran, dan tabungan lewat bot WhatsApp atau lewat dashboard web, lalu melihat ringkasan dan visualisasi arus kas. Kebijakan privasi ini berlaku untuk seluruh pengguna website dan bot WhatsApp Sakunode.

### 2. Data yang Kami Kumpulkan

Kami hanya mengumpulkan data yang diperlukan untuk menjalankan layanan:

- **Data akun melalui Google OAuth:** jika kamu memilih masuk dengan Google, kami menerima **nama lengkap, alamat email, foto profil**, dan identifier akun Google kamu. Data ini diberikan oleh Google setelah kamu menyetujui izin akses.
- **Data akun email:** alamat email dan data autentikasi. Kami tidak pernah menyimpan kata sandi kamu. Autentikasi dikelola oleh Supabase Auth.
- **Data transaksi dari dashboard web:** jenis transaksi, nominal, kategori, tanggal, catatan opsional, batas budget per kategori, dan target tabungan yang kamu isi sendiri.
- **Data transaksi dari WhatsApp Bot:** nomor telepon yang kamu daftarkan, isi pesan dan perintah yang kamu kirim, nominal dan kategori yang kamu sampaikan, kode verifikasi OTP, serta ID pesan WhatsApp untuk mencegah pesan diproses dua kali.
- **Data perangkat:** jika kamu memakai mode lokal tanpa Supabase, catatan disimpan di `localStorage` browser kamu sendiri dan tidak dikirim ke server kami.

Kami tidak memakai iklan pihak ketiga, pelacak, atau analitik untuk membangun profil pemasaran kamu.

### 3. Penggunaan Data Google User

Data profil Google yang kami terima, yaitu nama lengkap, alamat email, dan foto profil, **hanya digunakan untuk autentikasi akun, identifikasi pengguna, dan sinkronisasi data keuangan pribadi kamu**. Artinya data tersebut dipakai untuk membuat atau mengenali akun Sakunode kamu dan memastikan catatan keuanganmu tersinkron dengan akun yang benar di berbagai perangkat.

Kami tidak menggunakan data Google tersebut untuk iklan, profil pemasaran, penjualan data, atau tujuan komersial lainnya.

### 4. Penyimpanan dan Keamanan Data

Data disimpan secara terenkripsi menggunakan infrastruktur database cloud yang aman. Koneksi antara browser, bot, dan database memakai HTTPS atau TLS sehingga data terenkripsi saat dikirim. Data yang disimpan juga dilindungi oleh enkripsi pada sisi penyimpanan cloud.

Akses data dibatasi dengan Row Level Security sehingga hanya pemilik akun yang dapat membaca dan mengubah datanya. Kunci akses server hanya tersimpan di lingkungan server bot dan tidak pernah dikirim ke browser. Kode verifikasi dihapus setelah berhasil dipakai, dan webhook WhatsApp diverifikasi dengan tanda tangan HMAC-SHA256.

### 5. Pembagian Data ke Pihak Ketiga

Sakunode **tidak menjual, menyewakan, atau membagikan data pribadi maupun data Google pengguna kepada pihak ketiga mana pun untuk tujuan iklan atau komersial**.

Kami hanya memakai penyedia layanan infra untuk menjalankan fitur, yaitu Supabase untuk database dan autentikasi, Meta WhatsApp Cloud API untuk pesan bot, dan Cloudflare Turnstile untuk verifikasi keamanan login. Setiap penyedia memproses data seperlunya dan tunduk pada kebijakan privasi mereka sendiri.

### 6. Retensi dan Penghapusan Data

Data disimpan selama akun kamu aktif dan diperlukan untuk layanan. Kamu dapat menghapus seluruh data lokal kapan saja lewat menu **Setelan** di aplikasi, serta mengunduh catatan dalam format Excel sebelum menghapusnya.

Kamu juga berhak meminta **penghapusan akun beserta seluruh riwayat transaksinya kapan saja**. Kirim permintaan lewat email dukungan resmi di bawah. Setelah identitas kamu diverifikasi, kami akan menghapus akun dan seluruh data keuangan yang terkait.

### 7. Kontak Kami

Untuk pertanyaan privasi, bantuan akun, atau permintaan penghapusan data, hubungi email dukungan resmi Sakunode: **sakunode@gmail.com**.

Baca juga [Syarat dan Ketentuan Sakunode](https://sakunode.web.id/terms).

---

## English Version

**Last updated:** 26 November 2026

Sakunode is a daily money-tracking application operated at **https://sakunode.web.id**. It integrates a WhatsApp bot and a web dashboard for cash-flow visualization. This policy explains what data we collect, how we use it, and your rights.

### 1. Introduction and App Identity

Sakunode is a web application available at [https://sakunode.web.id](https://sakunode.web.id/). Users can record income, expenses, and savings through the WhatsApp bot or the web dashboard, then view summaries and cash-flow visualizations. This policy applies to all users of the website and the WhatsApp bot.

### 2. Data We Collect

- **Account data via Google OAuth:** if you sign in with Google, we receive your **full name, email address, profile photo**, and Google account identifier. Google provides this data after you grant permission.
- **Email account data:** email address and authentication data. We never store your password. Authentication is handled by Supabase Auth.
- **Transaction data from the web dashboard:** transaction type, amount, category, date, optional note, category budgets, and savings target that you enter yourself.
- **Transaction data from the WhatsApp bot:** the phone number you register, messages and commands you send, amounts and categories you provide, the OTP code, and WhatsApp message IDs to prevent duplicate processing.
- **Device data:** in local mode without Supabase, notes stay in your own browser `localStorage` and are not sent to our servers.

We do not use third-party ads, trackers, or analytics to build a marketing profile of you.

### 3. Use of Google User Data

Google profile data we receive, namely full name, email address, and profile photo, **is used only for account authentication, user identification, and synchronization of your personal financial data**. It is used to create or recognize your Sakunode account and to keep your records linked to the correct account across devices.

We do not use Google data for advertising, marketing profiles, data sales, or any other commercial purpose.

### 4. Storage and Security

Data is stored encrypted using a secure cloud database infrastructure. Connections between the browser, bot, and database use HTTPS or TLS, and stored data is protected by encryption at rest.

Access is restricted with Row Level Security so only the account owner can read or modify their data. Server keys live only in the bot server environment and are never sent to the browser. Verification codes are removed after successful use, and the WhatsApp webhook is verified with an HMAC-SHA256 signature.

### 5. Sharing with Third Parties

Sakunode **does not sell, rent, or share personal data or Google user data with any third party for advertising or commercial purposes**.

We only use infrastructure providers to run features: Supabase for database and authentication, Meta WhatsApp Cloud API for bot messages, and Cloudflare Turnstile for login security verification. Each provider processes only the data needed and is subject to its own privacy policy.

### 6. Retention and Deletion

Data is kept while your account is active and needed for the service. You can clear all local data at any time from the **Settings** menu and export your records as an Excel workbook first.

You may also request **deletion of your account and all transaction history at any time**. Send the request to the official support email below. After identity verification, we will delete the account and all related financial data.

### 7. Contact Us

For privacy questions, account help, or data deletion requests, contact the official Sakunode support email: **sakunode@gmail.com**.

Read also the [Sakunode Terms of Service](https://sakunode.web.id/terms).
