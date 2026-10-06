# AZ Rayan DVDs — Email & Business Reporting System

Sistem email dan pelaporan bisnis AZ Rayan DVDs dirancang dengan pemisahan tegas (*strict separation*) antara dua peruntukan yang berbeda:

1. **CUSTOMER (Pelanggan)**: Struk pembayaran resmi / bukti pembelian (*payment receipt / proof of purchase*) yang dikirimkan secara otomatis setelah pembayaran terverifikasi oleh webhook Stripe.
2. **ADMIN (Pemilik Toko)**: Laporan kinerja bisnis eksekutif berkala (*weekly & monthly business performance reports*) untuk memantau performa penjualan, produk terlaris, pengeluaran operasional, dan laba bersih.

Kedua sistem ini berjalan secara independen dan tidak saling mencampur aduk.

---

## 1. Arsitektur & Alur Kerja (Workflows)

### A. Customer Payment Receipt Flow

```text
Pelanggan Menyelesaikan Pembayaran (Stripe / Gateway)
                        │
                        ▼
Stripe Mengirim Webhook ke /api/stripe-webhook
                        │
                        ▼
Verifikasi Tanda Tangan Kriptografis Webhook (stripe.webhooks.constructEvent)
                        │
                        ▼
Pemeriksaan Idempotensi (payment_events & email_logs)
                        │
                        ▼
Konfirmasi Status Pesanan di Database (payment_status = 'paid')
                        │
                        ▼
Ambil Data Item Terverifikasi dari Database (orders + order_items)
                        │
                        ▼
Kirim Struk Email Resmi via Resend / SendGrid
                        │
                        ▼
Catat orders.receipt_sent_at = NOW() & Log ke email_logs
```

#### Aturan Bisnis Struk Pelanggan:
- **Hanya Dikirim Setelah Verifikasi Webhook**: Tidak pernah dipicu hanya karena pelanggan mengunjungi `/order-success` atau halaman konfirmasi frontend.
- **Kerahasiaan Data Pembayaran**: Tidak pernah mencantumkan nomor kartu penuh (*full PAN*), CVV, atau token kredensial rahasia.
- **Identitas & Branding**: Menggunakan branding resmi AZ Rayan DVDs (Blue / Red / Black / White), mobile-friendly, dan menyerupai kuitansi toko e-commerce resmi.
- **Tombol Aksi**: Menyertakan tombol *"View Order"* yang mengarahkan pelanggan kembali ke halaman detail pesanan mereka.
- **Idempotensi**: Mencegah pengiriman struk ganda jika Stripe mengirimkan pengulangan webhook (*webhook retries*).

---

### B. Admin Business Reporting Flow

Admin menerima laporan ringkasan berkala tanpa menerima notifikasi per transaksi tunggal.

```text
Vercel Cron Trigger (0 8 * * * UTC) ──► GET /api/cron-reports
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
         Hari Senin Pagi?                                              Tanggal 1 Bulan Baru?
                 │                                                             │
                 ▼                                                             ▼
      Weekly Business Report                                        Monthly Business Report
(Senin 00:00 - Minggu 23:59 UTC lalu)                         (Tgl 1 - Tgl akhir bulan kalender lalu)
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                │
                                                ▼
                     Hitung Metrik Berbasis Database Supabase:
                     - Total Pendapatan Bersih (Hanya pesanan paid)
                     - Jumlah Pesanan & Total Unit Terjual
                     - Average Order Value (AOV)
                     - Produk Terlaris (Berdasarkan kuantitas & revenue)
                     - Pengeluaran Terdistribusi (Tabel expenses)
                     - Pengurangan Refund (Penuh & Parsial)
                     - Estimasi Laba vs Net Revenue After Expenses
                                                │
                                                ▼
                     Format Email Eksekutif & Kirim ke ADMIN_EMAIL
                                                │
                                                ▼
                    Simpan Riwayat ke Tabel report_history (status: sent / failed)
```

---

## 2. Kalkulasi Keuangan & Integritas Data

Sistem pelaporan **tidak pernah memalsukan angka (*never invent numbers*)**, melainkan menghitung langsung dari database:

1. **Pendapatan Kotor (Gross Revenue)**:
   - Hanya menghitung pesanan dengan `payment_status = 'paid'`.
   - Mengabaikan pesanan yang dibatalkan (*cancelled*), pending, gagal, atau kedaluwarsa.
2. **Pengurangan Pengembalian Dana (Refunds)**:
   - Mengurangi nilai `refunded_amount` secara proporsional.
3. **Pengeluaran Operasional (Expenses)**:
   - Ditarik langsung dari tabel `expenses` untuk periode waktu terkait.
