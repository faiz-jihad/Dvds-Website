# AZ Rayan DVDs

Platform e-commerce physical media premium berbasis React 19, TypeScript, Vite, Supabase, dan Stripe Hosted Checkout. Menggabungkan kurasi film fisik berkualitas (DVD, Blu-ray, 4K UHD) dengan arsitektur operasional real-time, manajemen inventaris atomik, dan portal akun pelanggan yang lengkap.

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

### 4. Official UK Tax Invoice & Printable Receipt
- **Desain Faktur Resmi UK**: Dilengkapi identitas toko AZ Rayan DVDs, nomor registrasi VAT UK, nomor registrasi perusahaan, dan jaminan keaslian BBFC.
- **Rincian Finansial Transparan**: Kalkulasi Subtotal, PPN/VAT 20%, Ongkir (Standard/Express), Diskon kupon, dan Grand Total.
- **Isolasi Cetak Bersih (@media print)**: Menggunakan container portal mandiri (`#print-only-container`) yang otomatis menyembunyikan `#root` dan modal backdrop untuk hasil cetak A4 atau ekspor PDF yang rapi tanpa terpotong.

### 5. Backoffice & Administrasi Toko (/admin)
- **Role-Based Access Control**: Akses terproteksi untuk role `admin` dan `staff` via Supabase RLS.
- **Katalog & Stok**: CRUD produk, pengarsipan aman (tanpa merusak histori transaksi), dan penyesuaian stok atomik wajib alasan.
- **Order Fulfilment**: Pengaturan status pemenuhan, input kurir/resi Royal Mail, dan pencatatan riwayat status pesanan.
- **Promosi & Diskon**: Kupon promo bertanggal dengan batas minimum belanja dan validasi server.
- **CMS & Pengaturan Toko**: Kontrol banner beranda, ongkir, batas waktu dispatch (cutoff time), dan kontak toko.
- **Audit & Inventory Ledger**: Log mutasi stok dan aktivitas admin append-only.

### 6. Keamanan & Gateway Stripe
- **Stripe Hosted Checkout**: Perhitungan harga, diskon, ongkir, dan ketersediaan stok diverifikasi ulang di Supabase Edge Function.
- **Reservasi Stok Otomatis**: Stok direservasi saat sesi checkout dibuka dan otomatis dilepaskan kembali jika sesi kedaluwarsa (`checkout.session.expired`).

---

## Arah Desain & UX

Antarmuka storefront didesain dengan estetika editorial fisik modern yang terinspirasi oleh standar kuratorial media fisik kelas dunia ([Criterion Collection](https://www.criterion.com/shop), [BFI Shop](https://shop.bfi.org.uk/), [Arrow Films UK](https://www.arrowfilms.com/c/specialist/arrow-exclusives/), dan [A24 Shop](https://shop.a24films.com/)):
- Tipografi tajam dan hierarki visual yang elegan.
- Palette gelap premium dengan aksen sinematik (*gold & warm dark tones*).
- Kartu rilisan fisik dengan proporsi rasio presisi, badge format, dan micro-interactions yang responsif.

---

## Menjalankan Aplikasi Secara Lokal

### Prasyarat
- Node.js versi 18+ (atau v20+ disarankan)
- NPM atau PNPM

### Instalasi & Menjalankan Dev Server

```bash
# Instal dependensi
npm install

# Jalankan server pengembangan lokal (Vite)
npm run dev
```

Server lokal akan aktif di `http://localhost:5173` (atau port berikutnya jika port sedang terpakai).

### Menjalankan Pengujian (Testing)

```bash
npm test
```

### Validasi Build Produksi

```bash
npm run build
```

---

## Konfigurasi Environment (.env)

Salin `.env.example` menjadi `.env` lalu lengkapi variabel berikut:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Keamanan**: Jangan pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY` atau `STRIPE_SECRET_KEY` ke dalam berkas `.env` frontend atau variabel yang berawalan `VITE_`.

---

## Menyiapkan Supabase Database

1. Terapkan seluruh migration database secara berurutan:
   ```bash
   supabase db push
   ```
   Migration ini secara otomatis menyiapkan skema tabel, RLS policy, fungsi RPC atomik untuk stok/order, dan trigger audit log.

2. Verifikasi integritas tabel:
   ```bash
   node src/scripts/testDb.js
   ```

3. Promosikan akun admin pertama melalui SQL Editor Supabase:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'owner@example.com';
   ```

Lihat panduan lengkap di [docs/ADMIN_VERIFICATION.md](docs/ADMIN_VERIFICATION.md).

---

## Menyiapkan Stripe & Edge Functions

1. Konfigurasikan secret di Supabase:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   supabase secrets set SITE_URL=https://your-store.example
   ```

2. Deploy Edge Functions:
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy get-order-status
   ```

3. Daftarkan endpoint webhook Stripe:
   ```text
   https://PROJECT_ID.supabase.co/functions/v1/stripe-webhook
   ```
   Event wajib:
   - `checkout.session.completed`
   - `checkout.session.expired`

Lihat panduan lengkap di [docs/PAYMENT_GATEWAY_SETUP.md](docs/PAYMENT_GATEWAY_SETUP.md).

---

## Batas Keamanan Sistem

1. **Integritas Transaksi**: Browser tidak dapat membuat pesanan atau mengubah status transaksi secara langsung; seluruh pembuatan pesanan divalidasi oleh Edge Function berbasis service-role.
2. **Kalkulasi Harga Server-Side**: Harga akhir, diskon promo, ongkos kirim, dan stok dihitung ulang secara independen di server database.
3. **Proteksi Role & RLS**: Seluruh mutasi data katalog, stok, dan pengaturan toko diisolasi dengan Row Level Security Supabase.
4. **Validasi Dispatch**: Order tidak dapat ditandai sebagai *Dispatched* tanpa mengisi kurir pengiriman dan nomor resi tracking yang valid.
5. **Audit Immutable**: Riwayat status pesanan, ledger stok barang, dan log audit admin bersifat *append-only*.
