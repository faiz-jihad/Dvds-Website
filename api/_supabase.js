import { createClient } from '@supabase/supabase-js';

function createServerClient(key) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseServerClient() {
  // Checkout creates orders and records provider events through RPCs that are
  // intentionally available only to service_role.  An anon key may read
  // public catalogue data, but cannot safely create or settle an order.
  return createServerClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabasePublicClient() {
  // Quotes only read catalogue, promotion, and storefront settings data. They
  // may safely use the same anonymous access policy as the storefront, so a
  // missing payment secret never prevents a shopper from seeing their total.
  return createServerClient(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
}
