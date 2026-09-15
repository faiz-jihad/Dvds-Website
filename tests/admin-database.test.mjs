import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { build } from 'esbuild';
import vm from 'node:vm';

let db;
const owner = '11111111-1111-4111-8111-111111111111';
const staff = '22222222-2222-4222-8222-222222222222';
const customer = '33333333-3333-4333-8333-333333333333';
const product = '44444444-4444-4444-8444-444444444444';

before(async () => {
  db = new PGlite({ extensions: { uuid_ossp, pg_trgm } });
  // Supabase-owned schemas and roles, with the same auth.uid() JWT contract.
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
    CREATE TABLE storage.buckets(id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects(id UUID DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
  `);
  const paths = (await readdir('supabase/migrations')).filter((p) => p.endsWith('.sql')).sort();
  for (const path of paths) {
    try { await db.exec(await readFile(`supabase/migrations/${path}`, 'utf8')); }
    catch (error) { throw new Error(`Migration ${path}: ${error.message}`); }
  }
  // Supabase grants table access separately from RLS. Keep role updates revoked.
  await db.exec(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, storage TO authenticated;
    GRANT SELECT ON ALL TABLES IN SCHEMA public, storage TO anon;
    REVOKE UPDATE ON public.profiles FROM authenticated;
    GRANT UPDATE(full_name, phone, avatar_url) ON public.profiles TO authenticated;
    INSERT INTO auth.users(id,email) VALUES ('${owner}','owner@example.test'),('${staff}','staff@example.test'),('${customer}','customer@example.test');
    UPDATE public.profiles SET role='admin' WHERE id='${owner}';
    UPDATE public.profiles SET role='staff' WHERE id='${staff}';
    INSERT INTO public.products(id,sku,title,slug,price,stock_quantity,cover_image_url,status)
    VALUES ('${product}','TEST','Test title','test-title',10,5,'/test.jpg','draft');
  `);
});
after(async () => { if (db) await db.close(); });

async function asUser(id, fn) {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec('SET ROLE authenticated');
  try { return await fn(); } finally { await db.exec('RESET ROLE'); }
}
async function order(number, method = 'bank_transfer', status = 'pending', payment = 'awaiting_payment') {
  return (await db.query(`INSERT INTO public.orders(order_number,user_id,email,subtotal,total_amount,shipping_address,payment_method,status,payment_status)
    VALUES ($1,$2,'customer@example.test',10,10,'{}',$3,$4,$5) RETURNING id`, [number, customer, method, status, payment])).rows[0].id;
}

test('bank confirmation persists payment, note and valid audit history atomically', async () => {
  const id = await order('BANK-OK');
  await asUser(owner, () => db.query('SELECT public.confirm_bank_transfer_payment($1,$2)', [id, 'Receipt verified']));
  const row = (await db.query('SELECT * FROM orders WHERE id=$1', [id])).rows[0];
  assert.equal(row.payment_status, 'paid');
  assert.equal(row.status, 'processing');
  assert.equal(row.payment_confirmed_by, owner);
  assert.equal(row.internal_notes, 'Receipt verified');
  assert.ok(row.paid_at);
  assert.equal((await db.query("SELECT * FROM admin_audit_log WHERE record_id=$1 AND action='UPDATE'", [id])).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM order_status_history WHERE order_id=$1', [id])).rows.length, 1);
  // Retrying after a network interruption must not add another confirmation.
  await asUser(owner, () => db.query('SELECT public.confirm_bank_transfer_payment($1,$2)', [id, 'Duplicate']));
  assert.equal((await db.query('SELECT * FROM order_status_history WHERE order_id=$1', [id])).rows.length, 1);
});

test('bank confirmation rejects staff, card payments and cancelled orders', async () => {
  const pending = await order('BANK-STAFF');
  await assert.rejects(asUser(staff, () => db.query('SELECT public.confirm_bank_transfer_payment($1)', [pending])), /Only administrators/);
  const card = await order('CARD', 'card');
  await assert.rejects(asUser(owner, () => db.query('SELECT public.confirm_bank_transfer_payment($1)', [card])), /not a bank transfer/);
  const cancelled = await order('CANCELLED', 'bank_transfer', 'cancelled');
  await assert.rejects(asUser(owner, () => db.query('SELECT public.confirm_bank_transfer_payment($1)', [cancelled])), /cannot be confirmed/);
  assert.equal((await db.query('SELECT payment_status FROM orders WHERE id=$1', [pending])).rows[0].payment_status, 'awaiting_payment');
});

test('staff can adjust stock with ledger; negative stock rolls back', async () => {
  await asUser(staff, () => db.query('SELECT * FROM adjust_product_stock($1,2,$2)', [product, 'Stock count']));
  assert.equal((await db.query('SELECT stock_quantity FROM products WHERE id=$1', [product])).rows[0].stock_quantity, 7);
  const ledger = (await db.query('SELECT * FROM inventory_movements WHERE product_id=$1', [product])).rows;
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].quantity_before, 5);
  assert.equal(ledger[0].quantity_after, 7);
  await assert.rejects(asUser(staff, () => db.query('SELECT * FROM adjust_product_stock($1,-8,$2)', [product, 'Invalid count'])), /negative/);
  assert.equal((await db.query('SELECT stock_quantity FROM products WHERE id=$1', [product])).rows[0].stock_quantity, 7);
});

