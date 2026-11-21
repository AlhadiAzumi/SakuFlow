# Kebijakan Privasi — SakuFlow

**Terakhir diperbarui:** 21 November 2026

SakuFlow adalah aplikasi pencatat keuangan berbasis web (PWA) dan bot WhatsApp yang membantu pengguna melihat ke mana uang mereka pergi. Kami menghormati privasi kamu. Dokumen ini menjelaskan data apa yang kami kumpulkan, bagaimana kami menggunakannya, dan hak-hak kamu atas data tersebut.

---

## Versi Bahasa Indonesia

### 1. Data yang kami kumpulkan

- **Akun**: alamat email dan data autentikasi. Kami tidak menyimpan kata sandi kamu — autentikasi dikelola oleh Supabase Auth.
- **Data keuangan**: jenis transaksi (uang masuk/keluar), nominal, kategori, tanggal, catatan opsional, batas budget per kategori, dan target tabungan.
- **WhatsApp**: nomor telepon, kode verifikasi (OTP), isi pesan yang kamu kirim ke bot, dan ID pesan WhatsApp (hanya untuk mencegah pesan diproses dua kali).
- **Perangkat**: jika kamu memakai mode lokal, data disimpan di `localStorage` browser kamu sendiri. Kami **tidak** memakai iklan, pelacak, atau analitik pihak ketiga.

### 2. Tujuan penggunaan

Data dipakai untuk menampilkan ringkasan dan visualisasi alur uang, menyinkronkan data antarperangkat, menghubungkan nomor WhatsApp ke akun, membalas perintah seperti `ringkasan` dan `bantuan`, serta mengirim kuitansi konfirmasi setiap transaksi.

### 3. Penyimpanan dan pihak ketiga

Data disimpan di **Supabase** (PostgreSQL + Auth). Pesan WhatsApp diproses melalui **Meta WhatsApp Cloud API**. Kami tidak menjual, menyewakan, atau membagikan data kamu kepada pihak lain untuk keperluan iklan. Kunci akses server (`service_role`) hanya disimpan di server bot dan tidak pernah dikirim ke browser.

### 4. Retensi dan penghapusan

Data disimpan sampai kamu menghapusnya. Kamu bisa mengunduh data dalam bentuk JSON dan menghapus data lokal melalui menu **Setelan** di aplikasi. Untuk menghapus data cloud secara permanen, hubungi kami lewat email di bawah. Kode OTP dihapus otomatis setelah verifikasi berhasil.

### 5. Keamanan

Akses data dibatasi dengan **Row Level Security (RLS)** — hanya pemilik akun yang dapat membaca dan mengubah datanya. Webhook WhatsApp diverifikasi dengan tanda tangan **HMAC-SHA256**.

### 6. Hak kamu

Kamu berhak mengakses, mengubah, mengunduh, atau meminta penghapusan data pribadi kamu. Kirim permintaan ke email di bawah.

### 7. Anak-anak

Layanan ini tidak ditujukan untuk anak di bawah usia 13 tahun.

### 8. Perubahan kebijakan

Perubahan akan diumumkan dengan memperbarui tanggal di bagian atas dokumen ini.

### Kontak

**Email:** alhadilangsa54321@gmail.com

---

## English Version

**Last updated:** 21 November 2026

SakuFlow is a web/PWA money-tracking app with a WhatsApp bot that helps users see where their money goes. We respect your privacy. This policy explains what data we collect, how we use it, and your rights.

### 1. Data we collect

- **Account**: email address and authentication data. We never store your password; authentication is handled by Supabase Auth.
- **Financial data**: transaction type (income/expense), amount, category, date, optional note, monthly category budgets, and savings target.
- **WhatsApp**: phone number, one-time verification code (OTP), the text of messages you send to the bot, and WhatsApp message IDs (only to prevent duplicate processing).
- **Device**: in local mode, data stays in your own browser's `localStorage`. We do **not** use ads, trackers, or third-party analytics.

### 2. How we use it

To display summaries and money-flow visualizations, sync data across devices, link your WhatsApp number to your account, reply to commands such as `ringkasan` (summary) and `bantuan` (help), and send a confirmation receipt for each transaction.

### 3. Storage and third parties

Data is stored in **Supabase** (PostgreSQL + Auth). WhatsApp messages are processed via the **Meta WhatsApp Cloud API**. We do not sell, rent, or share your data with third parties for advertising. Server keys (`service_role`) live only on the bot server and are never exposed to the browser.

### 4. Retention and deletion

Data is kept until you delete it. You can export your data as JSON and clear local data from the **Settings** menu. To permanently delete cloud data, contact us at the email below. OTP codes are removed after successful verification.

### 5. Security

Access is restricted with **Row Level Security (RLS)** — only the account owner can read or modify their data. The WhatsApp webhook is verified with an **HMAC-SHA256** signature.

### 6. Your rights

You may access, correct, export, or request deletion of your personal data by contacting us.

### 7. Children

This service is not intended for children under 13.

### 8. Changes

Updates will be reflected by revising the date at the top of this document.

### Contact

**Email:** alhadilangsa54321@gmail.com
