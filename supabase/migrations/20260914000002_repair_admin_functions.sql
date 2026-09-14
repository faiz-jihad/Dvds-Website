-- Repair partially provisioned projects where operational tables exist but
-- admin RPCs/triggers were not registered in the PostgREST schema cache.

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id UUID,
  p_delta INT,
  p_reason TEXT
)
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before INT;
  v_after INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_delta = 0 OR length(trim(COALESCE(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'A non-zero adjustment and reason are required';
  END IF;

  SELECT stock_quantity INTO v_before
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  v_after := v_before + p_delta;
  IF v_after < 0 THEN RAISE EXCEPTION 'Stock cannot become negative'; END IF;

  UPDATE public.products
  SET stock_quantity = v_after, updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO public.inventory_movements
    (product_id, quantity_before, quantity_delta, quantity_after, reason, actor_id)
  VALUES
    (p_product_id, v_before, p_delta, v_after, p_reason, auth.uid());

  RETURN QUERY SELECT * FROM public.products WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id UUID,
  p_status TEXT,
  p_fulfilment_status TEXT,
  p_carrier TEXT DEFAULT NULL,
  p_tracking_number TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_status TEXT;
  v_previous_fulfilment TEXT;
  v_payment_status TEXT;
  v_inventory_reserved_at TIMESTAMPTZ;
  v_inventory_released_at TIMESTAMPTZ;
  v_item RECORD;
  v_before INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('pending', 'processing', 'dispatched', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;
  IF p_fulfilment_status NOT IN ('unfulfilled', 'fulfilled', 'returned') THEN
    RAISE EXCEPTION 'Invalid fulfilment status';
  END IF;
  IF p_status = 'dispatched' AND (p_carrier IS NULL OR trim(p_carrier) = '' OR p_tracking_number IS NULL OR trim(p_tracking_number) = '') THEN
    RAISE EXCEPTION 'Carrier and tracking number are required for dispatch';
  END IF;

  SELECT status, fulfilment_status, payment_status, inventory_reserved_at, inventory_released_at
  INTO v_previous_status, v_previous_fulfilment, v_payment_status, v_inventory_reserved_at, v_inventory_released_at
  FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_status IN ('dispatched', 'delivered') AND v_payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Only paid orders can be dispatched or delivered';
  END IF;
  IF p_status = 'dispatched' AND v_previous_status <> 'processing' THEN
    RAISE EXCEPTION 'Only processing orders can be dispatched';
  END IF;
  IF p_status = 'delivered' AND v_previous_status <> 'dispatched' THEN
    RAISE EXCEPTION 'Only dispatched orders can be delivered';
  END IF;
  IF v_previous_status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Terminal orders cannot be transitioned';
  END IF;
  IF p_status = 'cancelled' THEN
    IF v_payment_status = 'paid' THEN RAISE EXCEPTION 'Paid orders require a verified Stripe refund workflow'; END IF;
    IF length(trim(COALESCE(p_note, ''))) < 3 THEN RAISE EXCEPTION 'A cancellation reason is required'; END IF;
    IF v_inventory_reserved_at IS NOT NULL AND v_inventory_released_at IS NULL THEN
      FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
        SELECT stock_quantity INTO v_before FROM public.products WHERE id = v_item.product_id FOR UPDATE;
        UPDATE public.products SET stock_quantity = stock_quantity + v_item.quantity, updated_at = NOW() WHERE id = v_item.product_id;
        INSERT INTO public.inventory_movements(product_id, quantity_before, quantity_delta, quantity_after, reason, actor_id)
        VALUES (v_item.product_id, v_before, v_item.quantity, v_before + v_item.quantity, 'Order cancellation: ' || trim(p_note), auth.uid());
      END LOOP;
      UPDATE public.orders SET inventory_released_at = NOW() WHERE id = p_order_id;
    END IF;
  END IF;

  UPDATE public.orders
  SET status = p_status,
      fulfilment_status = p_fulfilment_status,
      shipping_carrier = COALESCE(p_carrier, shipping_carrier),
      tracking_number = COALESCE(p_tracking_number, tracking_number),
      internal_notes = CASE WHEN p_note IS NULL THEN internal_notes ELSE p_note END,
      dispatched_at = CASE WHEN p_status = 'dispatched' THEN COALESCE(dispatched_at, NOW()) ELSE dispatched_at END,
      delivered_at = CASE WHEN p_status = 'delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
      updated_at = NOW()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history
    (order_id, previous_status, new_status, previous_fulfilment_status, new_fulfilment_status, note, actor_id)
  VALUES
    (p_order_id, v_previous_status, p_status, v_previous_fulfilment, p_fulfilment_status, p_note, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.set_product_genres(p_product_id UUID, p_genre_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN RAISE EXCEPTION 'Product not found'; END IF;
  SELECT COALESCE(jsonb_agg(genre_id ORDER BY genre_id), '[]'::JSONB) INTO v_before
  FROM public.product_genres WHERE product_id = p_product_id;
  DELETE FROM public.product_genres WHERE product_id = p_product_id;
  INSERT INTO public.product_genres(product_id, genre_id)
  SELECT p_product_id, selected.genre_id
  FROM unnest(COALESCE(p_genre_ids, ARRAY[]::UUID[])) AS selected(genre_id)
  ON CONFLICT DO NOTHING;
  SELECT COALESCE(jsonb_agg(genre_id ORDER BY genre_id), '[]'::JSONB) INTO v_after
  FROM public.product_genres WHERE product_id = p_product_id;
  IF v_before IS DISTINCT FROM v_after THEN
    INSERT INTO public.admin_audit_log(actor_id, table_name, record_id, action, before_data, after_data)
    VALUES (auth.uid(), 'product_genres', p_product_id::TEXT, 'UPDATE', jsonb_build_object('genre_ids', v_before), jsonb_build_object('genre_ids', v_after));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.write_admin_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log(actor_id, table_name, record_id, action, before_data, after_data)
  VALUES (
    auth.uid(), TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT), TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS products_admin_audit ON public.products;
CREATE TRIGGER products_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log();
DROP TRIGGER IF EXISTS promotions_admin_audit ON public.promotions;
CREATE TRIGGER promotions_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log();
DROP TRIGGER IF EXISTS store_settings_admin_audit ON public.store_settings;
CREATE TRIGGER store_settings_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log();
DROP TRIGGER IF EXISTS categories_admin_audit ON public.categories;
CREATE TRIGGER categories_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log();
DROP TRIGGER IF EXISTS genres_admin_audit ON public.genres;
CREATE TRIGGER genres_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.genres
  FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log();
DROP TRIGGER IF EXISTS contact_messages_admin_audit ON public.contact_messages;
CREATE TRIGGER contact_messages_admin_audit AFTER UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log();

GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_genres(UUID, UUID[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
