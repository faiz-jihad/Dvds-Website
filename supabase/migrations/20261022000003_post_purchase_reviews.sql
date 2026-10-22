-- DVDs Zone / AZ Rayan DVDs PostgreSQL Schema
-- Migration: Post-Purchase Review Tokens, Guest Order Reviews, and Delivery Invitations

-- 1. Extend orders table with review tokens & invitation dispatch tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS review_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS review_invitation_sent_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_review_token ON public.orders(review_token) WHERE review_token IS NOT NULL;

-- 2. Extend reviews table to support guest orders with verified purchase tokens
ALTER TABLE public.reviews
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS order_item_id UUID,
  ADD COLUMN IF NOT EXISTS review_token TEXT;

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved_testimonials ON public.reviews(status, rating DESC, created_at DESC) WHERE status = 'approved';

-- 3. Stored Procedure: Generate Review Token for Completed Orders
CREATE OR REPLACE FUNCTION public.ensure_order_review_token(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_existing TEXT;
BEGIN
  SELECT review_token INTO v_existing
  FROM public.orders
  WHERE id = p_order_id;

  IF v_existing IS NOT NULL AND length(v_existing) > 10 THEN
    RETURN v_existing;
  END IF;

  -- Generate secure random 32-character hex token
  v_token := encode(gen_random_bytes(16), 'hex');

  UPDATE public.orders
  SET review_token = v_token
  WHERE id = p_order_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_order_review_token(UUID) TO service_role, authenticated;

-- 4. Helper function: Get Approved Homepage Testimonials
CREATE OR REPLACE FUNCTION public.get_homepage_testimonials(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_title TEXT,
  product_slug TEXT,
  product_image TEXT,
  rating INT,
  title TEXT,
  comment TEXT,
  reviewer_name TEXT,
  is_verified_purchase BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.product_id,
    p.title AS product_title,
    p.slug AS product_slug,
    p.cover_image_url AS product_image,
    r.rating,
    r.title,
    r.comment,
    r.reviewer_name,
    r.is_verified_purchase,
    r.created_at
  FROM public.reviews r
  JOIN public.products p ON p.id = r.product_id
  WHERE r.status = 'approved'
  ORDER BY r.rating DESC, r.created_at DESC
  LIMIT LEAST(p_limit, 20);
$$;

GRANT EXECUTE ON FUNCTION public.get_homepage_testimonials(INT) TO anon, authenticated;

-- 5. Updated process_review_submission to support both authenticated users and guest order tokens
CREATE OR REPLACE FUNCTION public.process_review_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_matching_order_id UUID;
  v_is_staff BOOLEAN;
BEGIN
  -- Check caller privilege
  SELECT public.is_admin() INTO v_is_staff;
  IF v_is_staff IS NULL THEN
    v_is_staff := FALSE;
  END IF;

  -- 1. Check for real eligible purchase in orders & order_items
  -- If order_id is explicitly provided, verify it directly
  IF NEW.order_id IS NOT NULL THEN
    SELECT o.id INTO v_matching_order_id
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.id = NEW.order_id
      AND oi.product_id = NEW.product_id
      AND o.payment_status = 'paid'
      AND o.status NOT IN ('cancelled', 'refunded')
    LIMIT 1;
  END IF;

  -- If not found by order_id and user_id is provided, check user's orders
  IF v_matching_order_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT o.id INTO v_matching_order_id
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = NEW.user_id
      AND oi.product_id = NEW.product_id
      AND o.payment_status = 'paid'
      AND o.status NOT IN ('cancelled', 'refunded')
    LIMIT 1;
  END IF;

  IF v_matching_order_id IS NOT NULL THEN
    NEW.is_verified_purchase := TRUE;
    NEW.order_id := v_matching_order_id;
  ELSE
    NEW.is_verified_purchase := FALSE;
    NEW.order_id := NULL;
  END IF;

  -- 2. Customer safety: regular customers cannot self-approve or alter moderation fields
  IF NOT v_is_staff THEN
    -- If it's a new review or non-admin update, force status to pending
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.moderated_by := NULL;
      NEW.moderated_at := NULL;
      NEW.moderation_note := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Customer cannot change status or moderation fields
      NEW.status := OLD.status;
      NEW.moderated_by := OLD.moderated_by;
      NEW.moderated_at := OLD.moderated_at;
      NEW.moderation_note := OLD.moderation_note;
      NEW.is_verified_purchase := OLD.is_verified_purchase;
      NEW.order_id := OLD.order_id;
    END IF;
  ELSE
    -- If staff/admin is moderating, record timestamp
    IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
      NEW.moderated_at := NOW();
      NEW.moderated_by := auth.uid();
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add unique index to prevent duplicate reviews for the same order and product
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_product_unique 
  ON public.reviews(order_id, product_id) 
  WHERE order_id IS NOT NULL;
