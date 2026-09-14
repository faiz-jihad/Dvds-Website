-- Product ratings displayed to customers must be explicit operational data.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS imdb_rating NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS imdb_id TEXT;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_imdb_rating_range,
  ADD CONSTRAINT products_imdb_rating_range
    CHECK (imdb_rating IS NULL OR imdb_rating BETWEEN 0 AND 10);

NOTIFY pgrst, 'reload schema';
