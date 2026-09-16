import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { build } from 'esbuild';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

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

test('product and genre saving is atomic, stock-safe, audited and restricted to staff', async () => {
  const genre = (await db.query("INSERT INTO genres(name,slug) VALUES ('Atomic','atomic') RETURNING id")).rows[0].id;
  const fields = { sku: 'ATOMIC', title: 'Atomic title', slug: 'atomic-title', price: 15, stock_quantity: 4, cover_image_url: '/cover.jpg' };
  const save = (id, values, genres) => db.query('SELECT save_admin_product($1,$2,$3) AS product', [id, values, genres]);
  await assert.rejects(asUser(customer, () => save(null, fields, [genre])), /Admin access/);
  await assert.rejects(asUser(staff, () => save(null, fields, [randomUUID()])), /foreign key/);
  assert.equal((await db.query("SELECT id FROM products WHERE sku='ATOMIC'")).rows.length, 0);
  const saved = (await asUser(staff, () => save(null, fields, [genre]))).rows[0].product;
  assert.equal(saved.stock_quantity, 4);
  const ledger = (await db.query('SELECT * FROM inventory_movements WHERE product_id=$1', [saved.id])).rows;
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].quantity_before, 0);
  assert.equal(ledger[0].actor_id, staff);
  await assert.rejects(asUser(staff, () => save(saved.id, { title: 'Failed edit' }, [randomUUID()])), /foreign key/);
  assert.equal((await db.query('SELECT title FROM products WHERE id=$1', [saved.id])).rows[0].title, 'Atomic title');
  assert.equal((await db.query('SELECT genre_id FROM product_genres WHERE product_id=$1', [saved.id])).rows[0].genre_id, genre);
  await asUser(staff, () => save(saved.id, { title: 'Saved edit', runtime_minutes: null }, []));
  assert.equal((await db.query('SELECT stock_quantity FROM products WHERE id=$1', [saved.id])).rows[0].stock_quantity, 4);
  assert.equal((await db.query('SELECT * FROM product_genres WHERE product_id=$1', [saved.id])).rows.length, 0);
  await assert.rejects(asUser(staff, () => save(saved.id, { stock_quantity: 100 }, [])), /Use Inventory/);
  await assert.rejects(asUser(staff, () => save(saved.id, { id: randomUUID() }, [])), /Unsupported/);
  assert.ok((await db.query('SELECT id FROM admin_audit_log WHERE record_id=$1', [saved.id])).rows.length >= 2);
});

test('media library is shared between administrators and staff, private to customers and audited', async () => {
  const id = randomUUID();
  await asUser(staff, () => db.query('INSERT INTO media_assets(id,asset_data) VALUES ($1,$2)', [id, { url: '/shared.jpg', filename: 'shared.jpg' }]));
  await asUser(owner, async () => {
    assert.equal((await db.query('SELECT asset_data FROM media_assets WHERE id=$1', [id])).rows[0].asset_data.url, '/shared.jpg');
  });
  await asUser(customer, async () => {
    assert.equal((await db.query('SELECT * FROM media_assets WHERE id=$1', [id])).rows.length, 0);
    await assert.rejects(db.query("INSERT INTO media_assets(id,asset_data) VALUES ('denied','{\"url\":\"/x.jpg\",\"filename\":\"x.jpg\"}')"), /row-level security/);
  });
  await asUser(staff, () => db.query('DELETE FROM media_assets WHERE id=$1', [id]));
  assert.equal((await db.query('SELECT * FROM admin_audit_log WHERE record_id=$1', [id])).rows.length, 2);
  assert.ok((await db.query("SELECT * FROM admin_audit_log WHERE table_name='homepage_config'")).rows.length > 0);
});

