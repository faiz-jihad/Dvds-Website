-- AZ Rayan DVDs Migration: RBAC User Management & Profiles Admin Policies

-- 1. Ensure RLS is active on profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow Admins full management access to all profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Secure RPC to update user role with strict admin check
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id UUID, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_profile public.profiles%ROWTYPE;
BEGIN
  -- Strict permission validation
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrative privileges required to modify user roles.';
  END IF;

  -- Validate allowed roles
  IF p_role NOT IN ('customer', 'staff', 'admin') THEN
    RAISE EXCEPTION 'Invalid role specified: %', p_role;
  END IF;

  -- Update the user profile
  UPDATE public.profiles
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile with ID % not found.', p_user_id;
  END IF;

  RETURN to_jsonb(v_updated_profile);
END;
$$;

-- Grant execution to authenticated users (internal admin check controls execution)
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;
