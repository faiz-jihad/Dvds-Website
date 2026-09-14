-- ====================================================================
-- AZ RAYAN DVDs — SCRIPT BUAT AKUN ADMIN DI SUPABASE
-- ====================================================================
-- Salin (copy) seluruh script ini, lalu jalankan di:
-- Supabase Dashboard -> Project Anda -> SQL Editor -> New query -> RUN
-- ====================================================================

-- 1. Pastikan ekstensi pgcrypto aktif (untuk hashing password bcrypt)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT := 'admin@azrayan.co.uk';
  v_admin_password TEXT := 'Admin123!';
  v_admin_name TEXT := 'Zack Admin';
BEGIN
  -- Cek apakah user sudah ada di auth.users
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_admin_email;

  IF v_admin_id IS NULL THEN
    -- Buat ID user baru
    v_admin_id := gen_random_uuid();

    -- Insert ke tabel internal auth.users Supabase
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
      confirmation_token
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
      encode(gen_random_bytes(32), 'hex')
    );
  ELSE
    -- Jika user sudah pernah terdaftar, update password & pastikan email confirmed
    UPDATE auth.users
    SET encrypted_password = crypt(v_admin_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  -- 2. Pastikan tabel public.profiles memiliki data admin ini dengan role 'admin'
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_admin_id, v_admin_email, v_admin_name, 'admin')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'admin',
      full_name = v_admin_name,
      email = v_admin_email;

  -- Pastikan semua entri profil dengan email ini memiliki role 'admin'
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE email = v_admin_email;

  RAISE NOTICE 'SUCCESS: Akun admin % berhasil dibuat/diperbarui dengan password: %', v_admin_email, v_admin_password;
END $$;

-- 3. Verifikasi hasil pembuatan akun
SELECT id, email, role, email_confirmed_at FROM auth.users WHERE email = 'admin@azrayan.co.uk';
SELECT id, email, full_name, role FROM public.profiles WHERE email = 'admin@azrayan.co.uk';
