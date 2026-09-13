-- Harden role checks used by the protected admin application.
-- Staff profile fields remain self-service, but role changes are server-managed only.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'staff')
  );
$$;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, avatar_url) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile fields" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Deliberately no client-side grant for profiles.role. Promote the first admin
-- through the Supabase SQL editor or another trusted server-side process:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'owner@example.com';
