-- Admin-only account management; is_admin() intentionally also allows staff
-- for ordinary store operations, so it cannot guard role changes.
CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$;

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR SELECT USING (public.is_store_owner());

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id UUID, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_profile public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_store_owner() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_role IS NULL OR p_role NOT IN ('customer', 'staff', 'admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own administrator role'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  UPDATE public.profiles SET role = p_role, updated_at = NOW() WHERE id = p_user_id;
  INSERT INTO public.admin_audit_log(actor_id, table_name, record_id, action, before_data, after_data)
  VALUES (auth.uid(), 'profiles', p_user_id::TEXT, 'UPDATE', to_jsonb(v_profile), jsonb_build_object('role', p_role));
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  RETURN to_jsonb(v_profile);
END;
$$;

-- Delete the Auth account too: deleting only a profile allows it to reappear
-- on the next sign-in. Order foreign keys preserve transaction history.
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_profile public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_store_owner() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own administrator account'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  INSERT INTO public.admin_audit_log(actor_id, table_name, record_id, action, before_data, after_data)
  VALUES (auth.uid(), 'profiles', p_user_id::TEXT, 'DELETE', to_jsonb(v_profile), NULL);
  DELETE FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auth account not found'; END IF;
END;
$$;

-- Replace the old signature to avoid ambiguous PostgREST overload resolution.
DROP FUNCTION IF EXISTS public.confirm_bank_transfer_payment(UUID);
CREATE OR REPLACE FUNCTION public.confirm_bank_transfer_payment(p_order_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_store_owner() THEN RAISE EXCEPTION 'Only administrators can confirm bank transfers'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.payment_method IS DISTINCT FROM 'bank_transfer' THEN RAISE EXCEPTION 'This is not a bank transfer order'; END IF;
  IF v_order.status IN ('cancelled', 'refunded') OR v_order.inventory_released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cancelled or refunded orders cannot be confirmed';
  END IF;
  IF v_order.payment_status = 'paid' THEN RETURN to_jsonb(v_order); END IF;
  IF v_order.payment_status NOT IN ('awaiting_payment', 'pending', 'unpaid') OR v_order.status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Order is not awaiting payment';
  END IF;
  UPDATE public.orders SET payment_status = 'paid', status = 'processing', paid_at = NOW(),
    payment_confirmed_by = auth.uid(), updated_at = NOW(),
    internal_notes = concat_ws(E'\n', NULLIF(internal_notes, ''), NULLIF(trim(p_note), ''))
  WHERE id = p_order_id;
  -- Audit action must satisfy the INSERT/UPDATE/DELETE constraint.
  INSERT INTO public.admin_audit_log(actor_id, table_name, record_id, action, before_data, after_data)
  VALUES (auth.uid(), 'orders', p_order_id::TEXT, 'UPDATE', to_jsonb(v_order),
    jsonb_build_object('payment_status', 'paid', 'status', 'processing', 'note', p_note, 'confirmed_by', auth.uid()));
  INSERT INTO public.order_status_history(order_id, previous_status, new_status, previous_fulfilment_status, new_fulfilment_status, note, actor_id)
  VALUES (p_order_id, v_order.status, 'processing', v_order.fulfilment_status, v_order.fulfilment_status,
    COALESCE(NULLIF(trim(p_note), ''), 'Bank transfer payment confirmed'), auth.uid());
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  RETURN to_jsonb(v_order);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_bank_transfer_payment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer_payment(UUID, TEXT) TO authenticated;

-- Shared image storage for product forms and homepage media uploads.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('products', 'products', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET public = TRUE, file_size_limit = 5242880, allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'products');
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products' AND public.is_admin());
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'products' AND public.is_admin()) WITH CHECK (bucket_id = 'products' AND public.is_admin());
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'products' AND public.is_admin());

NOTIFY pgrst, 'reload schema';
