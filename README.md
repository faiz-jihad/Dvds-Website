# AZ Rayan DVDs

Platform e-commerce physical media premium berbasis React 19, TypeScript, Vite, Supabase, Stripe Hosted Checkout, dan automated business intelligence. Menggabungkan kurasi film fisik berkualitas (DVD, Blu-ray, 4K UHD) dengan arsitektur operasional real-time, manajemen inventaris atomik, sistem email terpisah (Customer Receipts & Admin Business Reports), dan portal akun pelanggan yang lengkap.

---

## Fitur Utama & Operasional

### 1. Storefront & Editorial Media Fisik
- **Katalog & Navigasi Sinematik**: Eksplorasi katalog berdasarkan format (DVD, Blu-ray, 4K UHD), dekade, kategori, dan genre.
- **Pencarian Real-Time**: Pencarian cepat instan dengan filter harga, ketersediaan, dan pengurutan.
- **Detail Produk Lengkap**: Metadata rilisan fisik mendalam (Aspect Ratio, Audio, Subtitles, Region Code, BBFC Rating, Special Features).
- **Wishlist & Keranjang Belanja**: Keranjang responsif dengan kalkulasi subtotal dan diskon dinamis.

### 2. Portal Pelanggan & Manajemen Akun (Customer Portal)
- **Otentikasi Pelanggan**: Registrasi, login, dan manajemen profil mandiri.
- **Saved Addresses (Buku Alamat)**:
  - Manajemen CRUD lengkap (Tambah alamat, Edit alamat, Hapus dengan konfirmasi).
  - Penandaan alamat utama (**Set as Default**) secara instan.
  - Validasi kode pos UK otomatis dengan format standar.
  - Terintegrasi langsung dengan formulir checkout untuk auto-fill 1-klik, serta opsi simpan alamat baru ke akun saat checkout.
  - *Resilient storage*: Fallback cerdas berbasis scoped storage saat database publik offline.
- **Order History (Riwayat Pesanan)**:
  - Pencarian pesanan real-time berdasarkan Order Reference atau judul DVD.
  - Filter status: *Semua*, *Dalam Proses (In Progress)*, *Terkirim (Delivered)*, dan *Menunggu Pembayaran (Awaiting Payment)*.
  - Integrasi pelacakan kurir **Royal Mail** dengan tombol salin nomor resi dan tautan portal tracking resmi.
  - Thumbnail produk, rincian harga per item, dan tombol **Buy Again** 1-klik untuk memasukkan kembali item ke keranjang.

### 3. Visual Order Status Stepper (React Bits & Framer Motion)
- **Pelacakan Status Interaktif**: Komponen pelacak pesanan 5 tahap (*Order Confirmed*, *Payment Verified*, *Processing & Packing*, *Dispatched*, *Delivered*).
- **Animasi Halus**: Didukung oleh `framer-motion` dengan indikator progres visual, transisi status dinamis, dan tampilan detail kurir/resi.
- Ditampilkan pada halaman konfirmasi sukses order (`/order-success`) dan riwayat akun pelanggan (`/account/orders`).

### 4. Official AZ Rayan DVDs Struk & Printable Receipt
- **Desain Struk & Invoice Resmi**: Dilengkapi identitas resmi AZ Rayan DVDs, nomor referensi order `#ORD-XXXX`, status pembayaran (`PAID`), metode transaksi, rincian produk, dan barcode simulasi.
- **Null-Safety & Tahan Crash**: Penanganan aman terhadap data alamat, item, maupun status pembayaran parsial.
- **Aksi 1-Klik di Halaman Order Success**:
  - Tombol **"Cetak Struk / Print Receipt"** langsung membuka native print dialog browser (*Print / Save as PDF*).
  - Tombol **"Lihat Struk / Preview"** membuka modal interaktif kertas A4 dengan efek bayangan dan status pembayaran.
  - Tombol pintas **Ctrl+P / Cmd+P** otomatis mencetak struk bersih yang terisolasi.
- **Isolasi Cetak Bersih (@media print)**: Menggunakan portal `#print-only-container` yang otomatis menyembunyikan antarmuka web, modal, dan tombol, memastikan hasil cetak A4 atau PDF rapi dan presisi tanpa terpotong.

### 5. Sistem Email Terpisah (Customer Receipts vs Admin Reports)
Sistem email memisahkan dua peruntukan secara ketat:
- **CUSTOMER (Bukti Pembelian / Struk Email)**:
  - Dikirimkan secara otomatis **hanya** setelah webhook Stripe diverifikasi (`stripe.webhooks.constructEvent`).
  - Tidak pernah dipicu dari navigasi frontend.
  - Desain kuitansi e-commerce profesional, mobile-friendly, tanpa memuat nomor kartu lengkap atau CVV.
  - Dilengkapi tombol *"View Order"* dan proteksi idempotensi via `email_logs`.
- **ADMIN (Laporan Kinerja Bisnis Mingguan & Bulanan)**:
  - Admin **tidak** menerima email per transaksi satuan.
  - Laporan eksekutif berkala otomatis:
    - **Laporan Mingguan**: Setiap Senin pagi (periode Senin s/d Minggu lalu).
    - **Laporan Bulanan**: Setiap tanggal 1 (periode bulan kalender lalu).
  - Merangkum Total Pendapatan, Jumlah Pesanan, AOV, Unit Terjual, Produk Terlaris, dan Pengeluaran Operasional.
  - Pembedaan akuntansi transparan antara **"Net Revenue After Recorded Expenses"** vs **"Estimated Profit"** berdasarkan ketersediaan data modal (`cost_price` / COGS).
  - Lihat panduan lengkap di [docs/EMAIL_AND_REPORTS_SYSTEM.md](docs/EMAIL_AND_REPORTS_SYSTEM.md).

