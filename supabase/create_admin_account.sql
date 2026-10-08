-- ====================================================================
-- DVDs ZONE — SCRIPT TO CREATE/UPDATE ADMIN ACCOUNT IN SUPABASE
-- ====================================================================
-- Copy this entire script, then run it in:
-- Supabase Dashboard -> Your Project -> SQL Editor -> New query -> RUN
-- ====================================================================

-- 1. Ensure pgcrypto extension is active (for bcrypt password hashing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT := 'azrayanltd@gmail.com';
  v_admin_password TEXT := 'Admin123!';
  v_admin_name TEXT := 'DVDs Zone Admin';
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_admin_email;

  IF v_admin_id IS NULL THEN
    -- Generate new user ID
    v_admin_id := gen_random_uuid();

    -- Insert into internal auth.users table in Supabase
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      jsonb_build_object('full_name', v_admin_name, 'role', 'admin'),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );
  ELSE
    -- If user already exists, update password & ensure email is confirmed
    UPDATE auth.users
    SET encrypted_password = crypt(v_admin_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  -- 2. Ensure public.profiles table has this admin entry with 'admin' role
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_admin_id, v_admin_email, v_admin_name, 'admin')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'admin',
      full_name = v_admin_name,
      email = v_admin_email;

  -- Ensure any profile entry with this email has 'admin' role
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE email = v_admin_email;

  RAISE NOTICE 'SUCCESS: Admin account % created/updated with password: %', v_admin_email, v_admin_password;
END $$;

-- 3. Verify account creation results
SELECT id, email, role, email_confirmed_at FROM auth.users WHERE email = 'azrayanltd@gmail.com';
SELECT id, email, full_name, role FROM public.profiles WHERE email = 'azrayanltd@gmail.com';
