-- Search identity remains editable by authorised staff. Empty defaults preserve
-- existing installations without inventing operational or brand information.

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS seo_site_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_site_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_site_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_social_image_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_organization_description TEXT NOT NULL DEFAULT '';

ALTER TABLE public.store_settings
  DROP CONSTRAINT IF EXISTS store_settings_seo_site_url_format,
  ADD CONSTRAINT store_settings_seo_site_url_format
    CHECK (seo_site_url = '' OR seo_site_url ~ '^https?://[^[:space:]]+$');

ALTER TABLE public.store_settings
  DROP CONSTRAINT IF EXISTS store_settings_seo_social_image_url_format,
  ADD CONSTRAINT store_settings_seo_social_image_url_format
    CHECK (seo_social_image_url = '' OR seo_social_image_url ~ '^https?://[^[:space:]]+$');
