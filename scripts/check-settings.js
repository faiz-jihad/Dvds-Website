import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('store_settings').select('*').eq('singleton', true).maybeSingle();
  if (error) {
    console.error('Error fetching store_settings:', error);
  } else {
    console.log('Store Settings:', JSON.stringify({
      hero_youtube_enabled: data?.hero_youtube_enabled,
      hero_youtube_url: data?.hero_youtube_url,
      hero_trailers: data?.hero_trailers,
      hero_youtube_mute: data?.hero_youtube_mute,
      hero_bg_image: data?.hero_bg_image
    }, null, 2));
  }
}

check();
