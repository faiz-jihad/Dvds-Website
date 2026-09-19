ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS shipping_zones JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(shipping_zones) = 'array'),
  ADD COLUMN IF NOT EXISTS checkout_currencies TEXT[] NOT NULL DEFAULT ARRAY['GBP','USD','EUR','CAD','AUD','JPY','IDR'],
  ADD COLUMN IF NOT EXISTS international_duties_notice TEXT NOT NULL DEFAULT 'Import duties, taxes and carrier clearance fees may be collected by your destination country. These are not included in this total.';
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS base_total_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shipping_zone_name TEXT,
  ADD COLUMN IF NOT EXISTS duties_notice TEXT;

-- The existing stock reservation, price lock and idempotency logic remains one transaction.
CREATE OR REPLACE FUNCTION public.create_global_checkout_order(
  p_request_id UUID, p_request_hash TEXT, p_access_hash TEXT, p_order JSONB, p_items JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB; v_currency TEXT := p_order->>'currency'; v_rate NUMERIC := (p_order->>'exchange_rate')::NUMERIC;
BEGIN
  IF v_currency IS NULL OR v_currency NOT IN ('GBP','USD','EUR','CAD','AUD','NZD','CHF','SGD','HKD','JPY','IDR') OR v_rate IS NULL OR v_rate <= 0 THEN RAISE EXCEPTION 'Invalid order currency or exchange rate'; END IF;
  -- Allow bank transfer in any supported currency
  IF (p_order->>'total_amount')::NUMERIC <> (p_order->>'subtotal')::NUMERIC + (p_order->>'shipping_amount')::NUMERIC - (p_order->>'discount_amount')::NUMERIC
    OR (p_order->>'subtotal')::NUMERIC <> (SELECT sum((item->>'total_price')::NUMERIC) FROM jsonb_array_elements(p_items) item)
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) item WHERE (item->>'total_price')::NUMERIC <> (item->>'unit_price')::NUMERIC * (item->>'quantity')::INT)
    THEN RAISE EXCEPTION 'Order totals do not balance'; END IF;
  IF v_currency = 'JPY' AND (p_order->>'total_amount')::NUMERIC <> trunc((p_order->>'total_amount')::NUMERIC) THEN RAISE EXCEPTION 'JPY amounts must be whole numbers'; END IF;
  v_result := public.create_checkout_order(p_request_id,p_request_hash,p_access_hash,p_order,p_items);
  UPDATE public.orders SET currency=v_currency, exchange_rate=v_rate,
    exchange_rate_date=(p_order->>'exchange_rate_date')::DATE,
    base_total_amount=(p_order->>'base_total_amount')::NUMERIC,
    shipping_zone_name=p_order->>'shipping_zone_name', duties_notice=p_order->>'duties_notice'
  WHERE id=(v_result->>'id')::UUID AND exchange_rate_date IS NULL;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_global_checkout_order(UUID,TEXT,TEXT,JSONB,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_global_checkout_order(UUID,TEXT,TEXT,JSONB,JSONB) TO service_role;
NOTIFY pgrst, 'reload schema';
