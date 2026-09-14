-- Persist Homepage Builder drafts and published configuration.

CREATE TABLE IF NOT EXISTS public.homepage_config (
  id TEXT PRIMARY KEY CHECK (id IN ('draft', 'published')),
  config_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published homepage config" ON public.homepage_config;
CREATE POLICY "Public can read published homepage config" ON public.homepage_config
  FOR SELECT
  USING (id = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage homepage config" ON public.homepage_config;
CREATE POLICY "Admins can manage homepage config" ON public.homepage_config
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_config;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

ALTER TABLE public.homepage_config REPLICA IDENTITY FULL;
