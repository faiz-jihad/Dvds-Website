-- One persistent order per checkout attempt, shared by customers and admin.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_request_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS checkout_request_hash TEXT,
  ADD COLUMN IF NOT EXISTS checkout_access_hash TEXT,
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS delivery_tier TEXT,
  ADD COLUMN IF NOT EXISTS delivery_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_details JSONB,
  ADD COLUMN IF NOT EXISTS payment_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_session_unique ON public.orders(checkout_session_id) WHERE checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_paypal_order_unique ON public.orders(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS payment_card_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS payment_paypal_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS payment_bank_transfer_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id TEXT PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read payment events" ON public.payment_events FOR SELECT USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_request_id UUID, p_request_hash TEXT, p_access_hash TEXT, p_order JSONB, p_items JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_item JSONB;
  v_order_id UUID := gen_random_uuid();
  v_number TEXT := 'AZ-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(replace(v_order_id::TEXT, '-', ''), 1, 10));
BEGIN
  IF p_request_id IS NULL OR COALESCE(length(p_request_hash),0) <> 64 OR COALESCE(length(p_access_hash),0) <> 64 THEN RAISE EXCEPTION 'Invalid checkout attempt'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::TEXT, 0));
  SELECT * INTO v_order FROM public.orders WHERE checkout_request_id = p_request_id;
  IF FOUND THEN
    IF v_order.checkout_request_hash IS DISTINCT FROM p_request_hash OR v_order.checkout_access_hash IS DISTINCT FROM p_access_hash THEN RAISE EXCEPTION 'Checkout attempt does not match'; END IF;
    RETURN jsonb_build_object('id', v_order.id);
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid checkout items'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items)) <> (SELECT count(DISTINCT item->>'product_id') FROM jsonb_array_elements(p_items) item) THEN RAISE EXCEPTION 'Duplicate product lines'; END IF;
  -- Deterministic lock order avoids deadlocks between baskets containing the same titles.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'product_id' LOOP
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
    IF NOT FOUND OR v_product.status <> 'active' THEN RAISE EXCEPTION 'A selected title is unavailable'; END IF;
    IF (v_item->>'quantity')::INT NOT BETWEEN 1 AND 20 OR v_product.stock_quantity < (v_item->>'quantity')::INT THEN RAISE EXCEPTION 'Stock changed. Please review your basket'; END IF;
    IF v_product.price <> (v_item->>'base_price')::NUMERIC THEN RAISE EXCEPTION 'Product price changed. Please review your basket'; END IF;
  END LOOP;
  INSERT INTO public.orders(id, order_number, user_id, email, status, payment_status, payment_method, payment_provider,
    fulfilment_status, subtotal, shipping_amount, discount_amount, total_amount, currency, shipping_address,
    checkout_request_id, checkout_request_hash, checkout_access_hash, delivery_tier, delivery_name, bank_details, bank_transfer_reference)
  VALUES (v_order_id, v_number, NULLIF(p_order->>'user_id','')::UUID, p_order->>'email', 'pending',
    CASE WHEN p_order->>'payment_method' = 'bank_transfer' THEN 'awaiting_payment' ELSE 'pending' END,
    p_order->>'payment_method', p_order->>'payment_provider', 'unfulfilled', (p_order->>'subtotal')::NUMERIC,
    (p_order->>'shipping_amount')::NUMERIC, (p_order->>'discount_amount')::NUMERIC, (p_order->>'total_amount')::NUMERIC,
    COALESCE(NULLIF(p_order->>'currency',''), 'GBP'), p_order->'shipping_address', p_request_id, p_request_hash, p_access_hash, p_order->>'delivery_tier', p_order->>'delivery_name', p_order->'bank_details',
    CASE WHEN p_order->>'payment_method' = 'bank_transfer' THEN v_number ELSE NULL END);
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items(order_id, product_id, product_title, product_sku, quantity, unit_price, total_price, product_snapshot)
    VALUES (v_order_id, (v_item->>'product_id')::UUID, v_item->>'product_title', v_item->>'product_sku',
      (v_item->>'quantity')::INT, (v_item->>'unit_price')::NUMERIC, (v_item->>'total_price')::NUMERIC,
      jsonb_build_object('cover_image_url', v_item->>'cover_image_url'));
  END LOOP;
  PERFORM public.reserve_order_inventory(v_order_id);
  INSERT INTO public.order_status_history(order_id, new_status, new_fulfilment_status, note)
  VALUES (v_order_id, 'pending', 'unfulfilled', 'Checkout created; awaiting payment');
  RETURN jsonb_build_object('id', v_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_checkout_payment(
  p_order_id UUID, p_provider TEXT, p_provider_order_id TEXT, p_reference TEXT, p_amount NUMERIC, p_currency TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE; v_review BOOLEAN;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_provider NOT IN ('stripe','paypal') OR v_order.payment_provider <> p_provider OR v_order.total_amount <> p_amount OR upper(p_currency) <> v_order.currency THEN RAISE EXCEPTION 'Payment does not match the order'; END IF;
  IF p_provider = 'stripe' AND v_order.checkout_session_id IS NOT NULL AND v_order.checkout_session_id <> p_provider_order_id THEN RAISE EXCEPTION 'Stripe session mismatch'; END IF;
  IF p_provider = 'paypal' AND v_order.paypal_order_id IS DISTINCT FROM p_provider_order_id THEN RAISE EXCEPTION 'PayPal order mismatch'; END IF;
  IF v_order.payment_status IN ('paid','refunded','partially_refunded') THEN RETURN; END IF;
  v_review := v_order.status = 'cancelled' OR v_order.inventory_released_at IS NOT NULL;
  UPDATE public.orders SET payment_status = 'paid', status = CASE WHEN v_review THEN 'pending' ELSE 'processing' END,
    paid_at = COALESCE(paid_at, NOW()), payment_reference = p_reference,
    checkout_session_id = CASE WHEN p_provider = 'stripe' THEN p_provider_order_id ELSE checkout_session_id END,
    paypal_capture_id = CASE WHEN p_provider = 'paypal' THEN p_reference ELSE paypal_capture_id END,
    payment_review_required = v_review,
    internal_notes = CASE WHEN v_review THEN concat_ws(E'\n', internal_notes, 'Payment received after cancellation. Review stock or refund before fulfilment.') ELSE internal_notes END,
    updated_at = NOW() WHERE id = p_order_id;
  INSERT INTO public.payment_events(id, order_id, provider, event_type, amount)
  VALUES (p_provider || ':paid:' || p_reference, p_order_id, p_provider, 'paid', p_amount) ON CONFLICT DO NOTHING;
  INSERT INTO public.admin_audit_log(table_name, record_id, action, before_data, after_data)
  VALUES ('orders', p_order_id::TEXT, 'UPDATE', jsonb_build_object('payment_status', v_order.payment_status), jsonb_build_object('payment_status','paid','provider',p_provider,'reference',p_reference,'review_required',v_review));
  INSERT INTO public.order_status_history(order_id, previous_status, new_status, previous_fulfilment_status, new_fulfilment_status, note)
  VALUES (p_order_id, v_order.status, CASE WHEN v_review THEN 'pending' ELSE 'processing' END, v_order.fulfilment_status, v_order.fulfilment_status, 'Payment verified by ' || p_provider);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_checkout_order(p_order_id UUID, p_provider_order_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.payment_status IN ('paid','refunded','partially_refunded') OR v_order.status = 'cancelled' THEN RETURN; END IF;
  IF (v_order.checkout_session_id IS NOT NULL AND v_order.checkout_session_id IS DISTINCT FROM p_provider_order_id) OR (p_provider_order_id IS NOT NULL AND v_order.payment_provider <> 'stripe') THEN RAISE EXCEPTION 'Session mismatch'; END IF;
  PERFORM public.release_order_inventory(p_order_id);
  UPDATE public.orders SET payment_status='failed', status='cancelled', updated_at=NOW() WHERE id=p_order_id;
  INSERT INTO public.order_status_history(order_id, previous_status, new_status, previous_fulfilment_status, new_fulfilment_status, note)
  VALUES (p_order_id, v_order.status, 'cancelled', v_order.fulfilment_status, v_order.fulfilment_status, 'Payment session expired; stock released');
END;
$$;

CREATE OR REPLACE FUNCTION public.record_checkout_refund(p_order_id UUID, p_event_id TEXT, p_amount NUMERIC, p_cumulative BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE; v_amount NUMERIC; v_status TEXT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.payment_status NOT IN ('paid','partially_refunded','refunded') THEN RAISE EXCEPTION 'Payment has not synchronized yet'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_order.total_amount THEN RAISE EXCEPTION 'Invalid refund amount'; END IF;
  INSERT INTO public.payment_events(id,order_id,provider,event_type,amount)
  VALUES (v_order.payment_provider || ':refund:' || p_event_id,p_order_id,v_order.payment_provider,'refund',p_amount) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  v_amount := CASE WHEN p_cumulative THEN greatest(v_order.refunded_amount,p_amount) ELSE v_order.refunded_amount+p_amount END;
  IF v_amount > v_order.total_amount THEN RAISE EXCEPTION 'Refund exceeds order total'; END IF;
  v_status := CASE WHEN v_amount=v_order.total_amount THEN 'refunded' ELSE 'partially_refunded' END;
  UPDATE public.orders SET refunded_amount=v_amount,payment_status=v_status,status=CASE WHEN v_status='refunded' THEN 'refunded' ELSE status END,updated_at=NOW() WHERE id=p_order_id;
  INSERT INTO public.admin_audit_log(table_name,record_id,action,before_data,after_data)
  VALUES ('orders',p_order_id::TEXT,'UPDATE',jsonb_build_object('refunded_amount',v_order.refunded_amount),jsonb_build_object('refunded_amount',v_amount,'payment_status',v_status));
END;
$$;

REVOKE ALL ON FUNCTION public.create_checkout_order(UUID,TEXT,TEXT,JSONB,JSONB) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_checkout_payment(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.expire_checkout_order(UUID,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_checkout_refund(UUID,TEXT,NUMERIC,BOOLEAN) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(UUID,TEXT,TEXT,JSONB,JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_checkout_payment(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_checkout_order(UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_checkout_refund(UUID,TEXT,NUMERIC,BOOLEAN) TO service_role;
NOTIFY pgrst, 'reload schema';

-- Browser clients read orders through RLS. Only verified server/admin RPCs mutate them.
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
ALTER TABLE public.store_settings ALTER COLUMN bank_sort_code SET DEFAULT '';
ALTER TABLE public.store_settings ALTER COLUMN bank_account_number SET DEFAULT '';
ALTER TABLE public.store_settings ALTER COLUMN bank_iban SET DEFAULT '';
-- Remove the previous template account, without overwriting a configured account.
UPDATE public.store_settings SET bank_sort_code='', bank_account_number='', bank_iban=''
WHERE bank_sort_code='20-00-00' AND bank_account_number='13894195';

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
  v_payment_review BOOLEAN;
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

  SELECT status, fulfilment_status, payment_status, inventory_reserved_at, inventory_released_at, payment_review_required
  INTO v_previous_status, v_previous_fulfilment, v_payment_status, v_inventory_reserved_at, v_inventory_released_at, v_payment_review
  FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_payment_review AND p_status IN ('processing','dispatched','delivered') THEN RAISE EXCEPTION 'Payment requires review before fulfilment'; END IF;
  IF p_status IN ('dispatched', 'delivered') AND v_payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Only paid orders can be dispatched or delivered';
  END IF;
  IF p_status = 'dispatched' AND v_previous_status <> 'processing' THEN
    RAISE EXCEPTION 'Only processing orders can be dispatched';
  END IF;
  IF p_status = 'delivered' AND v_previous_status <> 'dispatched' THEN
    RAISE EXCEPTION 'Only dispatched orders can be delivered';
  END IF;
  IF v_previous_status IN ('delivered', 'cancelled', 'refunded') THEN
    RAISE EXCEPTION 'Terminal orders cannot be transitioned';
  END IF;
  IF p_status = 'cancelled' THEN
    IF v_payment_status IN ('paid','partially_refunded','refunded') THEN RAISE EXCEPTION 'Paid orders require a verified provider refund workflow'; END IF;
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
