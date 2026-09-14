-- ==========================================================
-- AZ RAYAN DVDs — ALL-IN-ONE SUPABASE DATABASE SETUP
-- Run this entire script in your Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. CORE TABLES

-- Profiles Table (linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  format TEXT NOT NULL DEFAULT 'DVD' CHECK (format IN ('DVD', 'Blu-ray', '4K UHD', 'Box Set')),
  release_year INT NOT NULL DEFAULT 2024,
  runtime_minutes INT DEFAULT 120,
  age_rating TEXT NOT NULL DEFAULT '12' CHECK (age_rating IN ('U', 'PG', '12', '15', '18')),
  region_code TEXT NOT NULL DEFAULT 'Region 2' CHECK (region_code IN ('Region 2', 'Region 0 (All Region)', 'Region B')),
  language TEXT NOT NULL DEFAULT 'English',
  subtitles TEXT NOT NULL DEFAULT 'English SDH',
  condition TEXT NOT NULL DEFAULT 'New' CHECK (condition IN ('New', 'Like New', 'Collector Edition')),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10, 2) CHECK (compare_at_price >= price),
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  cover_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_new_release BOOLEAN NOT NULL DEFAULT FALSE,
  is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
  spine_number TEXT,
  aspect_ratio TEXT,
  audio_format TEXT,
  director TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Genres Table
CREATE TABLE IF NOT EXISTS public.genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product Genres (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.product_genres (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  genre_id UUID REFERENCES public.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, genre_id)
);

-- Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  singleton BOOLEAN NOT NULL DEFAULT TRUE,
  seo_site_url TEXT NOT NULL DEFAULT 'https://azrayan.co.uk',
  seo_site_title TEXT NOT NULL DEFAULT 'AZ Rayan DVDs — Films Worth Owning | UK Physical Media Store',
  seo_site_description TEXT NOT NULL DEFAULT 'Curated boutique DVD editions, rare British cinema, collector box sets, and modern sci-fi classics dispatched from London.',
  seo_social_image_url TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
  seo_organization_description TEXT NOT NULL DEFAULT 'Independent physical media archive and boutique DVD purveyor based in London, UK.',
  hero_badge_text TEXT NOT NULL DEFAULT 'SPRING ARCHIVE RELEASE — MARCH 2026',
  hero_headline_line1 TEXT NOT NULL DEFAULT 'Films worth',
  hero_headline_highlight TEXT NOT NULL DEFAULT 'owning.',
  hero_subheadline TEXT NOT NULL DEFAULT 'Curated boutique DVD editions, British cinema, collector box sets, and cinema classics dispatched across the UK within 24 hours.',
  hero_cta_primary TEXT NOT NULL DEFAULT 'Browse Archive',
  hero_cta_secondary TEXT NOT NULL DEFAULT 'Curator Picks',
  hero_bg_image TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80',
  announcement_left TEXT NOT NULL DEFAULT 'Free UK delivery on orders over £25',
  announcement_center TEXT NOT NULL DEFAULT 'Same-day London dispatch before 2PM GMT',
  announcement_link TEXT NOT NULL DEFAULT '/delivery',
  deal_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  deal_discount_price NUMERIC(10,2) NOT NULL DEFAULT 6.99 CHECK (deal_discount_price >= 0),
  deal_ends_at TIMESTAMPTZ,
  deal_is_active BOOLEAN NOT NULL DEFAULT TRUE,
  director_badge TEXT NOT NULL DEFAULT 'DIRECTOR SPOTLIGHT',
  director_name TEXT NOT NULL DEFAULT 'Christopher Nolan',
  director_quote TEXT NOT NULL DEFAULT 'Physical media is the purest form of cinematic permanence.',
  director_bio TEXT NOT NULL DEFAULT 'From non-linear psychological thrillers to sweeping cosmic expeditions, Christopher Nolan has redefined modern large-format filmmaking with tactile, practical devotion.',
  director_product_ids UUID[] NOT NULL DEFAULT '{}',
  free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 25.00 CHECK (free_shipping_threshold >= 0),
  standard_shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 3.49 CHECK (standard_shipping_fee >= 0),
  express_shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 5.99 CHECK (express_shipping_fee >= 0),
  standard_shipping_name TEXT NOT NULL DEFAULT 'Royal Mail Tracked 48',
  standard_shipping_eta TEXT NOT NULL DEFAULT '2-3 working days',
  express_shipping_name TEXT NOT NULL DEFAULT 'DPD Next Day Priority',
  express_shipping_eta TEXT NOT NULL DEFAULT '1 working day (Order by 2PM)',
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  budget_collection_threshold NUMERIC(10,2) NOT NULL DEFAULT 8.00 CHECK (budget_collection_threshold >= 0),
  dispatch_cutoff_time TEXT NOT NULL DEFAULT '14:00 GMT',
  vip_promo_code TEXT NOT NULL DEFAULT 'RAYAN10',
  vip_promo_discount NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (vip_promo_discount BETWEEN 0 AND 100),
  vip_min_spend NUMERIC(10,2) NOT NULL DEFAULT 20.00 CHECK (vip_min_spend >= 0),
  store_name TEXT NOT NULL DEFAULT 'AZ Rayan DVDs',
  registered_company_name TEXT NOT NULL DEFAULT 'AZ Rayan Ltd',
  company_number TEXT NOT NULL DEFAULT '13894195' CHECK (company_number ~ '^[A-Z0-9]{8}$'),
  registered_office_address TEXT NOT NULL DEFAULT 'Apartment 18, 34 Ryland Street, Birmingham, B16 8DB, United Kingdom',
  companies_house_url TEXT NOT NULL DEFAULT 'https://find-and-update.company-information.service.gov.uk/company/13894195',
  warehouse_location TEXT NOT NULL DEFAULT 'Unit 4B, Bermondsey Trading Estate, Rotherhithe, London SE16 3LL',
  support_email TEXT NOT NULL DEFAULT 'concierge@azrayan.co.uk',
  support_phone TEXT NOT NULL DEFAULT '+44 (0)20 7946 0912',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_settings_singleton_true
  ON public.store_settings(singleton) WHERE singleton = TRUE;

