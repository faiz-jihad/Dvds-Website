-- ====================================================================
-- AZ RAYAN DVDs — SETUP SUPABASE STORAGE BUCKET UNTUK GAMBAR PRODUK
-- ====================================================================
-- Jalankan script ini di Supabase Dashboard -> SQL Editor -> RUN
-- ====================================================================

-- 1. Buat Bucket 'products' sebagai Public Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880, -- Maksimal 5MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 5242880;

-- 2. Policy: Publik bebas melihat gambar produk (Storefront Read)
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- 3. Policy: Admin & Store Manager dapat mengupload gambar
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products');

-- 4. Policy: Admin dapat update & hapus gambar
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'products');
