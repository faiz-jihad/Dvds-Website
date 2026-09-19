-- Add YouTube trailer & hero video configuration columns to store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS hero_youtube_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hero_youtube_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_youtube_mute BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hero_youtube_loop BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hero_youtube_start_minutes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hero_youtube_start_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hero_youtube_end_minutes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hero_youtube_end_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hero_trailers JSONB NOT NULL DEFAULT '[]'::jsonb;
