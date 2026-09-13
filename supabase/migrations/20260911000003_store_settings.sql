-- Dynamic storefront and operational settings. No sample row is inserted:
-- an administrator must explicitly configure every operational value.

CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  singleton BOOLEAN NOT NULL DEFAULT TRUE,
  seo_site_url TEXT NOT NULL,
  seo_site_title TEXT NOT NULL,
  seo_site_description TEXT NOT NULL,
  seo_social_image_url TEXT NOT NULL,
  seo_organization_description TEXT NOT NULL,
  hero_badge_text TEXT NOT NULL,
  hero_headline_line1 TEXT NOT NULL,
  hero_headline_highlight TEXT NOT NULL,
  hero_subheadline TEXT NOT NULL,
  hero_cta_primary TEXT NOT NULL,
  hero_cta_secondary TEXT NOT NULL,
  hero_bg_image TEXT NOT NULL,
  announcement_left TEXT NOT NULL,
  announcement_center TEXT NOT NULL,
  announcement_link TEXT NOT NULL,
  deal_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  deal_discount_price NUMERIC(10,2) NOT NULL CHECK (deal_discount_price >= 0),
  deal_ends_at TIMESTAMPTZ,
  deal_is_active BOOLEAN NOT NULL DEFAULT FALSE,
  director_badge TEXT NOT NULL,
  director_name TEXT NOT NULL,
  director_quote TEXT NOT NULL,
  director_bio TEXT NOT NULL,
  director_product_ids UUID[] NOT NULL DEFAULT '{}',
  free_shipping_threshold NUMERIC(10,2) NOT NULL CHECK (free_shipping_threshold >= 0),
  standard_shipping_fee NUMERIC(10,2) NOT NULL CHECK (standard_shipping_fee >= 0),
  express_shipping_fee NUMERIC(10,2) NOT NULL CHECK (express_shipping_fee >= 0),
  standard_shipping_name TEXT NOT NULL,
  standard_shipping_eta TEXT NOT NULL,
  express_shipping_name TEXT NOT NULL,
  express_shipping_eta TEXT NOT NULL,
  low_stock_threshold INT NOT NULL CHECK (low_stock_threshold >= 0),
  budget_collection_threshold NUMERIC(10,2) NOT NULL CHECK (budget_collection_threshold >= 0),
  dispatch_cutoff_time TEXT NOT NULL,
  vip_promo_code TEXT NOT NULL,
  vip_promo_discount NUMERIC(5,2) NOT NULL CHECK (vip_promo_discount BETWEEN 0 AND 100),
  vip_min_spend NUMERIC(10,2) NOT NULL CHECK (vip_min_spend >= 0),
  store_name TEXT NOT NULL,
  warehouse_location TEXT NOT NULL,
  support_email TEXT NOT NULL,
  support_phone TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_settings_singleton_true
  ON public.store_settings(singleton) WHERE singleton = TRUE;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read storefront settings" ON public.store_settings
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage storefront settings" ON public.store_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
