-- Keep customer-facing catalogue and operational settings synchronized with
-- admin changes through Supabase Realtime.

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products',
    'categories',
    'genres',
    'product_genres',
    'promotions',
    'store_settings',
    'homepage_config',
    'orders',
    'contact_messages'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

NOTIFY pgrst, 'reload schema';