async function checkoutFixture(method = 'card', quantity = 2) {
  const productId = randomUUID();
  await db.query("INSERT INTO products(id,sku,title,slug,price,stock_quantity,status,cover_image_url) VALUES ($1::UUID,$2,'Checkout title',$2,10,3,'active','/snapshot.jpg')", [productId, productId]);
  const request = randomUUID();
  const values = { email: 'checkout@example.test', user_id: customer, payment_method: method, payment_provider: { card: 'stripe', paypal: 'paypal', bank_transfer: 'manual_bank' }[method], subtotal: quantity * 10, shipping_amount: 5.99, discount_amount: 0, total_amount: quantity * 10 + 5.99, shipping_address: { full_name: 'Test buyer' }, delivery_tier: 'express', delivery_name: 'Test priority', bank_details: method === 'bank_transfer' ? { bank_name: 'Original Bank', bank_account_number: '12345678' } : null };
  const lines = [{ product_id: productId, quantity, base_price: 10, unit_price: 10, total_price: quantity * 10, product_title: 'Checkout title', product_sku: productId, cover_image_url: '/snapshot.jpg' }];
  const args = [request, 'a'.repeat(64), 'b'.repeat(64), values, lines];
  const create = () => db.query('SELECT create_checkout_order($1,$2,$3,$4,$5) AS result', args);
  const orderId = (await create()).rows[0].result.id;
  return { orderId, productId, args, create };
}
const readOrder = async (id) => (await db.query('SELECT * FROM orders WHERE id=$1', [id])).rows[0];
const stock = async (id) => (await db.query('SELECT stock_quantity FROM products WHERE id=$1', [id])).rows[0].stock_quantity;
const pay = (id, provider = 'stripe', reference = 'cs-test', capture = `payment-${id}`) => db.query('SELECT record_checkout_payment($1,$2,$3,$4,25.99,\'GBP\')', [id, provider, reference, capture]);

test('checkout stores order items, delivery, bank snapshot and reserves inventory exactly once', async () => {
  const fixture = await checkoutFixture('bank_transfer');
  const row = await readOrder(fixture.orderId);
  assert.equal(row.payment_status, 'awaiting_payment');
  assert.equal(row.status, 'pending');
  assert.equal(Number(row.total_amount), 25.99);
  assert.equal(row.delivery_name, 'Test priority');
  assert.equal(row.bank_transfer_reference, row.order_number);
  assert.equal(row.bank_details.bank_name, 'Original Bank');
  const items = (await db.query('SELECT * FROM order_items WHERE order_id=$1', [row.id])).rows;
  assert.equal(items.length, 1); assert.equal(items[0].quantity, 2);
  assert.equal(items[0].product_snapshot.cover_image_url, '/snapshot.jpg');
  assert.equal(await stock(fixture.productId), 1);
  assert.equal((await fixture.create()).rows[0].result.id, row.id);
  assert.equal(await stock(fixture.productId), 1);
  await asUser(owner, () => db.query('SELECT confirm_bank_transfer_payment($1,$2)', [row.id, 'Bank receipt checked']));
  assert.equal((await readOrder(row.id)).status, 'processing');
  await asUser(staff, () => db.query("SELECT transition_order_status($1,'dispatched','fulfilled','Test carrier','TRACK-42')", [row.id]));
  await asUser(customer, async () => {
    const receipt = await readOrder(row.id);
    assert.equal(receipt.tracking_number, 'TRACK-42');
    assert.equal(receipt.payment_status, 'paid');
  });
});

test('stock contention and price changes roll back all order creation', async () => {
  const fixture = await checkoutFixture();
  const args = [...fixture.args]; args[0] = randomUUID();
  await assert.rejects(db.query('SELECT create_checkout_order($1,$2,$3,$4,$5)', args), /Stock changed/);
  assert.equal((await db.query('SELECT id FROM orders WHERE checkout_request_id=$1', [args[0]])).rows.length, 0);
  assert.equal(await stock(fixture.productId), 1);
  args[4] = [{ ...args[4][0], quantity: 1, base_price: 1 }];
  await assert.rejects(db.query('SELECT create_checkout_order($1,$2,$3,$4,$5)', args), /price changed/);
  const wrongHash = [...fixture.args]; wrongHash[1] = 'c'.repeat(64);
  await assert.rejects(db.query('SELECT create_checkout_order($1,$2,$3,$4,$5)', wrongHash), /does not match/);
});