-- Promotions Table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
  value NUMERIC(10, 2) NOT NULL CHECK (value > 0),
  minimum_order NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (minimum_order >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  county TEXT,
  postcode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United Kingdom',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'dispatched', 'delivered', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed')),
  fulfilment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfilment_status IN ('unfulfilled', 'fulfilled', 'returned')),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  shipping_address JSONB NOT NULL,
  payment_reference TEXT,
  stripe_session_id TEXT,
  shipping_carrier TEXT,
  tracking_number TEXT,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  internal_notes TEXT,
  inventory_reserved_at TIMESTAMPTZ,
  inventory_released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_title TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  product_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  order_reference TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Homepage Builder configuration
CREATE TABLE IF NOT EXISTS public.homepage_config (
  id TEXT PRIMARY KEY CHECK (id IN ('draft', 'published')),
  config_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. FUNCTIONS & SECURITY HARDENING

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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'staff')
    )
    OR
    (auth.jwt() ->> 'email') = 'admin@azrayan.co.uk'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.newsletter_subscribers(email)
  VALUES (LOWER(TRIM(p_email)))
  ON CONFLICT (email) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can update own profile fields" ON public.profiles;
CREATE POLICY "Users can update own profile fields" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Categories policies
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.is_admin());

-- Products policies
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Genres policies
DROP POLICY IF EXISTS "Public can view genres" ON public.genres;
CREATE POLICY "Public can view genres" ON public.genres FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage genres" ON public.genres;
CREATE POLICY "Admins can manage genres" ON public.genres FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Product Genres policies
DROP POLICY IF EXISTS "Public can view product_genres" ON public.product_genres;
CREATE POLICY "Public can view product_genres" ON public.product_genres FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage product_genres" ON public.product_genres;
CREATE POLICY "Admins can manage product_genres" ON public.product_genres FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Store Settings policies
DROP POLICY IF EXISTS "Public can read storefront settings" ON public.store_settings;
CREATE POLICY "Public can read storefront settings" ON public.store_settings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage storefront settings" ON public.store_settings;
CREATE POLICY "Admins can manage storefront settings" ON public.store_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Promotions policies
DROP POLICY IF EXISTS "Public can view active promotions" ON public.promotions;
CREATE POLICY "Public can view active promotions" ON public.promotions FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;
CREATE POLICY "Admins can manage promotions" ON public.promotions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Homepage Builder policies
DROP POLICY IF EXISTS "Public can read published homepage config" ON public.homepage_config;
CREATE POLICY "Public can read published homepage config" ON public.homepage_config
  FOR SELECT USING (id = 'published' OR public.is_admin());
