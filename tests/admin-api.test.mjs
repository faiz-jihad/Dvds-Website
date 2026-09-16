import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';

const require = createRequire(import.meta.url);
function backend(responses = []) {
  const calls = [];
  const result = () => responses.shift() || { data: null, error: null };
  const db = {
    calls,
    from(table) {
      const call = { table, actions: [] }; calls.push(call);
      const chain = new Proxy({}, { get(_, key) {
        if (key === 'then') return (resolve, reject) => Promise.resolve(result()).then(resolve, reject);
        return (...args) => { call.actions.push([key, ...args]); return chain; };
      } });
      return chain;
    },
    rpc(name, args) { calls.push({ rpc: name, args }); return Promise.resolve(result()); },
    auth: {
      signInWithPassword(input) { calls.push({ login: input }); return Promise.resolve(result()); },
      signOut() { calls.push({ logout: true }); return Promise.resolve({ error: null }); },
      getUser() { return Promise.resolve({ data: { user: { id: 'admin-id' } }, error: null }); },
    },
  };
  return db;
}

const compiled = new Map();
async function load(entry, db, configured = true) {
  if (!compiled.has(entry)) {
    const output = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
      plugins: [{ name: 'test-backend', setup(b) {
        b.onResolve({ filter: /\/supabase$/ }, () => ({ path: 'backend', namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `export const supabase = globalThis.__configured ? globalThis.__db : null;
          export const isSupabaseConfigured = globalThis.__configured;
          export function setAuthPersistence(remember) { globalThis.__db.calls.push({ remember }); }` }));
      } }],
    });
    compiled.set(entry, output.outputFiles[0].text);
  }
  const context = { module: { exports: {} }, require, console, crypto: webcrypto, __db: db, __configured: configured,
    // Any remaining operational local-storage access makes these tests fail.
    localStorage: { getItem() { throw Error('Unexpected local cache access'); }, setItem() { throw Error('Unexpected local write'); } },
  };
  vm.runInNewContext(compiled.get(entry), context);
  return context.module.exports;
}
const denied = { data: null, error: { code: '42501', message: 'row-level security denied' } };

test('all admin list screens propagate database failures', async (t) => {
  for (const name of ['getProducts', 'getCategories', 'getGenres', 'getOrders', 'getPromotions', 'getStoreSettings', 'getUsers', 'getContactMessages']) {
    await t.test(name, async () => {
      const { adminApi } = await load('src/lib/adminApi.ts', backend([denied]));
      await assert.rejects(adminApi[name](), /access required/i);
    });
  }
});

test('Users schema check is independent of missing payment migrations and never invokes mutations', async () => {
  const db = backend([{ data: [] }, { error: { code: '42703', message: 'column payment_card_enabled does not exist' } }]);
  const { adminApi } = await load('src/lib/adminApi.ts', db);
  const result = await adminApi.checkSchema('users');
  assert.deepEqual(Array.from(result.tables), ['profiles']);
  assert.equal(db.calls.length, 1);
  assert.equal(db.calls[0].table, 'profiles');
  assert.ok(db.calls[0].actions.some(([action, limit]) => action === 'limit' && limit === 0));
  assert.ok(!db.calls.some((call) => call.rpc));
});

test('schema failures identify the actual missing component for the requested page', async () => {
  const db = backend([{ error: { code: '42703', message: 'column orders.payment_method does not exist' } }, { data: [] }]);
  const { adminApi } = await load('src/lib/adminApi.ts', db);
  await assert.rejects(adminApi.checkSchema('orders'), (error) => {
    assert.equal(error.code, 'SCHEMA_NOT_READY');
    assert.match(error.details.join(' '), /orders.payment_method/);
    return true;
  });
  assert.deepEqual(db.calls.map((call) => call.table), ['orders', 'order_items']);
});

test('read-only schema diagnostics keep permission and connection failures distinct from migrations', async () => {
  const db = backend([denied]);
  const { adminApi } = await load('src/lib/adminApi.ts', db);
  await assert.rejects(adminApi.checkSchema('users'), (error) => error.code === 'RLS_PERMISSION_DENIED');
  const clean = backend();
  const full = await load('src/lib/adminApi.ts', clean);
  await full.adminApi.checkSchema();
  assert.ok(clean.calls.length > 10);
  assert.ok(clean.calls.every((call) => !call.rpc && call.actions.some(([action, limit]) => action === 'limit' && limit === 0)));
});

