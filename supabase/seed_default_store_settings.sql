-- ====================================================================
-- AZ RAYAN DVDs — SEED DEFAULT STORE & OPERATIONAL SETTINGS
-- ====================================================================
-- Jalankan script ini di Supabase Dashboard -> SQL Editor -> RUN
-- ====================================================================

INSERT INTO public.store_settings (
  id,
  singleton,
  store_name,
  seo_site_url,
  seo_site_title,
  seo_site_description,
  seo_social_image_url,
  seo_organization_description,
  hero_badge_text,
  hero_headline_line1,
  hero_headline_highlight,
  hero_subheadline,
  hero_cta_primary,
  hero_cta_secondary,
  hero_bg_image,
  announcement_left,
  announcement_center,
  announcement_link,
  deal_discount_price,
  deal_ends_at,
  deal_is_active,
  director_badge,
  director_name,
  director_quote,
  director_bio,
  director_product_ids,
  free_shipping_threshold,
  standard_shipping_fee,
  express_shipping_fee,
  standard_shipping_name,
  standard_shipping_eta,
  express_shipping_name,
  express_shipping_eta,
  low_stock_threshold,
  budget_collection_threshold,
  dispatch_cutoff_time,
  vip_promo_code,
  vip_promo_discount,
  vip_min_spend,
  warehouse_location,
  support_email,
  support_phone,
  updated_at
) VALUES (
  's1000000-0000-0000-0000-000000000001',
  TRUE,
  'AZ Rayan DVDs',
  'https://azrayan.co.uk',
  'AZ Rayan DVDs — British Physical Media Archive & Purveyor',
  'Specialist British DVD purveyor and archive cinema stockist. Free UK delivery across England, Scotland, Wales, and Northern Ireland.',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
  'Independent physical media retailer and DVD archive specialist based in the UK.',
  'SPRING ARCHIVE RELEASE — 2026',
  'Films worth',
  'owning.',
  'Curated boutique DVD editions, rare British cinema, collector box sets, and cinema classics dispatched across the UK with free standard delivery.',
  'Browse Archive',
  'Curator Picks',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80',
  'Free UK delivery on all orders',
  'Same-day UK dispatch before 2PM GMT',
  '/delivery',
  0,
  NOW() + INTERVAL '30 days',
  FALSE,
  'DIRECTOR SPOTLIGHT',
  'Christopher Nolan',
  'Physical media is the purest form of cinematic permanence.',
  'British-American auteur renowned for large-format filmmaking and devotion to tangible media.',
  '{}',
  0.00, -- Free Delivery
  0.00, -- Standard shipping fee £0.00
  4.99, -- Express shipping fee
  'Royal Mail 48 Tracked (FREE)',
  '2-3 working days',
  'DPD Next Day Priority',
  '1 working day (Order by 2PM)',
  5,    -- Low Stock Threshold
  8.00,
  '14:00 GMT',
  'WELCOME10',
  10.00,
  20.00,
  'Unit 4B, Bermondsey Trading Estate, London SE16 3LL',
  'support@azrayan.co.uk',
  '+44 (0)20 7946 0912',
  NOW()
)
ON CONFLICT (singleton) WHERE singleton = TRUE 
DO UPDATE SET
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  free_shipping_threshold = EXCLUDED.free_shipping_threshold,
  standard_shipping_fee = EXCLUDED.standard_shipping_fee,
  updated_at = NOW();

-- Izinkan public membaca store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read storefront settings" ON public.store_settings;
CREATE POLICY "Public can read storefront settings" ON public.store_settings
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage storefront settings" ON public.store_settings;
CREATE POLICY "Admins can manage storefront settings" ON public.store_settings
FOR ALL USING (TRUE) WITH CHECK (TRUE);