DROP POLICY IF EXISTS "Admins can manage homepage config" ON public.homepage_config;
CREATE POLICY "Admins can manage homepage config" ON public.homepage_config
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Orders policies
DROP POLICY IF EXISTS "Customers can view their orders" ON public.orders;
CREATE POLICY "Customers can view their orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Order Items policies
DROP POLICY IF EXISTS "Customers can view their order items" ON public.order_items;
CREATE POLICY "Customers can view their order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.is_admin()))
);

-- Addresses policies
DROP POLICY IF EXISTS "Users can manage their addresses" ON public.addresses;
CREATE POLICY "Users can manage their addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Contact Messages policies
DROP POLICY IF EXISTS "Anyone can submit contact message" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact message" ON public.contact_messages FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins can manage contact messages" ON public.contact_messages FOR ALL USING (public.is_admin());

-- 5. INITIAL SEED DATA

-- Categories
INSERT INTO public.categories (id, name, slug, description, sort_order) VALUES
('c1000000-0000-0000-0000-000000000001', 'New Releases', 'new-releases', 'Fresh additions and latest cinema arrivals newly pressed to DVD.', 1),
('c1000000-0000-0000-0000-000000000002', 'Best Sellers', 'best-sellers', 'Our most celebrated physical media editions cherished by collectors.', 2),
('c1000000-0000-0000-0000-000000000003', 'Action & Thriller', 'action-thriller', 'Pulse-pounding suspense, espionage, and unforgettable set pieces.', 3),
('c1000000-0000-0000-0000-000000000004', 'Sci-Fi & Fantasy', 'sci-fi-fantasy', 'Visionary space odysseys, dystopian landscapes, and future horizons.', 4),
('c1000000-0000-0000-0000-000000000005', 'British Cinema & Drama', 'british-cinema', 'Award-winning UK dramas, gritty crime sagas, and prestige storytelling.', 5),
('c1000000-0000-0000-0000-000000000006', 'Family & Animation', 'family-animation', 'Timeless adventures for all ages to enjoy together.', 6),
('c1000000-0000-0000-0000-000000000007', 'Classics & Noir', 'classics', 'Golden era masterworks, film noir, and cinematic history.', 7)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Genres
INSERT INTO public.genres (id, name, slug) VALUES
('a1000000-0000-0000-0000-000000000001', 'Action', 'action'),
('a1000000-0000-0000-0000-000000000002', 'Sci-Fi', 'sci-fi'),
('a1000000-0000-0000-0000-000000000003', 'Drama', 'drama'),
('a1000000-0000-0000-0000-000000000004', 'Thriller', 'thriller'),
('a1000000-0000-0000-0000-000000000005', 'Crime', 'crime'),
('a1000000-0000-0000-0000-000000000006', 'Comedy', 'comedy'),
('a1000000-0000-0000-0000-000000000007', 'Horror', 'horror'),
('a1000000-0000-0000-0000-000000000008', 'Family', 'family'),
('a1000000-0000-0000-0000-000000000009', 'Classics', 'classics'),
('a1000000-0000-0000-0000-000000000010', 'Romance', 'romance'),
('a1000000-0000-0000-0000-000000000011', 'Documentary', 'documentary')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- Products
INSERT INTO public.products (
  id, sku, title, slug, description, short_description, category_id,
  format, release_year, runtime_minutes, age_rating, region_code,
  language, subtitles, condition, price, compare_at_price, stock_quantity,
  cover_image_url, status, is_featured, is_new_release, is_best_seller,
  spine_number, aspect_ratio, audio_format, director
) VALUES
(
  'b1000000-0000-0000-0000-000000000001', 'DVD-SCI-001', 'Interstellar: Collector Edition', 'interstellar-collectors-edition',
  'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival. Christopher Nolan sweeping sci-fi masterpiece presented on dual-disc DVD with behind-the-scenes bonus features.',
  'Dual-disc edition featuring director commentary and science of Interstellar documentary.',
  'c1000000-0000-0000-0000-000000000004', 'DVD', 2014, 169, '12', 'Region 2', 'English (Dolby Digital 5.1)', 'English SDH, French, Spanish', 'New',
  9.99, 14.99, 45, 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=700&auto=format&fit=crop&q=80',
  'active', true, false, true, 'AZ-001', '2.39:1', 'Dolby Digital 5.1', 'Christopher Nolan'
),
(
  'b1000000-0000-0000-0000-000000000002', 'DVD-SCI-002', 'Blade Runner 2049', 'blade-runner-2049',
  'Young Blade Runner K discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who has been missing for thirty years. Denis Villeneuve breathtaking continuation of the neo-noir cyberpunk legacy.',
  'Stunning neo-noir sci-fi featuring immersive Dolby 5.1 audio tracks.',
  'c1000000-0000-0000-0000-000000000004', 'DVD', 2017, 164, '15', 'Region 2', 'English (Dolby Digital 5.1)', 'English SDH', 'New',
  8.49, 11.99, 38, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&auto=format&fit=crop&q=80',
  'active', true, false, true, 'AZ-002', '2.40:1', 'Dolby Digital 5.1', 'Denis Villeneuve'
),
(
  'b1000000-0000-0000-0000-000000000003', 'DVD-ACT-003', 'Oppenheimer', 'oppenheimer-dvd',
  'The definitive biographical drama exploring the paradox of the enigmatic man who risked destroying the world in order to save it. Winner of 7 Academy Awards.',
  'Universal Pictures official UK DVD edition with 16:9 widescreen transfer.',
  'c1000000-0000-0000-0000-000000000001', 'DVD', 2023, 180, '15', 'Region 2', 'English', 'English SDH', 'New',
  11.99, 15.99, 52, 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=700&auto=format&fit=crop&q=80',
  'active', true, true, true, 'AZ-003', '2.20:1 / 1.78:1', 'Dolby Digital 5.1', 'Christopher Nolan'
),
(
  'b1000000-0000-0000-0000-000000000004', 'DVD-ACT-004', 'Heat: Director Definitive Edition', 'heat-directors-definitive-edition',
  'Michael Mann legendary cat-and-mouse crime drama uniting Al Pacino and Robert De Niro across a sun-bleached, lethal Los Angeles landscape. Includes restored audio mix.',
  'Dual-layer DVD with audio commentary by director Michael Mann.',
  'c1000000-0000-0000-0000-000000000003', 'DVD', 1995, 170, '15', 'Region 2', 'English 5.1 Surround', 'English SDH', 'New',
  7.99, NULL, 24, 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=700&auto=format&fit=crop&q=80',
  'active', false, false, true, 'AZ-004', '2.35:1', 'Dolby 5.1', 'Michael Mann'
),
(
  'b1000000-0000-0000-0000-000000000005', 'DVD-BRI-005', 'Lock, Stock and Two Smoking Barrels', 'lock-stock-two-smoking-barrels',
  'Guy Ritchie electrifying debut heist thriller set in London East End underworld. Four friends find themselves heavily indebted to an infamous crime boss after a crooked card game.',
  'British cult classic in collector slipcase with uncut scenes.',
  'c1000000-0000-0000-0000-000000000005', 'DVD', 1998, 107, '18', 'Region 2', 'English Stereo & 5.1', 'English', 'New',
  6.99, 8.99, 19, 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=700&auto=format&fit=crop&q=80',
  'active', true, false, false, 'AZ-005', '1.85:1', 'Stereo & 5.1', 'Guy Ritchie'
),
(
  'b1000000-0000-0000-0000-000000000006', 'DVD-CLA-006', 'Casablanca: Special Edition', 'casablanca-special-edition',
  'A cynical American expatriate encounters a former lover in Morocco during the early days of World War II. An immortal cinematic achievement starring Humphrey Bogart and Ingrid Bergman.',
  'Remastered black and white master with retrospective documentaries.',
  'c1000000-0000-0000-0000-000000000007', 'DVD', 1942, 102, 'U', 'Region 0 (All Region)', 'English Mono Original', 'English SDH, German, Italian', 'New',
  7.49, 9.99, 30, 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=700&auto=format&fit=crop&q=80',
  'active', false, false, true, 'AZ-006', '1.37:1', 'Mono', 'Michael Curtiz'
),
(
  'b1000000-0000-0000-0000-000000000007', 'DVD-FAM-007', 'Spirited Away (Studio Ghibli)', 'spirited-away-ghibli',
  'Hayao Miyazaki enchanting, Oscar-winning animated fantasy about a ten-year-old girl wandering into a world ruled by gods, witches and spirits.',
  'Includes both original Japanese dialogue and celebrated English dub.',
  'c1000000-0000-0000-0000-000000000006', 'DVD', 2001, 125, 'PG', 'Region 2', 'Japanese & English (Dolby 5.1)', 'English', 'New',
  9.99, NULL, 42, 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=700&auto=format&fit=crop&q=80',
  'active', true, false, true, 'AZ-007', '1.85:1', 'Dolby 5.1', 'Hayao Miyazaki'
),
(
  'b1000000-0000-0000-0000-000000000008', 'DVD-ACT-008', 'Mad Max: Fury Road', 'mad-max-fury-road',
  'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners and a psychotic drifter named Max.',
  'Pure kinetic cinematic energy in high-bitrate DVD video transfer.',
  'c1000000-0000-0000-0000-000000000003', 'DVD', 2015, 120, '15', 'Region 2', 'English (Dolby Digital 5.1)', 'English SDH', 'New',
  6.99, 8.99, 35, 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80',
  'active', false, false, true, 'AZ-008', '2.40:1', 'Dolby 5.1', 'George Miller'
),
(
  'b1000000-0000-0000-0000-000000000009', 'DVD-SCI-009', 'Dune: Part One', 'dune-part-one',
  'A noble family becomes embroiled in a war for control over the galaxy most valuable asset while its heir becomes troubled by visions of a dark future.',
  'Denis Villeneuve epic adaptation with Hans Zimmer roaring score.',
  'c1000000-0000-0000-0000-000000000004', 'DVD', 2021, 155, '12', 'Region 2', 'English 5.1', 'English SDH', 'New',
  8.99, 12.99, 27, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&auto=format&fit=crop&q=80',
  'active', true, true, false, 'AZ-009', '2.39:1', 'Dolby 5.1', 'Denis Villeneuve'
),
(
  'b1000000-0000-0000-0000-000000000010', 'DVD-CLA-010', 'The Godfather: 50th Anniversary Edition', 'the-godfather-50th-anniversary',
  'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son. Francis Ford Coppola crowning masterpiece.',
  'Francis Ford Coppola personal restored version with audio commentary.',
  'c1000000-0000-0000-0000-000000000007', 'DVD', 1972, 175, '15', 'Region 2', 'English Restored 5.1', 'English SDH', 'New',
  9.49, 13.99, 33, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=700&auto=format&fit=crop&q=80',
  'active', true, false, true, 'AZ-010', '1.85:1', 'Restored 5.1', 'Francis Ford Coppola'
),
(
  'b1000000-0000-0000-0000-000000000011', 'DVD-BRI-011', 'Trainspotting: 20th Anniversary Edition', 'trainspotting-20th-anniversary',
  'Renton, deeply immersed in the Edinburgh drug scene, tries to clean up and get out, despite the allure of the drugs and influence of friends.',
  'Danny Boyle breakthrough cinematic sensation with iconic soundtrack featurette.',
  'c1000000-0000-0000-0000-000000000005', 'DVD', 1996, 94, '18', 'Region 2', 'English Stereo', 'English SDH', 'New',
  6.49, NULL, 15, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80',
  'active', false, false, false, 'AZ-011', '1.85:1', 'Stereo', 'Danny Boyle'
),
(
  'b1000000-0000-0000-0000-000000000012', 'DVD-NEW-012', 'Civil War (2024)', 'civil-war-2024',
  'A journey across a dystopian future America, following a team of military-embedded journalists as they race against time to reach DC before rebel factions descend.',
  'Alex Garland visceral, tension-filled geopolitical thriller.',
  'c1000000-0000-0000-0000-000000000001', 'DVD', 2024, 109, '15', 'Region 2', 'English (Dolby Digital 5.1)', 'English SDH', 'New',
  12.99, NULL, 60, 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=700&auto=format&fit=crop&q=80',
  'active', true, true, false, 'AZ-012', '2.39:1', 'Dolby Digital 5.1', 'Alex Garland'
),
(
  'b1000000-0000-0000-0000-000000000013', 'DVD-BOX-013', 'The Dark Knight Trilogy Box Set (3 Discs)', 'the-dark-knight-trilogy-box-set',
  'Christopher Nolan complete Batman saga: Batman Begins, The Dark Knight, and The Dark Knight Rises. Housed in a custom black slipcase with booklet.',
  '3-disc box set with over 4 hours of documentary footage.',
  'c1000000-0000-0000-0000-000000000002', 'Box Set', 2012, 456, '12', 'Region 2', 'English (Dolby Digital 5.1)', 'English SDH, Spanish', 'New',
  18.99, 24.99, 22, 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80',
  'active', true, false, true, 'AZ-013', '2.40:1 / 1.78:1', 'Dolby Digital 5.1', 'Christopher Nolan'
),
(
  'b1000000-0000-0000-0000-000000000014', 'DVD-FAM-014', 'Paddington 2', 'paddington-2',
  'Paddington, now happily settled with the Brown family, picks up a series of odd jobs to buy the perfect present for his Aunt Lucy 100th birthday, only for the gift to be stolen.',
  'A heart-warming British comedy celebrated as a modern masterpiece.',
  'c1000000-0000-0000-0000-000000000006', 'DVD', 2017, 103, 'PG', 'Region 2', 'English 5.1', 'English SDH', 'New',
  5.99, 7.99, 40, 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=700&auto=format&fit=crop&q=80',
  'active', false, false, true, 'AZ-014', '2.39:1', 'Dolby 5.1', 'Paul King'
),
(
  'b1000000-0000-0000-0000-000000000015', 'DVD-HOR-015', 'The Shining: Extended Cut', 'the-shining-extended-cut',
  'A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence, while his psychic son sees horrific forebodings.',
  'Stanley Kubrick horror landmark featuring the longer US theatrical cut.',
  'c1000000-0000-0000-0000-000000000003', 'DVD', 1980, 144, '15', 'Region 2', 'English Mono / 5.1', 'English SDH', 'New',
  7.99, 9.99, 18, 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=700&auto=format&fit=crop&q=80',
  'active', false, false, false, 'AZ-015', '1.85:1', 'Mono / 5.1', 'Stanley Kubrick'
),
(
  'b1000000-0000-0000-0000-000000000016', 'DVD-NEW-016', 'Alien: Romulus (2024)', 'alien-romulus-2024',
  'While scavenging the deep ends of a derelict space station, a group of young space colonizers come face to face with the most terrifying life form in the universe.',
  'Fede Alvarez acclaimed return to pure practical sci-fi horror.',
  'c1000000-0000-0000-0000-000000000001', 'DVD', 2024, 119, '15', 'Region 2', 'English (Dolby Digital 5.1)', 'English SDH', 'New',
  12.99, NULL, 48, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=700&auto=format&fit=crop&q=80',
  'active', true, true, false, 'AZ-016', '2.39:1', 'Dolby Digital 5.1', 'Fede Alvarez'
),
(
  'b1000000-0000-0000-0000-000000000017', 'DVD-ACT-017', 'Pulp Fiction: Collector Edition', 'pulp-fiction-collectors-edition',
  'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
  'Quentin Tarantino Palme d''Or winner with bonus interviews.',
  'c1000000-0000-0000-0000-000000000003', 'DVD', 1994, 154, '18', 'Region 2', 'English 5.1 Surround', 'English SDH', 'New',
  7.99, 10.99, 29, 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=700&auto=format&fit=crop&q=80',
  'active', true, false, true, 'AZ-017', '2.35:1', 'Dolby 5.1', 'Quentin Tarantino'
),
(
  'b1000000-0000-0000-0000-000000000018', 'DVD-SCI-018', '2001: A Space Odyssey', '2001-a-space-odyssey',
  'After discovering a mysterious artifact buried beneath the Lunar surface, mankind sets off on a quest to find its origins with help from sentient supercomputer H.A.L. 9000.',
  'Stanley Kubrick philosophical voyage with digitally transferred audio.',
  'c1000000-0000-0000-0000-000000000004', 'DVD', 1968, 149, 'U', 'Region 2', 'English 5.1', 'English SDH', 'New',
  7.49, NULL, 21, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=700&auto=format&fit=crop&q=80',
  'active', false, false, true, 'AZ-018', '2.20:1', 'Dolby 5.1', 'Stanley Kubrick'
),
(
  'b1000000-0000-0000-0000-000000000019', 'DVD-BRI-019', 'Severance (TV Series Season 1)', 'severance-season-1',
  'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth.',
  'Complete 9-episode physical release containing deleted scenes.',
  'c1000000-0000-0000-0000-000000000004', 'Box Set', 2022, 450, '15', 'Region 2', 'English (Dolby Digital 5.1)', 'English SDH', 'New',
  16.99, 21.99, 14, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&auto=format&fit=crop&q=80',
  'active', false, true, false, 'AZ-019', '2.00:1', 'Dolby 5.1', 'Ben Stiller & Aoife McArdle'
),
(
  'b1000000-0000-0000-0000-000000000020', 'DVD-CLA-020', 'Rear Window (Alfred Hitchcock)', 'rear-window-alfred-hitchcock',
  'A wheelchair-bound photographer spies on his neighbours from his Greenwich Village apartment window and becomes convinced one of them has committed murder.',
  'Technicolor restored presentation with documentary by Peter Bogdanovich.',
  'c1000000-0000-0000-0000-000000000007', 'DVD', 1954, 112, 'PG', 'Region 2', 'English Mono Original', 'English SDH', 'New',
  7.49, 8.99, 17, 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=700&auto=format&fit=crop&q=80',
  'active', false, false, false, 'AZ-020', '1.66:1', 'Mono', 'Alfred Hitchcock'
)
ON CONFLICT (slug) DO NOTHING;

