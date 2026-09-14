-- Production operational controls for inventory, fulfilment, and auditability.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS spine_number TEXT,
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT,
  ADD COLUMN IF NOT EXISTS audio_format TEXT,
  ADD COLUMN IF NOT EXISTS director TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS inventory_reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inventory_released_at TIMESTAMPTZ;

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Compatibility for projects that previously used the legacy text-based
-- settings table. This preserves values while enforcing one live config row.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS singleton BOOLEAN DEFAULT TRUE;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS deal_ends_at TIMESTAMPTZ;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0);
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS budget_collection_threshold NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (budget_collection_threshold >= 0);
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS standard_shipping_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS standard_shipping_eta TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS express_shipping_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS express_shipping_eta TEXT NOT NULL DEFAULT '';
UPDATE public.store_settings SET singleton = TRUE WHERE singleton IS NULL;
ALTER TABLE public.store_settings ALTER COLUMN singleton SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS store_settings_singleton_true
  ON public.store_settings(singleton) WHERE singleton = TRUE;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated staff to update store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow public read on store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public can read storefront settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can manage storefront settings" ON public.store_settings;
CREATE POLICY "Public can read storefront settings" ON public.store_settings
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage storefront settings" ON public.store_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Checkout writes are service-role Edge Function responsibilities. The former
-- anonymous INSERT policies allowed totals and line prices to be forged.
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can manage own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
CREATE POLICY "Authenticated users can manage own cart" ON public.carts
  FOR ALL USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Authenticated users can manage own cart items" ON public.cart_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Public can subscribe to newsletter" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (status = 'active' AND length(trim(email)) BETWEEN 5 AND 254);

CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) NOT BETWEEN 5 AND 254 OR position('@' IN p_email) < 2 THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;
  INSERT INTO public.newsletter_subscribers(email, status)
  VALUES (lower(trim(p_email)), 'active')
  ON CONFLICT (email) DO UPDATE SET status = 'active';
END;
$$;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(TEXT) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_before INT NOT NULL,
  quantity_delta INT NOT NULL,
  quantity_after INT NOT NULL CHECK (quantity_after >= 0),
  reason TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  previous_fulfilment_status TEXT,
  new_fulfilment_status TEXT NOT NULL,
  note TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (length(trim(email)) BETWEEN 5 AND 254),
  order_reference TEXT CHECK (order_reference IS NULL OR length(trim(order_reference)) <= 100),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 5000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created
  ON public.inventory_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_created
  ON public.order_status_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created
  ON public.contact_messages(status, created_at DESC);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Admins can read order history" ON public.order_status_history;
DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Public can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins can read inventory movements" ON public.inventory_movements
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can read order history" ON public.order_status_history
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can read audit log" ON public.admin_audit_log
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Public can submit contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (status = 'new' AND assigned_to IS NULL AND internal_note IS NULL);
CREATE POLICY "Admins can manage contact messages" ON public.contact_messages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

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

GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_genres(UUID, UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_order_inventory(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_before INT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.inventory_reserved_at IS NOT NULL THEN RETURN; END IF;

  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    SELECT stock_quantity INTO v_before FROM public.products WHERE id = v_item.product_id FOR UPDATE;
    IF v_before < v_item.quantity THEN RAISE EXCEPTION 'Insufficient stock for product %', v_item.product_id; END IF;
    UPDATE public.products SET stock_quantity = stock_quantity - v_item.quantity, updated_at = NOW() WHERE id = v_item.product_id;
    INSERT INTO public.inventory_movements(product_id, quantity_before, quantity_delta, quantity_after, reason, actor_id)
    VALUES (v_item.product_id, v_before, -v_item.quantity, v_before - v_item.quantity, 'Checkout inventory reservation', NULL);
  END LOOP;

  UPDATE public.orders SET inventory_reserved_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_checkout_order(p_order_id UUID, p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET payment_status = 'paid', status = 'processing', payment_reference = p_session_id, updated_at = NOW()
  WHERE id = p_order_id AND payment_status <> 'paid' AND inventory_reserved_at IS NOT NULL AND inventory_released_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_order_inventory(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_before INT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.inventory_reserved_at IS NULL OR v_order.inventory_released_at IS NOT NULL OR v_order.payment_status = 'paid' THEN RETURN; END IF;
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    SELECT stock_quantity INTO v_before FROM public.products WHERE id = v_item.product_id FOR UPDATE;
    UPDATE public.products SET stock_quantity = stock_quantity + v_item.quantity, updated_at = NOW() WHERE id = v_item.product_id;
    INSERT INTO public.inventory_movements(product_id, quantity_before, quantity_delta, quantity_after, reason, actor_id)
    VALUES (v_item.product_id, v_before, v_item.quantity, v_before + v_item.quantity, 'Expired checkout reservation release', NULL);
  END LOOP;
  UPDATE public.orders SET inventory_released_at = NOW(), status = 'cancelled', updated_at = NOW() WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_order_inventory(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_checkout_order(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_order_inventory(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order_inventory(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_checkout_order(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_inventory(UUID) TO service_role;