test('admin routes select their own schema scope including nested and trailing slash URLs', async () => {
  const { adminSchemaScope } = await load('src/lib/adminSchema.ts', backend());
  for (const [path, expected] of [['/admin/users', 'users'], ['/admin/users/', 'users'], ['/admin/orders/123', 'orders'], ['/admin', 'dashboard'], ['/admin/settings', 'settings']]) {
    assert.equal(adminSchemaScope(path), expected);
  }
});

test('every admin mutation rejects denied writes instead of reporting local success', async (t) => {
  const cases = [
    ['saveProductWithGenres', [null, { title: 'Test' }, []]],
    ['createProduct', [{}]], ['updateProduct', ['id', {}]], ['archiveProduct', ['id']], ['deleteProduct', ['id']],
    ['setProductGenres', ['id', []]], ['createCategory', [{}]], ['updateCategory', ['id', {}]], ['deleteCategory', ['id']],
    ['createGenre', [{}]], ['updateGenre', ['id', {}]], ['deleteGenre', ['id']],
    ['createPromotion', [{ code: 'TEST' }]], ['updatePromotion', ['id', {}]], ['deletePromotion', ['id']],
    ['adjustStock', ['id', 1, 'Stock count']], ['updateOrderStatus', ['id', 'dispatched', 'fulfilled']],
    ['confirmBankTransferPayment', ['id', 'Receipt verified']], ['updateContactMessage', ['id', 'resolved', 'Done']],
    ['updateUserRole', ['id', 'staff']], ['deleteUser', ['id']],
  ];
  for (const [name, args] of cases) await t.test(name, async () => {
    const db = backend([denied]);
    const { adminApi } = await load('src/lib/adminApi.ts', db);
    await assert.rejects(adminApi[name](...args), /access required/i);
    assert.equal(db.calls.length, 1, 'failed RPC must not fall back to direct table writes');
  });
});

test('empty live catalog stays empty and deleted product stays missing', async () => {
  const { adminApi } = await load('src/lib/adminApi.ts', backend([{ data: [], error: null }]));
  assert.equal((await adminApi.getProducts()).length, 0);
  const { publicApi } = await load('src/lib/publicApi.ts', backend([{ data: [], error: null }, { data: null, error: null }]));
  assert.equal((await publicApi.getProducts()).length, 0);
  assert.equal(await publicApi.getProductBySlug('old-title'), null);
});

test('no-row deletion is not success', async () => {
  const { adminApi } = await load('src/lib/adminApi.ts', backend([{ data: null, error: null }]));
  await assert.rejects(adminApi.deleteProduct('missing'), /could not be deleted/);
});

test('first settings save uses database-generated ID, and failed write stays failed', async () => {
  const db = backend([{ data: null, error: null }, denied]);
  const { adminApi } = await load('src/lib/adminApi.ts', db);
  await assert.rejects(adminApi.saveStoreSettings({ id: 's100-invalid-id', bank_name: 'Test' }), /access required/i);
  const insert = db.calls[1].actions.find(([action]) => action === 'insert')[1];
  assert.equal('id' in insert, false);
});

test('inventory validates delta and reason before mutation and unwraps RPC rows', async () => {
  const db = backend([{ data: [{ id: 'product', stock_quantity: 7 }], error: null }]);
  const { adminApi } = await load('src/lib/adminApi.ts', db);
  await assert.rejects(adminApi.adjustStock('id', 0, 'Count'), /non-zero/);
  await assert.rejects(adminApi.adjustStock('id', 1.5, 'Count'), /whole-number/);
  await assert.rejects(adminApi.adjustStock('id', 1, 'x'), /reason/);
  assert.equal(db.calls.length, 0);
  assert.equal((await adminApi.adjustStock('id', 2, 'Count')).stock_quantity, 7);
});

test('homepage draft, publish and revert surface failures', async (t) => {
  for (const name of ['getDraftHomepageConfig', 'saveDraftHomepageConfig', 'publishHomepageConfig', 'revertDraftToPublished']) {
    await t.test(name, async () => {
      const { homepageApi } = await load('src/lib/homepageApi.ts', backend([denied]));
      await assert.rejects(homepageApi[name]({ sections: [] }), /denied/);
    });
  }
});

