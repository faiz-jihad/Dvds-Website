-- DVDs Zone / AZ Rayan DVDs PostgreSQL Schema
-- Migration: Customer Reviews and Ratings System
-- Comprehensive RLS, Verified Purchase Detection, and Moderation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 2 AND char_length(title) <= 120),
  comment TEXT NOT NULL CHECK (char_length(trim(comment)) >= 5 AND char_length(comment) <= 2000),
  reviewer_name TEXT NOT NULL CHECK (char_length(trim(reviewer_name)) >= 1 AND char_length(reviewer_name) <= 80),
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  moderation_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate reviews for the same product by the same user
  CONSTRAINT reviews_user_product_unique UNIQUE (user_id, product_id)
);

-- 2. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON public.reviews(product_id, created_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON public.reviews(status, created_at DESC);

-- 3. Automatic Verified Purchase & Tamper-Proof Trigger
-- Customers cannot spoof verified purchase status or self-approve reviews
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
  SELECT o.id INTO v_matching_order_id
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.user_id = NEW.user_id
    AND oi.product_id = NEW.product_id
    AND o.payment_status = 'paid'
    AND o.status NOT IN ('cancelled', 'refunded')
  LIMIT 1;

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

DROP TRIGGER IF EXISTS trg_process_review_submission ON public.reviews;
CREATE TRIGGER trg_process_review_submission
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.process_review_submission();

-- 4. Maintain Product Review Metrics (Aggregated Rating and Counts)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recompute_product_review_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_target_product_id UUID;
  v_avg NUMERIC(3,2);
  v_count INT;
BEGIN
  v_target_product_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00),
    COUNT(*)::INT
  INTO v_avg, v_count
  FROM public.reviews
  WHERE product_id = v_target_product_id
    AND status = 'approved';

  UPDATE public.products
  SET average_rating = v_avg,
      review_count = v_count
  WHERE id = v_target_product_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_recompute_product_reviews ON public.reviews;
CREATE TRIGGER trg_recompute_product_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_product_review_metrics();

-- 5. Helper RPC to fetch comprehensive review breakdown
CREATE OR REPLACE FUNCTION public.get_product_review_summary(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'average_rating', COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0),
    'total_reviews', COUNT(*)::INT,
    'five_star', COUNT(*) FILTER (WHERE rating = 5)::INT,
    'four_star', COUNT(*) FILTER (WHERE rating = 4)::INT,
    'three_star', COUNT(*) FILTER (WHERE rating = 3)::INT,
    'two_star', COUNT(*) FILTER (WHERE rating = 2)::INT,
    'one_star', COUNT(*) FILTER (WHERE rating = 1)::INT,
    'verified_count', COUNT(*) FILTER (WHERE is_verified_purchase = TRUE)::INT
  ) INTO v_summary
  FROM public.reviews
  WHERE product_id = p_product_id
    AND status = 'approved';

  RETURN v_summary;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_review_summary(UUID) TO anon, authenticated;

-- 6. Helper RPC to check if current user can review and their verified purchase status
CREATE OR REPLACE FUNCTION public.check_user_review_eligibility(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_review JSONB;
  v_has_purchased BOOLEAN := FALSE;
  v_matching_order_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', FALSE,
      'can_review', FALSE,
      'has_reviewed', FALSE,
      'is_verified_purchase', FALSE,
      'message', 'Sign in to write a customer review.'
    );
  END IF;

  -- Check existing review
  SELECT jsonb_build_object(
    'id', id,
    'rating', rating,
    'title', title,
    'comment', comment,
    'status', status,
    'created_at', created_at,
    'is_verified_purchase', is_verified_purchase
  ) INTO v_existing_review
  FROM public.reviews
  WHERE user_id = v_user_id AND product_id = p_product_id
  LIMIT 1;

  -- Check purchase
  SELECT o.id INTO v_matching_order_id
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.user_id = v_user_id
    AND oi.product_id = p_product_id
    AND o.payment_status = 'paid'
    AND o.status NOT IN ('cancelled', 'refunded')
  LIMIT 1;

  IF v_matching_order_id IS NOT NULL THEN
    v_has_purchased := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', TRUE,
    'can_review', (v_existing_review IS NULL),
    'has_reviewed', (v_existing_review IS NOT NULL),
    'existing_review', v_existing_review,
    'is_verified_purchase', v_has_purchased,
    'order_id', v_matching_order_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_review_eligibility(UUID) TO authenticated;

-- 7. Row Level Security Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public and anon can view approved reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

-- Policy 2: Authenticated users can view their own reviews regardless of status
DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;
CREATE POLICY "Users can view own reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 3: Staff and Admins can view all reviews
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Policy 4: Authenticated users can insert their own review
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can update their own pending review
DROP POLICY IF EXISTS "Users can update own pending review" ON public.reviews;
CREATE POLICY "Users can update own pending review"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Policy 6: Admins and staff can manage (approve/reject/edit/delete) all reviews
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. Table Grants (RLS policies govern row & action authorization)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