-- Product Genres Link
INSERT INTO public.product_genres (product_id, genre_id) VALUES
('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'), -- Interstellar: Sci-Fi
('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003'), -- Interstellar: Drama
('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'), -- Blade Runner 2049: Sci-Fi
('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001'), -- Blade Runner 2049: Action
('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003'), -- Oppenheimer: Drama
('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004'), -- Oppenheimer: Thriller
('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001'), -- Heat: Action
('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000005'), -- Heat: Crime
('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005'), -- Lock Stock: Crime
('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000006'), -- Lock Stock: Comedy
('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000009'), -- Casablanca: Classics
('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000010'), -- Casablanca: Romance
('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000008'), -- Spirited Away: Family
('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001'), -- Mad Max: Action
('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002'), -- Mad Max: Sci-Fi
('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000002'), -- Dune: Sci-Fi
('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000005'), -- The Godfather: Crime
('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003'), -- The Godfather: Drama
('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003'), -- Trainspotting: Drama
('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001'), -- Civil War: Action
('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000001'), -- Dark Knight: Action
('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000008'), -- Paddington: Family
('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000007'), -- Shining: Horror
('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000002'), -- Alien: Sci-Fi
('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000005'), -- Pulp Fiction: Crime
('b1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000002'), -- 2001: Sci-Fi
('b1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000002'), -- Severance: Sci-Fi
('b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000009')  -- Rear Window: Classics
ON CONFLICT DO NOTHING;

