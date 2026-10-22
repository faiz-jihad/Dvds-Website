-- ============================================================================
-- Migration: Sync is_admin() email list with JavaScript MASTER_ADMIN_EMAILS
-- Date: 2026-10-22
-- Description:
--   Corrects a discrepancy between the SQL is_admin() function and the
--   JavaScript API MASTER_ADMIN_EMAILS constant.
--   Previously missing: admin@dvds-zone.co.uk, faizalba74@gmail.com
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Verified role in database
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'staff')
    )
    OR
    -- Direct admin email check (must match MASTER_ADMIN_EMAILS in JavaScript API layer)
    (COALESCE(auth.jwt() ->> 'email', '') IN (
      'azrayanltd@gmail.com',
      'admin@dvds-zone.co.uk',
      'admin@dvdszone.co.uk',
      'admin@azrayan.co.uk',
      'faizalba74@gmail.com'
    ))
    OR
    -- Only server-set app_metadata (never client-controlled user_metadata)
    (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'staff')),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
