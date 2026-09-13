import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl
  && supabaseAnonKey
  && !supabaseUrl.includes('placeholder')
  && !supabaseUrl.includes('your-supabase'),
);

// Operational records are never emulated in the browser. Without a backend,
// screens surface a configuration error instead of silently using sample data.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
