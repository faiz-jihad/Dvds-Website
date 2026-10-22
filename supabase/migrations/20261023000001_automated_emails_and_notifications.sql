-- ============================================================================
-- Migration: Automated Emails & Notifications Hardening
-- Date: 2026-10-23
-- Description:
--   1. Expands email_logs table check constraint to support all production email types.
--   2. Adds tracking and email dispatch audit columns to orders table.
--   3. Ensures RLS policies and indexes for high-throughput operational logging.
-- ============================================================================

-- 1. Ensure email_logs table exists
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'simulated')),
  error_message TEXT,
  provider TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop older restrictive check constraint if present
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

-- Add updated check constraint supporting all operational email types
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_email_type_check CHECK (
  email_type IN (
    'customer_receipt',
    'admin_report',
    'admin_new_order',
    'order_dispatched',
    'order_cancelled',
    'bank_transfer_instructions',
    'payment_proof_uploaded',
    'contact_inquiry',
    'contact_autoreply',
    'customer_welcome',
    'test_email',
    'order_confirmation',
    'order_processing',
    'order_refunded',
    'admin_payment_verified',
    'admin_payment_failed',
    'admin_refund_alert',
    'admin_email_failure_alert',
    'customer_password_reset',
    'customer_password_changed'
  )
);

-- 2. Audit & Tracking Columns on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_confirmation_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS processing_email_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_email_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_email_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_carrier TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- 3. Indexes for instant lookup and deduplication
CREATE INDEX IF NOT EXISTS idx_email_logs_order_type ON public.email_logs (order_id, email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs (recipient);

-- 4. Row Level Security for email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_email_logs" ON public.email_logs;
CREATE POLICY "admin_all_email_logs" ON public.email_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'staff')
    )
  );

-- Service role bypass for serverless API endpoints
DROP POLICY IF EXISTS "service_role_all_email_logs" ON public.email_logs;
CREATE POLICY "service_role_all_email_logs" ON public.email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
