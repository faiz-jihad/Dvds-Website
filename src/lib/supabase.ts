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
const REMEMBER_KEY = 'az_rayan_auth_remember';

export function setAuthPersistence(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, String(remember));
}

export const authStorage = {
  getItem(key: string) {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    const remember = localStorage.getItem(REMEMBER_KEY) !== 'false';
    const selected = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    selected.setItem(key, value);
    other.removeItem(key);
  },
  removeItem(key: string) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { storage: typeof window !== 'undefined' ? authStorage : undefined } })
  : null;
