# Pemeriksaan fitur admin — 15 September 2026

## Status

Perbaikan kode sudah diuji dengan mock API dan PostgreSQL lokal terisolasi (PGlite).
Pengujian database menjalankan seluruh file migrasi, termasuk perbaikan baru,
kemudian memeriksa penyimpanan, transaksi, audit, dan izin baris (RLS).

Hasil lokal: **55 tes lulus**. Build TypeScript dan Vite juga berhasil.

Database live **belum siap untuk seluruh fitur**. Pemeriksaan read-only melalui
`node src/scripts/testDb.js` menemukan:

- Kolom `store_settings.registered_company_name` belum ada.
- RPC `admin_set_user_role` belum ada.
- RPC `confirm_bank_transfer_payment(p_order_id, p_note)` belum ada.
- RPC `admin_delete_user` belum ada.

Tidak ada kredensial pengelolaan database atau sesi admin live yang tersedia
untuk menerapkan migrasi dan menguji perubahan live. Browser pengujian juga
tidak tersedia dalam sesi ini. Kelulusan tes lokal tidak membuktikan seluruh
interaksi browser dan layanan live sudah berjalan.

## Perbaikan

| Area | Perilaku setelah perbaikan |
| --- | --- |
| Login | Memerlukan Supabase Auth dan role admin/staff. Password salah tidak membuat sesi demo. Remember me memilih penyimpanan sesi. |
| Produk, kategori, genre, promo | Membaca data live; penolakan server ditampilkan sebagai error. Data lokal lama tidak menimpa storefront. |
| Produk | Arsip disimpan di database. Penghapusan dengan riwayat transaksi/stok meminta penggunaan arsip. Retry setelah genre gagal tidak membuat produk baru lagi. |
| Stok | Perubahan stok produk yang sudah ada dilakukan melalui Inventory dengan alasan dan ledger. Form produk tidak menimpa stok dari data lama. |
| Gambar | Unggahan ke bucket products, batas 5 MB, penolakan upload tidak dianggap berhasil. URL gambar dapat digunakan pengunjung lain. Metadata pustaka media tetap tersimpan per perangkat. |
| Orders | Perubahan status memakai RPC; pembayaran dan tracking diperiksa server. |
| Transfer bank | Khusus admin; memvalidasi metode/status, menyimpan catatan, waktu pembayaran, aktor, audit, dan riwayat status dalam satu transaksi. Retry tidak mengulang konfirmasi. |
| Users & Access | Khusus admin. Staf tidak dapat menaikkan role. Admin tidak dapat menghapus/menurunkan role sendiri. Hapus pengguna menghapus akun Auth dan profil, sambil mempertahankan order. |
| Homepage Builder | Draft dan publish tersimpan di server; kegagalan simpan/publish/revert ditampilkan. Sumber cache produk konsisten dengan admin. |
| Settings | Penyimpanan pertama memakai UUID database; perubahan tersimpan di singleton yang benar. Refresh tidak menimpa form yang sedang diedit. |
| Dashboard, audit, support | Data live, pembacaan error tidak disamarkan sebagai daftar kosong. Pendapatan harian menggunakan tanggal pembayaran jika tersedia. |
| Promotions | Waktu edit menggunakan waktu lokal; tanggal kedaluwarsa dapat dikosongkan. |

## Mengaktifkan di database live

1. Terapkan semua migrasi yang belum diterapkan dalam urutan nama file dari
   `supabase/migrations`. Jika proyek Supabase CLI sudah terhubung, gunakan
   `supabase db push`. Untuk SQL Editor, jalankan masing-masing migrasi yang
   masih tertinggal secara berurutan. Jangan gunakan `setup_complete.sql`
   sebagai pengganti migrasi operasional.
2. Pemeriksaan live menunjukkan bagian ini perlu diperiksa/dilengkapi:
   - `20260914000006_company_identity.sql`
   - `20260914000007_rbac_user_management.sql`
   - `20260914000008_payment_system_upgrade.sql`
   - `20260915000001_admin_reliability.sql`
3. Jalankan `node src/scripts/testDb.js` kembali. Pemeriksaan ini tidak melakukan
   transaksi pada produk/order nyata dan tidak menguji kredensial admin.
4. Masuk melalui `/admin/login` menggunakan akun Supabase Auth dengan
   `profiles.role = 'admin'`. Variabel `VITE_DEMO_ADMIN_*` tidak lagi memberikan
   akses operasional.
5. Uji melalui UI pada data pengujian: CRUD produk/taksonomi/promo, upload,
   penyesuaian stok, support, settings, draft/publish/revert, role dan hapus
   akun pengujian, lalu logout/login. Uji konfirmasi bank dan fulfilment pada
   order pengujian dengan penerimaan pembayaran yang sudah diverifikasi.

Katalog live saat pemeriksaan tidak memiliki produk aktif yang terlihat oleh
pengunjung. Produk draft harus diterbitkan melalui admin sebelum tampil di toko.

## Menjalankan pemeriksaan lokal

```sh
npm test
npm run build
```

Tes menggunakan database lokal di memori, tanpa kredensial `.env` dan tanpa
mengubah data Supabase live. Penerapan migrasi dan pemeriksaan browser live
tetap menjadi langkah terpisah sebelum rilis.
