-- 20260919000001_order_expiration.sql
-- Automatically expire unpaid checkout orders after 20 minutes and release reserved inventory.

CREATE OR REPLACE FUNCTION public.expire_outdated_orders(p_minutes INT DEFAULT 20)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rec RECORD;
  v_count INT := 0;
BEGIN
  FOR v_rec IN
    SELECT id, checkout_session_id
    FROM public.orders
    WHERE status NOT IN ('cancelled', 'completed', 'delivered', 'shipped')
      AND payment_status IN ('pending', 'awaiting_payment')
      AND created_at < NOW() - (p_minutes || ' minutes')::INTERVAL
  LOOP
    BEGIN
      PERFORM public.release_order_inventory(v_rec.id);
      UPDATE public.orders
      SET payment_status = 'failed', status = 'cancelled', updated_at = NOW()
      WHERE id = v_rec.id;
      
      INSERT INTO public.order_status_history(order_id, previous_status, new_status, note)
      VALUES (v_rec.id, 'pending', 'cancelled', 'Order automatically cancelled: payment window (' || p_minutes || 'm) expired; inventory released');
      
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Continue with other records
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_outdated_orders(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_outdated_orders(INT) TO service_role;

NOTIFY pgrst, 'reload schema';
