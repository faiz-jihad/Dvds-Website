import { createClient } from '@supabase/supabase-js';

const url = 'https://arkeqzfzkeyxdnuykawj.supabase.co';
const key = 'sb_publishable_v0DBI-dduzP3ilrqGpk4WA_dlU5oF29';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing connection to Supabase...');
  const tables = ['categories', 'products', 'genres', 'product_genres', 'store_settings', 'promotions', 'profiles'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}': ERROR -> ${error.message} (code: ${error.code})`);
    } else {
      console.log(`Table '${table}': OK, rows found = ${data.length}`);
    }
  }
}

test();