test('fulfilment requires payment and tracking, then dispatches and delivers', async () => {
  const id = await order('FULFILMENT', 'card', 'processing', 'paid');
  await assert.rejects(asUser(staff, () => db.query("SELECT transition_order_status($1,'dispatched','fulfilled')", [id])), /tracking/);
  await asUser(staff, () => db.query("SELECT transition_order_status($1,'dispatched','fulfilled','Royal Mail','TRACK123','Packed')", [id]));
  await asUser(staff, () => db.query("SELECT transition_order_status($1,'delivered','fulfilled')", [id]));
  const row = (await db.query('SELECT * FROM orders WHERE id=$1', [id])).rows[0];
  assert.equal(row.status, 'delivered');
  assert.ok(row.dispatched_at && row.delivered_at);
  assert.equal((await db.query('SELECT * FROM order_status_history WHERE order_id=$1', [id])).rows.length, 2);
});

test('role management rejects staff escalation and owner self-demotion', async () => {
  await assert.rejects(asUser(staff, () => db.query("SELECT admin_set_user_role($1,'admin')", [staff])), /Administrator access/);
  await assert.rejects(asUser(owner, () => db.query("SELECT admin_set_user_role($1,'customer')", [owner])), /own administrator/);
  await asUser(owner, () => db.query("SELECT admin_set_user_role($1,'staff')", [customer]));
  assert.equal((await db.query('SELECT role FROM profiles WHERE id=$1', [customer])).rows[0].role, 'staff');
  await asUser(owner, () => db.query("SELECT admin_set_user_role($1,'customer')", [customer]));
});

