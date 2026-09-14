import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum tersedia di .env.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  console.log('Testing connection to Supabase...');
  console.log('Counts below are rows visible to the anonymous storefront key (RLS applies).');
  const tables = [
    'profiles',
    'categories',
    'products',
    'genres',
    'product_genres',
    'orders',
    'order_items',
    'promotions',
    'store_settings',
    'inventory_movements',
    'order_status_history',
    'admin_audit_log',
    'contact_messages',
    'homepage_config',
  ];
  let failed = false;
  const visibleCounts = {};
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { head: true, count: 'exact' }).limit(1);
    if (error) {
      failed = true;
      console.log(`Table '${table}': ERROR -> ${error.message} (code: ${error.code})`);
    } else {
      visibleCounts[table] = count ?? 0;
      console.log(`Table '${table}': OK, rows found = ${count ?? 0}`);
    }
  }

  if ((visibleCounts.products ?? 0) === 0 && (visibleCounts.product_genres ?? 0) > 0) {
    console.log(
      "Catalog import detected: product_genres has rows, while products are hidden because imported products are drafts and RLS only exposes active products to the storefront key.",
    );
  }

  if ((visibleCounts.profiles ?? 0) === 0) {
    console.log(
      "Admin note: no profile is visible. A real Supabase Auth user with profiles.role = 'admin' or 'staff' is required to manage draft products; the local demo login does not bypass database RLS.",
    );
  }

  const { error: productMetadataError } = await supabase
    .from('products')
    .select('id,imdb_rating,imdb_id', { head: true })
    .limit(1);
  if (productMetadataError) {
    failed = true;
    console.log(`Product metadata columns: MISSING -> ${productMetadataError.message}`);
  } else {
    console.log('Product metadata columns: OK');
  }

  const { error: companyIdentityError } = await supabase
    .from('store_settings')
    .select('registered_company_name,company_number,registered_office_address,companies_house_url', { head: true })
    .limit(1);
  if (companyIdentityError) {
    failed = true;
    console.log(`Company identity columns: MISSING -> ${companyIdentityError.message}`);
  } else {
    console.log('Company identity columns: OK');
  }

  const functionChecks = [
    ['subscribe_newsletter', { p_email: 'x' }],
    ['set_product_genres', { p_product_id: '00000000-0000-0000-0000-000000000000', p_genre_ids: [] }],
    ['adjust_product_stock', { p_product_id: '00000000-0000-0000-0000-000000000000', p_delta: 1, p_reason: 'schema check' }],
    ['transition_order_status', {
      p_order_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'pending',
      p_fulfilment_status: 'unfulfilled',
      p_carrier: null,
      p_tracking_number: null,
      p_note: null,
    }],
  ];
  for (const [name, args] of functionChecks) {
    const { error } = await supabase.rpc(name, args);
    if (error?.code === 'PGRST202' || error?.code === '42883') {
      failed = true;
      console.log(`Function '${name}': MISSING -> ${error.message}`);
    } else {
      console.log(`Function '${name}': OK`);
    }
  }
  if (failed) process.exitCode = 1;
}

test();
