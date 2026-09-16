-- Shared media metadata; uploaded files remain in the existing products bucket.
CREATE TABLE IF NOT EXISTS public.media_assets (
  id TEXT PRIMARY KEY,
  asset_data JSONB NOT NULL CHECK (jsonb_typeof(asset_data) = 'object'
    AND COALESCE(length(asset_data->>'url'), 0) > 0
    AND COALESCE(length(asset_data->>'filename'), 0) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage media library" ON public.media_assets;
CREATE POLICY "Staff manage media library" ON public.media_assets
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;

DROP TRIGGER IF EXISTS media_assets_admin_audit ON public.media_assets;
CREATE TRIGGER media_assets_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log();
DROP TRIGGER IF EXISTS homepage_config_admin_audit ON public.homepage_config;
CREATE TRIGGER homepage_config_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.homepage_config
  FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log();

-- Product fields and genre links must succeed or roll back together.
CREATE OR REPLACE FUNCTION public.save_admin_product(p_product_id UUID, p_fields JSONB, p_genre_ids UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_columns TEXT;
  v_values TEXT;
  v_updates TEXT;
  v_allowed TEXT[] := ARRAY['sku','title','slug','description','short_description','category_id',
    'format','release_year','runtime_minutes','age_rating','region_code','language','subtitles',
    'condition','price','compare_at_price','stock_quantity','cover_image_url','status',
    'is_featured','is_new_release','is_best_seller','spine_number','director','aspect_ratio',
    'audio_format','imdb_rating','imdb_id'];
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_fields IS NULL OR jsonb_typeof(p_fields) <> 'object' OR p_fields = '{}'::JSONB THEN
    RAISE EXCEPTION 'Product fields are required';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_fields) AS k WHERE NOT k = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Unsupported product field';
  END IF;
  IF p_product_id IS NOT NULL AND p_fields ? 'stock_quantity' THEN
    RAISE EXCEPTION 'Use Inventory to adjust existing stock with an audit reason';
  END IF;
  -- Identifiers are allowlisted and quoted; all values use bound parameters.
  SELECT string_agg(format('%I', k), ', '), string_agg(format('r.%I', k), ', '),
    string_agg(format('%I = r.%I', k, k), ', ')
  INTO v_columns, v_values, v_updates FROM jsonb_object_keys(p_fields) AS k;
  IF p_product_id IS NULL THEN
    EXECUTE format('INSERT INTO public.products (%s) SELECT %s FROM jsonb_populate_record(NULL::public.products, $1) r RETURNING *', v_columns, v_values)
      INTO v_product USING p_fields;
    IF v_product.stock_quantity > 0 THEN
      INSERT INTO public.inventory_movements(product_id,quantity_before,quantity_delta,quantity_after,reason,actor_id)
      VALUES (v_product.id,0,v_product.stock_quantity,v_product.stock_quantity,'Initial product stock',auth.uid());
    END IF;
  ELSE
    PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
    EXECUTE format('UPDATE public.products AS p SET %s FROM jsonb_populate_record(NULL::public.products, $1) r WHERE p.id = $2 RETURNING p.*', v_updates)
      INTO v_product USING p_fields, p_product_id;
  END IF;
  PERFORM public.set_product_genres(v_product.id, p_genre_ids);
  RETURN to_jsonb(v_product);
END;
$$;
REVOKE ALL ON FUNCTION public.save_admin_product(UUID,JSONB,UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_admin_product(UUID,JSONB,UUID[]) TO authenticated;

DO $$
DECLARE v_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_table IN ARRAY ARRAY['profiles','inventory_movements','order_status_history','admin_audit_log'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_table) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',v_table);
      END IF;
    END LOOP;
  END IF;
END;
$$;
NOTIFY pgrst, 'reload schema';