test('deleting a user removes auth and profile, preserves orders and prevents self deletion', async () => {
  const id = '55555555-5555-4555-8555-555555555555';
  await db.query("INSERT INTO auth.users(id,email) VALUES ($1,'delete@example.test')", [id]);
  const orderId = await order('KEEP-HISTORY');
  await db.query('UPDATE orders SET user_id=$1 WHERE id=$2', [id, orderId]);
  await assert.rejects(asUser(staff, () => db.query('SELECT admin_delete_user($1)', [id])), /Administrator access/);
  await assert.rejects(asUser(owner, () => db.query('SELECT admin_delete_user($1)', [owner])), /own administrator/);
  await asUser(owner, () => db.query('SELECT admin_delete_user($1)', [id]));
  assert.equal((await db.query('SELECT * FROM auth.users WHERE id=$1', [id])).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM profiles WHERE id=$1', [id])).rows.length, 0);
  assert.equal((await db.query('SELECT user_id FROM orders WHERE id=$1', [orderId])).rows[0].user_id, null);
});

test('catalog, taxonomy, promotions and support changes obey RLS and persist', async () => {
  await asUser(staff, async () => {
    const category = (await db.query("INSERT INTO categories(name,slug) VALUES ('Test category','test-category') RETURNING id")).rows[0].id;
    const genre = (await db.query("INSERT INTO genres(name,slug) VALUES ('Test genre','test-genre') RETURNING id")).rows[0].id;
    await db.query('UPDATE products SET category_id=$1 WHERE id=$2', [category, product]);
    await db.query('SELECT set_product_genres($1,$2)', [product, [genre]]);
    assert.equal((await db.query('SELECT * FROM product_genres WHERE product_id=$1', [product])).rows.length, 1);
    await db.query("UPDATE products SET status='archived' WHERE id=$1", [product]);
    await db.query("INSERT INTO promotions(code,type,value,minimum_order,is_active,starts_at) VALUES ('TEST10','percentage',10,0,true,NOW())");
    await db.query("UPDATE promotions SET is_active=false WHERE code='TEST10'");
    assert.equal((await db.query("DELETE FROM promotions WHERE code='TEST10' RETURNING id")).rows.length, 1);
    const message = (await db.query("INSERT INTO contact_messages(name,email,message) VALUES ('Test customer','customer@example.test','A test support message') RETURNING id")).rows[0].id;
    await db.query("UPDATE contact_messages SET status='resolved',internal_note='Replied',assigned_to=$1 WHERE id=$2", [staff, message]);
    assert.equal((await db.query('SELECT status FROM contact_messages WHERE id=$1', [message])).rows[0].status, 'resolved');
    await db.query('DELETE FROM genres WHERE id=$1', [genre]);
    await db.query('DELETE FROM categories WHERE id=$1', [category]);
  });
  await asUser(customer, async () => {
    assert.equal((await db.query('SELECT * FROM products WHERE id=$1', [product])).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM admin_audit_log')).rows.length, 0);
  });
});

test('homepage drafts stay private and image writes require staff/admin', async () => {
  await asUser(staff, async () => {
    await db.query(`INSERT INTO homepage_config(id,config_data) VALUES ('draft','{"sections":[]}'),('published','{"sections":[]}')
      ON CONFLICT(id) DO UPDATE SET config_data=EXCLUDED.config_data`);
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('products','staff-image.png')");
  });
  await asUser(customer, async () => {
    assert.equal((await db.query("SELECT * FROM homepage_config WHERE id='draft'")).rows.length, 0);
    assert.equal((await db.query("SELECT * FROM homepage_config WHERE id='published'")).rows.length, 1);
    await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('products','blocked.png')"), /row-level security/);
  });
});

test('complete settings form persists with generated UUID and can be updated', async () => {
  const bundle = await build({ entryPoints: ['src/data/defaultStoreSettings.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
  const context = { module: { exports: {} } };
  vm.runInNewContext(bundle.outputFiles[0].text, context);
  const { id, ...values } = context.module.exports.DEFAULT_STORE_SETTINGS;
  const keys = Object.keys(values);
  // Simulate an empty store so the default UI ID cannot accidentally be used.
  await db.exec('DELETE FROM store_settings');
  await asUser(owner, async () => {
    const result = await db.query(`INSERT INTO store_settings(${keys.join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING id`, Object.values(values));
    const savedId = result.rows[0].id;
    assert.match(savedId, /^[a-f0-9-]{36}$/);
    await db.query("UPDATE store_settings SET support_email='support@example.test' WHERE id=$1", [savedId]);
    assert.equal((await db.query('SELECT support_email FROM store_settings WHERE id=$1', [savedId])).rows[0].support_email, 'support@example.test');
  });
});
