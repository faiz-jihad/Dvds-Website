-- Central legal identity for customer-facing company disclosures.

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS registered_company_name TEXT NOT NULL DEFAULT 'AZ Rayan Ltd',
  ADD COLUMN IF NOT EXISTS company_number TEXT NOT NULL DEFAULT '13894195',
  ADD COLUMN IF NOT EXISTS registered_office_address TEXT NOT NULL DEFAULT 'Apartment 18, 34 Ryland Street, Birmingham, B16 8DB, United Kingdom',
  ADD COLUMN IF NOT EXISTS companies_house_url TEXT NOT NULL DEFAULT 'https://find-and-update.company-information.service.gov.uk/company/13894195';

ALTER TABLE public.store_settings
  DROP CONSTRAINT IF EXISTS store_settings_company_number_format;

ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_company_number_format
  CHECK (company_number ~ '^[A-Z0-9]{8}$');

UPDATE public.store_settings
SET
  registered_company_name = 'AZ Rayan Ltd',
  company_number = '13894195',
  registered_office_address = 'Apartment 18, 34 Ryland Street, Birmingham, B16 8DB, United Kingdom',
  companies_house_url = 'https://find-and-update.company-information.service.gov.uk/company/13894195',
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