test('browser roles cannot create paid orders, inject line items, or call server payment RPCs', async () => {
  const fixture = await checkoutFixture();
  for (const role of [customer, staff, owner]) await asUser(role, async () => {
    await assert.rejects(db.query("INSERT INTO orders(order_number,user_id,email,subtotal,total_amount,shipping_address,payment_status) VALUES ('FORGED',$1,'x@test.test',1,1,'{}','paid')", [role]), /row-level security/);
    await assert.rejects(db.query("INSERT INTO order_items(order_id,product_id,product_title,quantity,unit_price,total_price) VALUES ($1,$2,'Injected',1,0,0)", [fixture.orderId, fixture.productId]), /row-level security/);
    await assert.rejects(pay(fixture.orderId), /permission denied/);
    await assert.rejects(fixture.create(), /permission denied/);
    assert.equal((await db.query("UPDATE orders SET payment_status='paid' WHERE id=$1 RETURNING id", [fixture.orderId])).rows.length, 0);
  });
  assert.equal((await readOrder(fixture.orderId)).payment_status, 'pending');
});

test('provider validation rejects amount/session mismatch; duplicate capture preserves dispatch', async () => {
  const { orderId } = await checkoutFixture();
  await db.query("UPDATE orders SET checkout_session_id='cs-test' WHERE id=$1", [orderId]);
  await assert.rejects(db.query("SELECT record_checkout_payment($1,'stripe','cs-test','pi-invalid',0.01,'GBP')", [orderId]), /does not match/);
  await assert.rejects(pay(orderId, 'stripe', 'cs-other'), /session mismatch/);
  await pay(orderId);
  assert.equal((await readOrder(orderId)).status, 'processing');
  await asUser(staff, () => db.query("SELECT transition_order_status($1,'dispatched','fulfilled','Carrier','TRACK')", [orderId]));
  const historyBefore = (await db.query('SELECT * FROM order_status_history WHERE order_id=$1', [orderId])).rows.length;
  await pay(orderId);
  assert.equal((await readOrder(orderId)).status, 'dispatched');
  assert.equal((await db.query('SELECT * FROM order_status_history WHERE order_id=$1', [orderId])).rows.length, historyBefore);
  await db.query("SELECT expire_checkout_order($1,'cs-test')", [orderId]);
  assert.equal((await readOrder(orderId)).status, 'dispatched');
});

test('expired orders release stock once; late payments require review and cannot dispatch', async () => {
  const { orderId, productId } = await checkoutFixture();
  // A signed expiry event can arrive before the creation response saves the session ID.
  await db.query("SELECT expire_checkout_order($1,'cs-expired')", [orderId]);
  await db.query("SELECT expire_checkout_order($1,'cs-expired')", [orderId]);
  assert.equal(await stock(productId), 3);
  assert.equal((await readOrder(orderId)).status, 'cancelled');
  await pay(orderId, 'stripe', 'cs-expired');
  const row = await readOrder(orderId);
  assert.equal(row.payment_status, 'paid'); assert.equal(row.payment_review_required, true);
  assert.equal(row.status, 'pending'); assert.equal(await stock(productId), 3);
  await assert.rejects(asUser(owner, () => db.query("SELECT transition_order_status($1,'processing','unfulfilled')", [orderId])), /review/);
});

test('PayPal capture matches its order; partial and full refunds deduplicate provider events', async () => {
  const { orderId } = await checkoutFixture('paypal');
  await db.query("UPDATE orders SET paypal_order_id='PP-ORDER' WHERE id=$1", [orderId]);
  await assert.rejects(pay(orderId, 'paypal', 'OTHER'), /PayPal order mismatch/);
  await pay(orderId, 'paypal', 'PP-ORDER', 'PP-CAPTURE');
  await db.query("SELECT record_checkout_refund($1,'RF-1',5,false)", [orderId]);
  await db.query("SELECT record_checkout_refund($1,'RF-1',5,false)", [orderId]);
  assert.equal(Number((await readOrder(orderId)).refunded_amount), 5);
  assert.equal((await readOrder(orderId)).payment_status, 'partially_refunded');
  await assert.rejects(asUser(owner, () => db.query("SELECT transition_order_status($1,'cancelled','unfulfilled',NULL,NULL,'Cancelled')", [orderId])), /refund workflow/);
  await pay(orderId, 'paypal', 'PP-ORDER', 'PP-CAPTURE');
  assert.equal((await readOrder(orderId)).payment_status, 'partially_refunded');
  await db.query("SELECT record_checkout_refund($1,'RF-2',20.99,false)", [orderId]);
  assert.equal((await readOrder(orderId)).status, 'refunded');
  assert.equal(Number((await readOrder(orderId)).refunded_amount), 25.99);
});

