-- ====================================================================
-- AZ RAYAN DVDs — PERBAIKAN: "Database error querying schema"
-- ====================================================================
-- Buka Supabase Dashboard -> SQL Editor -> New Query -> Paste & RUN
-- ====================================================================

-- 1. Bersihkan user auth yang dibuat manual dengan kolom NULL
DELETE FROM auth.users WHERE email = 'admin@azrayan.co.uk';

-- 2. Normalisasi kolom token di auth.users agar GoTrue Auth service tidak crash
DO $$
BEGIN
  UPDATE auth.users
  SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, '')
  WHERE 
    confirmation_token IS NULL 
    OR recovery_token IS NULL 
    OR email_change_token_new IS NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Perbaiki trigger agar fault-tolerant (tidak memblokir internal auth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Zack Admin'),
    CASE 
      WHEN LOWER(NEW.email) = 'admin@azrayan.co.uk' THEN 'admin'
      ELSE 'customer'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = CASE WHEN LOWER(EXCLUDED.email) = 'admin@azrayan.co.uk' THEN 'admin' ELSE profiles.role END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Selalu izinkan registrasi auth berhasil meskipun profile sync ada kendala
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
