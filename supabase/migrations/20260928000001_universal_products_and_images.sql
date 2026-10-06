-- ============================================================================
-- Migration: Universal Products and Multi-Image Support (Up to 6 Images)
-- Allows the store to sell all product types (not just DVD films)
-- ============================================================================

-- 1. Ensure product_images table exists
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for speedy gallery loading
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort 
  ON public.product_images(product_id, sort_order ASC);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Public can view product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' AND policyname = 'Public can view product images'
  ) THEN
    CREATE POLICY "Public can view product images" 
      ON public.product_images FOR SELECT USING (true);
  END IF;
END $$;

-- Admins can manage product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' AND policyname = 'Admins can manage product images'
  ) THEN
    CREATE POLICY "Admins can manage product images" 
      ON public.product_images FOR ALL 
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 2. Drop legacy constraints on format so the store can sell all kinds of goods
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_format_check;
ALTER TABLE public.products ADD CONSTRAINT products_format_check 
  CHECK (format IN ('DVD', 'Blu-ray', '4K UHD', 'Box Set', 'Standard', 'Merchandise', 'Physical'));

-- 3. Drop legacy constraints on age_rating so non-age-restricted items can use 'All'
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_age_rating_check;
ALTER TABLE public.products ADD CONSTRAINT products_age_rating_check 
  CHECK (age_rating IN ('U', 'PG', '12', '15', '18', 'All'));