test('out-of-order Stripe cumulative refunds never reduce the refunded amount', async () => {
  const { orderId } = await checkoutFixture();
  await assert.rejects(db.query("SELECT record_checkout_refund($1,'early',5,true)", [orderId]), /not synchronized/);
  await pay(orderId, 'stripe', 'cs-refund');
  await db.query("SELECT record_checkout_refund($1,'newer',10,true)", [orderId]);
  await db.query("SELECT record_checkout_refund($1,'older',5,true)", [orderId]);
  assert.equal(Number((await readOrder(orderId)).refunded_amount), 10);
});

test('admin repair SQL can be repeated without removing orders, users, products or their stock', async () => {
  await db.query("UPDATE store_settings SET registered_company_name='Existing company' WHERE singleton=true");
  const snapshot = () => db.query(`SELECT
    (SELECT count(*) FROM orders) AS orders,
    (SELECT count(*) FROM profiles) AS users,
    (SELECT count(*) FROM products) AS products,
    (SELECT sum(stock_quantity) FROM products) AS stock`);
  const before = (await snapshot()).rows;
  const repair = await readFile('supabase/repair_admin_schema.sql', 'utf8');
  await db.exec(repair);
  await db.exec(repair);
  assert.deepEqual((await snapshot()).rows, before);
  assert.equal((await db.query('SELECT registered_company_name FROM store_settings WHERE singleton=true')).rows[0].registered_company_name, 'Existing company');
  assert.equal((await db.query("SELECT support_email FROM store_settings WHERE singleton=true")).rows[0].support_email, 'support@example.test');
  await asUser(staff, async () => {
    await assert.rejects(db.query('SELECT admin_set_user_role($1,$2)', [customer, 'admin']), /Administrator access/);
  });
});

test('repair upgrades the pre-payment schema without replaying catalogue seed data', async () => {
  const legacy = new PGlite({ extensions: { uuid_ossp, pg_trgm } });
  try {
    await legacy.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
      CREATE TABLE storage.buckets(id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
      CREATE TABLE storage.objects(id UUID DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;`);
    const migrations = (await readdir('supabase/migrations')).filter((file) => file.endsWith('.sql') && file < '20260914000006').sort();
    for (const file of migrations) await legacy.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    await assert.rejects(legacy.query('SELECT payment_method FROM orders LIMIT 0'), /does not exist/);
    const productCount = (await legacy.query('SELECT count(*) FROM products')).rows[0].count;
    await legacy.exec(await readFile('supabase/repair_admin_schema.sql', 'utf8'));
    await legacy.query('SELECT payment_method,checkout_session_id,refunded_amount FROM orders LIMIT 0');
    await legacy.query('SELECT payment_card_enabled,payment_bank_transfer_enabled,bank_account_number FROM store_settings LIMIT 0');
    await legacy.query('SELECT id FROM payment_events LIMIT 0');
    await legacy.query('SELECT registered_company_name,company_number FROM store_settings LIMIT 0');
    await legacy.query('SELECT id,asset_data FROM media_assets LIMIT 0');
    assert.ok((await legacy.query("SELECT to_regprocedure('public.save_admin_product(uuid,jsonb,uuid[])') AS fn")).rows[0].fn);
    assert.equal((await legacy.query('SELECT count(*) FROM products')).rows[0].count, productCount);
    assert.ok((await legacy.query("SELECT to_regprocedure('public.admin_delete_user(uuid)') AS fn")).rows[0].fn);
  } finally { await legacy.close(); }
});
