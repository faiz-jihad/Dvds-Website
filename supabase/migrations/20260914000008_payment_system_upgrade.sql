-- Migration: 20260914000008_payment_system_upgrade.sql
-- Upgrades orders table with payment methods, providers, references, paid timestamps, and bank transfer manual confirmation RPC.

-- 1. Relax or update orders status and payment_status CHECK constraints
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'processing', 'dispatched', 'delivered', 'cancelled', 'refunded'));

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'awaiting_payment', 'paid', 'failed', 'refunded', 'partially_refunded', 'unpaid'));

-- 2. Add payment columns to orders table if they do not exist
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'paypal', 'bank_transfer')),
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'paypal', 'manual_bank')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_transfer_reference TEXT,
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT;

-- 3. Add bank account columns to store_settings table
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'Barclays Bank UK',
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT DEFAULT 'AZ Rayan Ltd',
  ADD COLUMN IF NOT EXISTS bank_sort_code TEXT DEFAULT '20-00-00',
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT '13894195',
  ADD COLUMN IF NOT EXISTS bank_iban TEXT DEFAULT 'GB29 BARC 2000 0013 8941 95',
  ADD COLUMN IF NOT EXISTS bank_payment_instructions TEXT DEFAULT 'Please transfer the exact total using your order reference as the payment description.';

-- 4. Create RPC to manually confirm bank transfer payments safely with audit logging
CREATE OR REPLACE FUNCTION public.confirm_bank_transfer_payment(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_admin_id UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Verify caller is admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: only store administrators can confirm manual bank transfers.';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Order is already marked as paid.', 'order_id', p_order_id);
  END IF;

  -- Update order status
  UPDATE public.orders
  SET
    payment_status = 'paid',
    status = 'processing',
    paid_at = NOW(),
    payment_confirmed_by = v_admin_id,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Write to admin audit log if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_log') THEN
    INSERT INTO public.admin_audit_log (
      actor_id,
      table_name,
      record_id,
      action,
      before_data,
      after_data
    ) VALUES (
      v_admin_id,
      'orders',
      p_order_id::TEXT,
      'confirm_bank_transfer_payment',
      jsonb_build_object(
        'payment_status', v_order.payment_status,
        'status', v_order.status
      ),
      jsonb_build_object(
        'payment_status', 'paid',
        'status', 'processing',
        'paid_at', NOW(),
        'confirmed_by', v_admin_id
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bank transfer payment confirmed successfully.',
    'order_id', p_order_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer_payment(UUID) TO authenticated;