### 6. Backoffice & Administrasi Toko (/admin)
- **Role-Based Access Control**: Akses terproteksi untuk role `admin` dan `staff` via Supabase RLS.
- **Laporan & Finansial (`/admin/reports`)**:
  - Dashboard performa bisnis dengan filter rentang waktu (*This Week*, *Last Week*, *This Month*, *Last Month*, *Custom*).
  - Manajemen pencatatan pengeluaran (*Expenses*) per kategori (*Shipping*, *Packaging*, *Payment Fees*, *Inventory*, *Marketing*, *Hosting*, dll).
  - Riwayat pengiriman laporan (*Report History*) dengan fitur *Resend* manual jika email gagal terkirim.
  - Tombol *Trigger Report Now* untuk pengujian instan.
- **Katalog & Stok**: CRUD produk, pengarsipan aman (tanpa merusak histori transaksi), dan penyesuaian stok atomik wajib alasan.
- **Order Fulfilment**: Pengaturan status pemenuhan, input kurir/resi Royal Mail, dan pencatatan riwayat status pesanan.
- **Promosi & Diskon**: Kupon promo bertanggal dengan batas minimum belanja dan validasi server.
- **CMS & Pengaturan Toko**: Kontrol banner beranda, ongkir, batas waktu dispatch (cutoff time), dan kontak toko.
- **Audit & Inventory Ledger**: Log mutasi stok dan aktivitas admin append-only.

### 7. Keamanan & Gateway Pembayaran
- **Stripe Hosted Checkout & Webhooks**: Perhitungan harga, diskon, ongkir, dan ketersediaan stok diverifikasi ulang di backend `/api/checkout-session` dan `/api/stripe-webhook`.
- **Reservasi Stok Otomatis**: Stok direservasi saat sesi checkout dibuka dan otomatis dilepaskan kembali jika sesi kedaluwarsa (`checkout.session.expired`) atau dibatalkan.
- **Batas Serverless Function Vercel**: Seluruh endpoint API serverless dirancang efisien dan terkonsolidasi (11 fungsi aktif, di bawah batas 12 fungsi paket Vercel Hobby).

---

## Menjalankan Aplikasi Secara Lokal

### Prasyarat
- Node.js versi 20+ (atau v24+ disarankan)
- NPM

### Instalasi & Menjalankan Dev Server

```bash
# Instal dependensi
npm install

# Jalankan server pengembangan lokal (Vite)
npm run dev
```

Server lokal akan aktif di `http://localhost:5173`.

### Menjalankan Pengujian (Testing)

```bash
node --test tests/checkout.test.mjs tests/security.test.mjs tests/admin-api.test.mjs tests/reports-and-email.test.mjs
```

### Validasi Build Produksi

```bash
npm run build
```

---

## Konfigurasi Environment (.env)

Salin `.env.example` menjadi `.env` lalu lengkapi variabel berikut:

```env
# Frontend Client Public Keys
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Serverless Backend & Database Keys
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_URL=https://your-site.com

# Stripe Payment Gateway
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayPal Payment Gateway
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_WEBHOOK_ID=your-paypal-webhook-id
PAYPAL_ENVIRONMENT=sandbox

# Email & Automated Business Reports
ADMIN_EMAIL=admin@azrayan.co.uk
EMAIL_FROM="AZ Rayan DVDs <orders@azrayan.co.uk>"
RESEND_API_KEY=re_xxxxxxxxxxxx
# atau: SENDGRID_API_KEY=SG.xxxxxxxxxxxx
CRON_SECRET=your-random-cron-secret-token
```

> **Keamanan**: Jangan pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, atau API key email ke variabel yang berawalan `VITE_`.

---

## Menyiapkan Supabase Database

1. Terapkan seluruh migration database secara berurutan:
   - `20260915000001_admin_reliability.sql`
   - `20260915000002_checkout_sync.sql`
   - `20261007000001_business_reports_and_expenses.sql`

2. Promosikan akun admin pertama melalui SQL Editor Supabase:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'owner@example.com';
   ```

Lihat panduan lengkap di [docs/ADMIN_VERIFICATION.md](docs/ADMIN_VERIFICATION.md).

---

## Dokumentasi Terkait

- [docs/EMAIL_AND_REPORTS_SYSTEM.md](docs/EMAIL_AND_REPORTS_SYSTEM.md) — Panduan lengkap sistem email kuitansi pelanggan, laporan performa admin, manajemen pengeluaran, dan Vercel Cron.
- [docs/PAYMENT_GATEWAY_SETUP.md](docs/PAYMENT_GATEWAY_SETUP.md) — Panduan konfigurasi Stripe, PayPal, Direct Bank Transfer, dan webhook lifecycle.
- [docs/ADMIN_VERIFICATION.md](docs/ADMIN_VERIFICATION.md) — Verifikasi hak akses admin dan integritas database.
- [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) — Panduan integrasi keamanan Cloudflare dan Turnstile bot protection.
- [SECURITY.md](SECURITY.md) — Standar mitigasi OWASP Top 10, IDOR, CSP, dan rate limiting.
