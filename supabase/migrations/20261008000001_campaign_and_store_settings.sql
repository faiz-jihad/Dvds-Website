-- Migration: 20261008000001_campaign_and_store_settings.sql
-- Add campaign customization, format filters, and warehouse location columns to store_settings

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS campaign_is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS campaign_title TEXT DEFAULT 'Collector''s Vault Special & Clearance',
  ADD COLUMN IF NOT EXISTS campaign_badge TEXT DEFAULT 'CAMPAIGN EXCLUSIVE',
  ADD COLUMN IF NOT EXISTS campaign_tagline TEXT DEFAULT 'Limited boutique archive allocation with rare box sets, special discounts, and same-day UK dispatch.',
  ADD COLUMN IF NOT EXISTS campaign_discount_text TEXT DEFAULT 'Up to 50% OFF',
  ADD COLUMN IF NOT EXISTS campaign_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS custom_formats TEXT[] DEFAULT ARRAY['Standard', 'DVD', 'Blu-ray', '4K UHD', 'Box Set', 'Merchandise', 'Physical'],
  ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT 'DVD ZONE',
  ADD COLUMN IF NOT EXISTS warehouse_location TEXT DEFAULT 'United Kingdom';

UPDATE public.store_settings
SET
  registered_office_address = 'United Kingdom',
  warehouse_location = 'United Kingdom'
WHERE registered_office_address LIKE '%Birmingham%'
   OR registered_office_address LIKE '%West Midlands%'
   OR warehouse_location LIKE '%Birmingham%'
   OR warehouse_location LIKE '%West Midlands%';

UPDATE public.store_settings
SET
  support_email = 'azrayanltd@gmail.com'
WHERE support_email LIKE '%azrayan.co.uk%'
   OR support_email LIKE '%concierge%'
   OR support_email IS NULL;

NOTIFY pgrst, 'reload schema';
