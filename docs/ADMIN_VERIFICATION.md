# Pemeriksaan fitur admin — 16 September 2026

## Hasil

Kode diperiksa menggunakan tes API, render React, dan PostgreSQL lokal terisolasi
(PGlite). Tes database menjalankan semua migrasi, lalu memeriksa transaksi,
penyimpanan, izin pengguna, dan audit. Pengujian ini tidak mengubah data live.

Hasil akhir: **95 tes lulus, 0 gagal**; build TypeScript dan Vite berhasil.

**Database live belum siap untuk seluruh fitur.** Pemeriksaan read-only terakhir
menemukan `orders.payment_method`, `store_settings.registered_company_name`,
`payment_events`, dan `media_assets` belum tersedia. Query berhenti pada kolom
pertama yang hilang, sehingga kolom lanjutan juga perlu dilengkapi melalui repair.
Tabel profil, produk, kategori, genre, promosi, support, dan audit dapat diperiksa,
tetapi keberadaan tabel saja tidak membuktikan izin/RPC admin sudah berfungsi.

Tidak tersedia koneksi pengelolaan database untuk menerapkan SQL atau browser
terhubung untuk uji klik dengan sesi admin. Pembayaran provider live belum diuji;
konfigurasi server dan webhook mengikuti `PAYMENT_GATEWAY_SETUP.md`.

## Cakupan seluruh menu

| Menu | Perbaikan dan bukti lokal |
| --- | --- |
| Dashboard | Pendapatan berdasarkan pembayaran nyata, dikurangi refund; database tanpa settings ditandai belum dikonfigurasi. Perubahan settings memperbarui ringkasan. |
| Homepage Builder | Draft/publish/revert tersimpan di server. Semua 8 jenis bagian yang dipublikasikan tampil sesuai urutan, status aktif dan jadwal. Template toko lama dipakai sampai publikasi pertama. Refresh tidak menimpa form yang sedang diedit. |
| Products | Produk dan genre disimpan dalam satu transaksi. Genre tidak valid membatalkan seluruh simpan, termasuk stok dan audit. Edit metadata tidak menimpa stok; runtime kosong tidak membuat editor gagal. |
| Categories | CRUD kategori/genre memakai database. Kategori atau genre yang dihapus tidak muncul kembali dari cache demo di storefront. |
| Inventory | Penyesuaian stok memakai RPC atomik, alasan dan ledger. Jumlah pecahan/negatif tidak valid ditolak. Stok awal produk baru juga tercatat. Error settings ditampilkan, bukan memakai ambang contoh. |
| Orders | Pembayaran, konfirmasi bank, tracking, dispatch/delivery, pelepasan stok, refund dan idempotensi diuji. Riwayat pelanggan hanya berasal dari pesanan database miliknya. |
| Promotions | Simpan, pause, hapus, izin akses dan persistensi diuji. Mengosongkan waktu mulai mengaktifkan jadwal mulai sekarang. Perubahan promo menyegarkan kutipan checkout. |
| Support | Status, penanggung jawab dan catatan internal tersimpan; penolakan server menjadi error. Penyimpanan memperbarui audit. |
| Users & Access | Role/hapus akun dibatasi admin. Staf tidak dapat menaikkan hak akses; admin tidak dapat menghapus/menurunkan role sendiri. Hapus akun mempertahankan pesanan. |
| Store Settings | Singleton tersimpan dengan UUID database. Settings kosong dapat dikonfigurasi; refresh tidak menimpa edit. Pembayaran dan pengiriman menggunakan pengaturan server. |
| Audit Log | Mencatat produk, genre, stok, pesanan, settings, role, homepage dan media. Cache memakai nama query yang benar dan diperbarui setelah perubahan admin. |

Pustaka media kini menyimpan metadata bersama di `media_assets`, dengan izin
admin/staf. File gambar tetap berada di bucket `products`. URL gambar yang sudah
tersimpan di produk/homepage tetap digunakan; metadata pustaka lokal lama tidak
diimpor otomatis. Penghapusan entri pustaka tidak menghapus file yang mungkin
masih dipakai produk/homepage.

## Aktivasi live

1. Buka **SQL Editor** pada proyek Supabase yang digunakan aplikasi.
2. Jalankan seluruh isi [repair_admin_schema.sql](../supabase/repair_admin_schema.sql)
   sebagai satu transaksi. File ini juga tersedia lewat **Download repair SQL**
   pada halaman admin yang terhambat.
3. Klik **Recheck database**. Jalankan `node src/scripts/testDb.js` untuk memeriksa
   kembali kolom semua menu. Script hanya menggunakan GET dengan `limit=0`;
   tidak memanggil RPC mutasi atau membaca isi record.
4. Masuk sebagai admin Supabase, lalu uji alur di tabel di atas dengan data uji.
   Uji juga akun staf untuk memastikan batas akses. Pembayaran provider perlu
   diverifikasi menggunakan konfigurasi dan webhook sesuai panduan pembayaran.

Repair mengisi kolom identitas perusahaan yang hilang tanpa menimpa identitas
yang sudah disimpan. Repair menambahkan fungsi pembayaran, akses admin,
penyimpanan produk atomik, pustaka media dan audit. Tidak ada impor ulang katalog,
pembuatan akun admin atau penggantian password. Tes memeriksa repair pada schema
lama serta dua kali pada database yang telah diperbarui tanpa kehilangan data.

Untuk proyek dengan riwayat migrasi Supabase CLI, gunakan migrasi berurutan;
eksekusi SQL Editor tidak memperbarui ledger migrasi CLI.

## Perintah verifikasi

```sh
npm test
npm run build
node src/scripts/testDb.js
```

Tes dan build lokal tidak membuktikan seluruh interaksi browser, konfigurasi
provider, dan layanan live sudah berfungsi. Hasil live tetap harus diverifikasi
setelah migrasi diterapkan.