test('homepage publishes draft and live together, then reports success', async () => {
  const db = backend([{ data: [{ id: 'published' }, { id: 'draft' }], error: null }]);
  const { homepageApi } = await load('src/lib/homepageApi.ts', db);
  assert.equal((await homepageApi.publishHomepageConfig({ sections: [] })).status, 'published');
  const rows = db.calls[0].actions.find(([action]) => action === 'upsert')[1];
  assert.equal(rows[0].config_data.status, 'published');
  assert.equal(rows[1].config_data.status, 'draft');
});

test('live taxonomy, promotions and order history never substitute demo rows or hide errors', async () => {
  for (const method of ['getCategories', 'getGenres', 'getActivePromotions', 'getMyOrders']) {
    const { publicApi } = await load('src/lib/publicApi.ts', backend([{ data: [] }]));
    assert.equal((await publicApi[method]()).length, 0, method);
    const failed = await load('src/lib/publicApi.ts', backend([denied]));
    await assert.rejects(failed.publicApi[method](), /could not be loaded/);
  }
});

test('missing settings stay unconfigured in dashboard, while storefront reports an error', async () => {
  const { adminApi } = await load('src/lib/adminApi.ts', backend([{ data: [] }, { data: [] }, { data: null }]));
  assert.equal((await adminApi.getFinancialStats()).settingsConfigured, false);
  const { publicApi } = await load('src/lib/publicApi.ts', backend([{ data: null }]));
  await assert.rejects(publicApi.getStoreSettings(), /unavailable/);
});

test('product form saves metadata and genre links in one RPC', async () => {
  const db = backend([{ data: { id: 'saved', title: 'Updated' } }]);
  const { adminApi } = await load('src/lib/adminApi.ts', db);
  const saved = await adminApi.saveProductWithGenres('saved', { title: 'Updated' }, ['genre']);
  assert.equal(saved.title, 'Updated');
  assert.equal(db.calls.length, 1);
  assert.equal(db.calls[0].rpc, 'save_admin_product');
  assert.equal(db.calls[0].args.p_genre_ids[0], 'genre');
});

test('shared media library persists server metadata and propagates all failures', async () => {
  const asset = { id: 'shared', url: '/image.jpg', filename: 'image.jpg', altText: 'Cover' };
  const db = backend([{ data: { id: asset.id, asset_data: asset } }, { data: [{ id: asset.id, asset_data: asset }] }, { data: { id: asset.id } }]);
  const { homepageApi } = await load('src/lib/homepageApi.ts', db);
  assert.equal((await homepageApi.saveMediaAsset(asset)).url, asset.url);
  assert.equal((await homepageApi.getMediaLibrary())[0].altText, 'Cover');
  await homepageApi.deleteMediaAsset(asset.id);
  assert.ok(db.calls.every((call) => call.table === 'media_assets'));
  for (const [method, args] of [['saveMediaAsset', [asset]], ['getMediaLibrary', []], ['deleteMediaAsset', [asset.id]]]) {
    const failed = await load('src/lib/homepageApi.ts', backend([denied]));
    await assert.rejects(failed.homepageApi[method](...args), /denied/);
  }
});

test('wrong admin password never creates a demo session', async () => {
  const db = backend([{ data: {}, error: { message: 'Invalid login credentials' } }]);
  const { authenticateAdmin } = await load('src/auth/AdminAuth.tsx', db);
  await assert.rejects(authenticateAdmin('admin@azrayan.co.uk', 'anything', true), /Invalid login/);
});

test('valid login keeps exact password and requires verified admin/staff role', async () => {
  const db = backend([{ data: { user: { id: 'id', email: 'admin@example.test' } }, error: null },
    { data: { full_name: 'Owner', role: 'admin' }, error: null }]);
  const { authenticateAdmin } = await load('src/auth/AdminAuth.tsx', db);
  assert.equal((await authenticateAdmin(' ADMIN@example.test ', ' padded password ', false)).role, 'admin');
  assert.equal(db.calls.find((c) => c.login).login.password, ' padded password ');
  assert.equal(db.calls.find((c) => c.login).login.email, 'admin@example.test');
  const customerDb = backend([{ data: { user: { id: 'id' } }, error: null }, { data: { role: 'customer' }, error: null }]);
  const customerAuth = await load('src/auth/AdminAuth.tsx', customerDb);
  await assert.rejects(customerAuth.authenticateAdmin('customer@example.test', 'password', true), /privileges/);
  assert.ok(customerDb.calls.some((c) => c.logout));
});