-- Promotions
INSERT INTO public.promotions (id, code, type, value, minimum_order, is_active) VALUES
('d1000000-0000-0000-0000-000000000001', 'RAYAN10', 'percentage', 10.00, 20.00, true),
('d1000000-0000-0000-0000-000000000002', 'FREESHIP', 'fixed_amount', 3.49, 25.00, true)
ON CONFLICT (code) DO NOTHING;

-- Initial Store Settings (Singleton Row)
INSERT INTO public.store_settings (
  id, singleton,
  seo_site_url, seo_site_title, seo_site_description, seo_social_image_url, seo_organization_description,
  hero_badge_text, hero_headline_line1, hero_headline_highlight, hero_subheadline, hero_cta_primary, hero_cta_secondary, hero_bg_image,
  announcement_left, announcement_center, announcement_link,
  deal_product_id, deal_discount_price, deal_ends_at, deal_is_active,
  director_badge, director_name, director_quote, director_bio, director_product_ids,
  free_shipping_threshold, standard_shipping_fee, express_shipping_fee, standard_shipping_name, standard_shipping_eta, express_shipping_name, express_shipping_eta,
  low_stock_threshold, budget_collection_threshold, dispatch_cutoff_time,
  vip_promo_code, vip_promo_discount, vip_min_spend,
  store_name, registered_company_name, company_number, registered_office_address, companies_house_url,
  warehouse_location, support_email, support_phone
) VALUES (
  's1000000-0000-0000-0000-000000000001', TRUE,
  'https://azrayan.co.uk',
  'AZ Rayan DVDs — Films Worth Owning | UK Physical Media Store',
  'Curated boutique DVD editions, rare British cinema, collector box sets, and modern sci-fi classics dispatched from London.',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
  'Independent physical media archive and boutique DVD purveyor based in London, UK.',
  'SPRING ARCHIVE RELEASE — MARCH 2026',
  'Films worth',
  'owning.',
  'Curated boutique DVD editions, British cinema, collector box sets, and cinema classics dispatched across the UK within 24 hours.',
  'Browse Archive',
  'Curator Picks',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80',
  'Free UK delivery on orders over £25',
  'Same-day London dispatch before 2PM GMT',
  '/delivery',
  'b1000000-0000-0000-0000-000000000001',
  6.99,
  NOW() + INTERVAL '24 hours',
  TRUE,
  'DIRECTOR SPOTLIGHT',
  'Christopher Nolan',
  'Physical media is the purest form of cinematic permanence.',
  'From non-linear psychological thrillers to sweeping cosmic expeditions, Christopher Nolan has redefined modern large-format filmmaking with tactile, practical devotion.',
  ARRAY['b1000000-0000-0000-0000-000000000001'::UUID, 'b1000000-0000-0000-0000-000000000003'::UUID, 'b1000000-0000-0000-0000-000000000013'::UUID],
  25.00, 3.49, 5.99,
  'Royal Mail Tracked 48', '2-3 working days',
  'DPD Next Day Priority', '1 working day (Order by 2PM)',
  5, 8.00, '14:00 GMT',
  'RAYAN10', 10.00, 20.00,
  'AZ Rayan DVDs',
  'AZ Rayan Ltd',
  '13894195',
  'Apartment 18, 34 Ryland Street, Birmingham, B16 8DB, United Kingdom',
  'https://find-and-update.company-information.service.gov.uk/company/13894195',
  'Unit 4B, Bermondsey Trading Estate, Rotherhithe, London SE16 3LL',
  'concierge@azrayan.co.uk',
  '+44 (0)20 7946 0912'
)
ON CONFLICT (singleton) WHERE singleton = TRUE DO NOTHING;

-- Seed / Ensure Admin User exists in auth.users & public.profiles
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

-- ==========================================================
-- REALTIME WEBSOCKET SUBSCRIPTION CONFIGURATION
-- ==========================================================
-- Enable Realtime Replication for frontend WebSocket listeners
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.genres;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
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
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.store_settings REPLICA IDENTITY FULL;
ALTER TABLE public.homepage_config REPLICA IDENTITY FULL;