4. **Pembedaan "Estimated Profit" vs "Net Revenue After Recorded Expenses"**:
   - Jika data harga modal produk (`products.cost_price` / COGS) belum lengkap:
     $$\text{Net Revenue After Recorded Expenses} = \text{Revenue} - \text{Refunds} - \text{Recorded Expenses}$$
   - Hanya jika seluruh produk yang terjual memiliki data `cost_price` yang valid, sistem melabelinya sebagai:
     $$\text{Estimated Profit} = \text{Revenue} - \text{COGS} - \text{Refunds} - \text{Recorded Expenses}$$

---

## 3. Manajemen Pengeluaran (Expense System)

Admin dapat mencatat dan mengelola pengeluaran operasional toko melalui dashboard `/admin/reports`:

- **Kategori Pengeluaran**:
  - `shipping` (Biaya pengiriman kurir)
  - `packaging` (Kardus, bubble wrap, stiker pengaman)
  - `payment_fees` (Biaya potongan Stripe / gateway)
  - `inventory` (Pembelian stok fisik)
  - `marketing` (Iklan sosial media / kampanye)
  - `website_domain` (Domain & DNS)
  - `vps_hosting` (Hosting & server)
  - `other` (Pengeluaran lain-lain)
- **Data Tersimpan**: Deskripsi, Kategori, Nominal (£), Tanggal, dan Catatan Opsional.

---

## 4. Konfigurasi Environment & Penyedia Email

Konfigurasikan variabel berikut di platform hosting (misal: Vercel Project Settings > Environment Variables):

| Variabel | Keterangan | Contoh Nilai |
| :--- | :--- | :--- |
| `ADMIN_EMAIL` | Alamat email tujuan laporan mingguan dan bulanan | `admin@azrayan.co.uk` |
| `EMAIL_FROM` | Alamat pengirim struk dan laporan | `AZ Rayan DVDs <orders@azrayan.co.uk>` |
| `RESEND_API_KEY` | *(Pilihan Utama)* API Key dari penyedia [Resend](https://resend.com) | `re_123456789...` |
| `SENDGRID_API_KEY` | *(Pilihan Alternatif)* API Key dari [SendGrid](https://sendgrid.com) | `SG.xxxxxxxx...` |
| `CRON_SECRET` | Token rahasia otentikasi untuk pemanggilan cron endpoint | `random-32-char-token` |
| `STRIPE_WEBHOOK_SECRET`| Rahasia tanda tangan webhook Stripe | `whsec_xxxxxxxx...` |

> **Mode Simulasi (Development)**: Jika `RESEND_API_KEY` dan `SENDGRID_API_KEY` tidak diisi (misal saat testing lokal), modul email otomatis beralih ke mode simulasi aman. Log pengiriman akan dicatat di konsol server tanpa error atau menghentikan alur pembayaran.

---

## 5. Jadwal Cron di Vercel (`vercel.json`)

Jadwal otomatisasi laporan dikonfigurasi melalui Vercel Cron:

```json
{
  "crons": [
    {
      "path": "/api/cron-reports",
      "schedule": "0 8 * * *"
    }
  ]
}
```

- Endpoint dipanggil setiap hari pukul 08:00 UTC.
- Pada hari Senin, cron memproses **Laporan Mingguan** (Senin s/d Minggu sebelumnya).
- Pada tanggal 1 setiap bulan, cron memproses **Laporan Bulanan** (Bulan kalender sebelumnya).

---

## 6. Riwayat Laporan & Penanganan Kegagalan (Failure Recovery)

- Setiap laporan yang dihasilkan disimpan di tabel `report_history` beserta snapshot metrik JSON.
- Jika email gagal terkirim (misal karena kuota API email habis), status disimpan sebagai `status = 'failed'` dengan detail pesan error di `error_message`.
- Admin dapat meninjau riwayat laporan di dashboard `/admin/reports` dan mengklik tombol **"Resend"** kapan saja untuk mengirim ulang laporan yang gagal.
- Admin juga dapat mengklik tombol **"Trigger Report Now"** untuk menghasilkan laporan langsung tanpa menunggu jadwal cron.

---

## 7. Skema Database Terkait

Migration file: `supabase/migrations/20261007000001_business_reports_and_expenses.sql`

- **Tabel `expenses`**: Menyimpan pengeluaran operasional toko.
- **Tabel `report_history`**: Menyimpan histori pengiriman laporan mingguan & bulanan.
- **Tabel `email_logs`**: Menyimpan audit log pengiriman email struk pelanggan & laporan admin.
- **Kolom `orders.receipt_sent_at`**: Timestamp penanda struk telah terkirim.
- **Kolom `products.cost_price`**: Harga modal produk untuk kalkulasi COGS.