test('unconfigured backend blocks authentication and publishing', async () => {
  const auth = await load('src/auth/AdminAuth.tsx', backend(), false);
  await assert.rejects(auth.authenticateAdmin('admin', 'Admin123!', true), /not configured/);
  const home = await load('src/lib/homepageApi.ts', backend(), false);
  await assert.rejects(home.homepageApi.publishHomepageConfig({}), /Connect Supabase/);
});

test('dashboard counts actual payments, including bank transfers paid today for older orders', async () => {
  const now = new Date().toISOString();
  const db = backend([
    { data: [{ id: 'paid', payment_status: 'paid', total_amount: '25', subtotal: '25', shipping_amount: 0, discount_amount: 0,
      created_at: '2020-01-01T00:00:00Z', paid_at: now },
      { id: 'unpaid', payment_status: 'awaiting_payment', total_amount: '99', subtotal: '99', shipping_amount: 0, discount_amount: 0, created_at: now }], error: null },
    { data: [{ id: 'stock', price: 10, stock_quantity: 1, status: 'active' }], error: null },
    { data: { low_stock_threshold: 3 }, error: null },
  ]);
  const { adminApi } = await load('src/lib/adminApi.ts', db);
  const result = await adminApi.getFinancialStats();
  assert.equal(result.totalRevenue, 25);
  assert.equal(result.todayRevenue, 25);
  assert.equal(result.totalOrders, 2);
  assert.equal(result.lowStockCount, 1);
});

test('dashboard revenue subtracts partial refunds and excludes fully refunded amounts', async () => {
  const now = new Date().toISOString();
  const rows = [
    { payment_status: 'paid', total_amount: 20 },
    { payment_status: 'partially_refunded', total_amount: 25.99, refunded_amount: 5.99 },
    { payment_status: 'refunded', total_amount: 30, refunded_amount: 30 },
    { payment_status: 'pending', total_amount: 100 },
  ].map((row, index) => ({ id: String(index), subtotal: row.total_amount, shipping_amount: 0, discount_amount: 0, created_at: now, paid_at: now, ...row }));
  const { adminApi } = await load('src/lib/adminApi.ts', backend([{ data: rows }, { data: [] }, { data: { low_stock_threshold: 3 } }]));
  const result = await adminApi.getFinancialStats();
  assert.equal(result.totalRevenue, 40);
  assert.equal(result.todayRevenue, 40);
  assert.equal(result.dailyRevenue.reduce((sum, day) => sum + day.amount, 0), 40);
});

test('image validation and storage rejection prevent false upload success', async () => {
  const db = backend();
  db.storage = { from() { return { upload: async () => ({ error: { message: 'Storage denied' } }) }; } };
  const { uploadAdminImage } = await load('src/lib/adminMedia.ts', db);
  await assert.rejects(uploadAdminImage({ type: 'text/plain', size: 10 }), /Choose a/);
  await assert.rejects(uploadAdminImage({ type: 'image/png', size: 6 * 1024 * 1024 }), /5MB/);
  await assert.rejects(uploadAdminImage({ type: 'image/png', size: 1024 }), /Storage denied/);
});

test('remember-me stores session in the selected storage and removes it from both on logout', async () => {
  const output = await build({ entryPoints: ['src/lib/supabase.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    define: { 'import.meta.env.VITE_SUPABASE_URL': '""', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '""' } });
  const storage = () => {
    const entries = new Map();
    return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: (key) => entries.delete(key) };
  };
  const localStorage = storage(); const sessionStorage = storage();
  const context = { module: { exports: {} }, require, localStorage, sessionStorage };
  vm.runInNewContext(output.outputFiles[0].text, context);
  const { authStorage, setAuthPersistence } = context.module.exports;
  setAuthPersistence(false); authStorage.setItem('session', 'temporary');
  assert.equal(sessionStorage.getItem('session'), 'temporary');
  assert.equal(localStorage.getItem('session'), null);
  setAuthPersistence(true); authStorage.setItem('session', 'persistent');
  assert.equal(localStorage.getItem('session'), 'persistent');
  assert.equal(sessionStorage.getItem('session'), null);
  authStorage.removeItem('session');
  assert.equal(authStorage.getItem('session'), null);
});
