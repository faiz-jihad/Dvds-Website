-- ====================================================================
-- AZ RAYAN DVDs — FIX ROW-LEVEL SECURITY (RLS) FOR PROMOTIONS & ADMIN
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. Ensure required cryptographic extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create auto-profile trigger for auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
    CASE 
      WHEN NEW.email = 'admin@azrayan.co.uk' THEN 'admin'
      ELSE 'customer'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = CASE WHEN EXCLUDED.email = 'admin@azrayan.co.uk' THEN 'admin' ELSE profiles.role END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Seed / Ensure Admin User exists in auth.users & public.profiles
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@azrayan.co.uk';

  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
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
      'admin@azrayan.co.uk',
      crypt('Admin123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"full_name":"Zack Admin","role":"admin"}'::jsonb,
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  -- Ensure profile exists with admin role
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_admin_id, 'admin@azrayan.co.uk', 'Zack Admin', 'admin')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'admin', full_name = 'Zack Admin', email = 'admin@azrayan.co.uk';

  -- Also promote any profile matching admin@azrayan.co.uk
  UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@azrayan.co.uk';
END $$;

-- 4. Multi-factor is_admin() function with JWT, Profile, and Email fallback
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Profile role check
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'staff')
    )
    OR
    -- Direct JWT email check
    (auth.jwt() ->> 'email') = 'admin@azrayan.co.uk'
    OR
    -- Only server-set app_metadata (never client-controlled user_metadata)
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 5. Refresh Promotions Table & Policies
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping')),
  value NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
  minimum_order NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (minimum_order >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active promotions" ON public.promotions;
CREATE POLICY "Public can view active promotions" 
  ON public.promotions FOR SELECT 
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;
CREATE POLICY "Admins can manage promotions" 
  ON public.promotions FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 6. Refresh Other Admin Core Policies
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (status = 'active' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view genres" ON public.genres;
CREATE POLICY "Public can view genres" ON public.genres FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage genres" ON public.genres;
CREATE POLICY "Admins can manage genres" ON public.genres FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view product_genres" ON public.product_genres;
CREATE POLICY "Public can view product_genres" ON public.product_genres FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage product_genres" ON public.product_genres;
CREATE POLICY "Admins can manage product_genres" ON public.product_genres FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can read storefront settings" ON public.store_settings;
CREATE POLICY "Public can read storefront settings" ON public.store_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage storefront settings" ON public.store_settings;
CREATE POLICY "Admins can manage storefront settings" ON public.store_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Ensure Homepage Config Table and Policies exist
CREATE TABLE IF NOT EXISTS public.homepage_config (
  id TEXT PRIMARY KEY CHECK (id IN ('draft', 'published')),
  config_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published homepage config" ON public.homepage_config;
CREATE POLICY "Public can read published homepage config" ON public.homepage_config
  FOR SELECT USING (id = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage homepage config" ON public.homepage_config;
CREATE POLICY "Admins can manage homepage config" ON public.homepage_config
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Ensure default singleton row exists in store_settings
INSERT INTO public.store_settings (
  id, singleton,
  seo_site_url, seo_site_title, seo_site_description, seo_social_image_url, seo_organization_description,
  hero_badge_text, hero_headline_line1, hero_headline_highlight, hero_subheadline, hero_cta_primary, hero_cta_secondary, hero_bg_image,
  announcement_left, announcement_center, announcement_link,
  deal_discount_price, deal_ends_at, deal_is_active,
  director_badge, director_name, director_quote, director_bio, director_product_ids,
  free_shipping_threshold, standard_shipping_fee, express_shipping_fee, standard_shipping_name, standard_shipping_eta, express_shipping_name, express_shipping_eta,
  low_stock_threshold, budget_collection_threshold, dispatch_cutoff_time,
  vip_promo_code, vip_promo_discount, vip_min_spend,
  store_name, warehouse_location, support_email, support_phone
) VALUES (
  's1000000-0000-0000-0000-000000000001', TRUE,
  'https://azrayan.co.uk',
  'AZ Rayan DVDs — Films Worth Owning | UK Physical Media Store',
  'Curated boutique DVD editions, rare British cinema, collector box sets, and modern sci-fi classics dispatched from London.',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
  'Independent physical media archive and boutique DVD purveyor based in London, UK.',
  'SPRING ARCHIVE RELEASE — MARCH 2026',
  'Films worth', 'owning.',
  'Curated boutique DVD editions, British cinema, collector box sets, and cinema classics dispatched across the UK within 24 hours.',
  'Browse Archive', 'Curator Picks',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80',
  'Free UK delivery on orders over £25',
  'Same-day London dispatch before 2PM GMT',
  '/delivery',
  6.99, NOW() + INTERVAL '24 hours', FALSE,
  'DIRECTOR SPOTLIGHT', 'Christopher Nolan',
  'Physical media is the purest form of cinematic permanence.',
  'From non-linear psychological thrillers to sweeping cosmic expeditions, Christopher Nolan has redefined modern large-format filmmaking with tactile, practical devotion.',
  '{}',
  25.00, 3.49, 5.99,
  'Royal Mail Tracked 48', '2-3 working days',
  'DPD Next Day Priority', '1 working day (Order by 2PM)',
  5, 8.00, '14:00 GMT',
  'RAYAN10', 10.00, 20.00,
  'AZ Rayan DVDs',
  'Unit 4B, Bermondsey Trading Estate, Rotherhithe, London SE16 3LL',
  'concierge@azrayan.co.uk',
  '+44 (0)20 7946 0912'
)
ON CONFLICT (singleton) WHERE singleton = TRUE DO NOTHING;

-- 7. Ensure seed promotions exist
INSERT INTO public.promotions (id, code, type, value, minimum_order, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'RAYAN10', 'percentage', 10, 20.00, true),
  ('22222222-2222-2222-2222-222222222222', 'FREESHIP', 'fixed_amount', 3.49, 30.00, true),
  ('33333333-3333-3333-3333-333333333333', 'BOXSET5', 'fixed_amount', 5, 40.00, true)
ON CONFLICT (code) DO UPDATE 
SET is_active = EXCLUDED.is_active,
    value = EXCLUDED.value;

-- 8. Seed default published & draft homepage configuration if not present
INSERT INTO public.homepage_config (id, config_data, updated_at)
VALUES 
  ('published', '{"version":1,"status":"published","updatedAt":"2026-03-01T00:00:00Z","sections":[{"id":"sec-hero-main","type":"hero","enabled":true,"sortOrder":10,"data":{"layout":"cinematic","headline":"Films Worth Owning.","subheadline":"Curated boutique DVD editions, rare British cinema, collector box sets, and modern classics dispatched across the UK within 24 hours.","badge":"Spring Archive Release • March 2026","ctaPrimaryText":"Browse Full Archive","ctaPrimaryLink":"/shop","ctaSecondaryText":"Curator Picks","ctaSecondaryLink":"/shop?category=film","backgroundMediaUrl":"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=85","overlayDarkness":55,"textAlignment":"left"}},{"id":"sec-featured-cats","type":"categoryGrid","enabled":true,"sortOrder":20,"data":{"title":"Explore The Archive","subtitle":"Hand-selected categories curated for serious physical media collectors","layout":"cards","selectedCategoryIds":[],"showProductCount":true}},{"id":"sec-rail-bestsellers","type":"productRail","enabled":true,"sortOrder":30,"data":{"title":"Collector Favourites","subtitle":"Most requested physical media titles across the United Kingdom","sourceType":"bestsellers","limit":8,"viewAllLink":"/shop?sort=bestselling","cardVariant":"standard"}},{"id":"sec-newsletter-main","type":"newsletter","enabled":true,"sortOrder":80,"data":{"headline":"The Collector Digest","subheadline":"Join over 12,000 UK cinephiles receiving weekly physical media alerts, private archive restocks, and boutique discounts.","badge":"Exclusive Access","disclaimer":"We respect your privacy. Unsubscribe at any time with one click. Strictly no spam."}}]}'::jsonb, NOW()),
  ('draft', '{"version":1,"status":"draft","updatedAt":"2026-03-01T00:00:00Z","sections":[{"id":"sec-hero-main","type":"hero","enabled":true,"sortOrder":10,"data":{"layout":"cinematic","headline":"Films Worth Owning.","subheadline":"Curated boutique DVD editions, rare British cinema, collector box sets, and modern classics dispatched across the UK within 24 hours.","badge":"Spring Archive Release • March 2026","ctaPrimaryText":"Browse Full Archive","ctaPrimaryLink":"/shop","ctaSecondaryText":"Curator Picks","ctaSecondaryLink":"/shop?category=film","backgroundMediaUrl":"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=85","overlayDarkness":55,"textAlignment":"left"}},{"id":"sec-featured-cats","type":"categoryGrid","enabled":true,"sortOrder":20,"data":{"title":"Explore The Archive","subtitle":"Hand-selected categories curated for serious physical media collectors","layout":"cards","selectedCategoryIds":[],"showProductCount":true}},{"id":"sec-rail-bestsellers","type":"productRail","enabled":true,"sortOrder":30,"data":{"title":"Collector Favourites","subtitle":"Most requested physical media titles across the United Kingdom","sourceType":"bestsellers","limit":8,"viewAllLink":"/shop?sort=bestselling","cardVariant":"standard"}},{"id":"sec-newsletter-main","type":"newsletter","enabled":true,"sortOrder":80,"data":{"headline":"The Collector Digest","subheadline":"Join over 12,000 UK cinephiles receiving weekly physical media alerts, private archive restocks, and boutique discounts.","badge":"Exclusive Access","disclaimer":"We respect your privacy. Unsubscribe at any time with one click. Strictly no spam."}}]}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

-- 9. Enable Realtime Publications
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_config;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
