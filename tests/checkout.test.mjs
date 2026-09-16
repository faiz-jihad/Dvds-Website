import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { calculateQuote, normalizeItems, paymentMethods, hash, validAccess, publicOrder, authorizeOrder, initializeOrder, endpoint, CheckoutError } from '../api/_checkout.js';
import stripeWebhook from '../api/stripe-webhook.js';
import paypalWebhook from '../api/paypal-webhook.js';
import Stripe from 'stripe';
import { Readable } from 'node:stream';

const id = '11111111-1111-1111-1111-111111111111';
const product = { id, sku: 'DVD-1', title: 'Test film', price: 10.25, stock_quantity: 3, status: 'active', cover_image_url: '/cover.jpg' };
const settings = { free_shipping_threshold: 30, standard_shipping_fee: 2.95, express_shipping_fee: 5.99, standard_shipping_name: 'Tracked delivery', standard_shipping_eta: '2-3 days', express_shipping_name: 'Priority', express_shipping_eta: '1 day', payment_card_enabled: true };
const quote = (overrides = {}, promo = null, code = '', tier = 'standard', quantity = 2) => calculateQuote([{ product_id: id, quantity }], [product], { ...settings, ...overrides }, promo, code, tier);

test('server quotes actual prices, delivery and integer-pence totals', () => {
  const result = quote({}, null, '', 'express');
  assert.equal(result.subtotal, 20.50);
  assert.equal(result.shipping_amount, 5.99);
  assert.equal(result.total_amount, 26.49);
  assert.equal(result.items[0].product_title, 'Test film');
  assert.equal(result.delivery.express.name, 'Priority');
  assert.equal(quote().total_amount, 23.45);
  assert.equal(quote({}, null, '', 'standard', 3).shipping_amount, 0);
  assert.equal(quote({ free_shipping_threshold: 0 }).shipping_amount, 0);
  assert.equal(quote({ express_shipping_fee: 0 }, null, '', 'express').shipping_amount, 0);
});

test('basket validation aggregates duplicate products and rejects unavailable stock', () => {
  assert.equal(normalizeItems([{ product_id: id, quantity: 1 }, { product_id: id, quantity: 2 }])[0].quantity, 3);
  for (const items of [[], [null], [{ product_id: 'fake', quantity: 1 }], [{ product_id: id, quantity: 0 }], [{ product_id: id, quantity: 1.5 }], [{ product_id: id, quantity: 20 }, { product_id: id, quantity: 1 }]]) assert.throws(() => normalizeItems(items));
  assert.throws(() => quote({}, null, '', 'standard', 4), /Only 3 copies/);
  assert.throws(() => calculateQuote([{ product_id: id, quantity: 1 }], [{ ...product, status: 'archived' }], settings, null, '', 'standard'), /no longer available/);
  assert.throws(() => quote({}, null, '', 'unknown'), /delivery method/);
});

test('deal expiry and promo validation use server data and never discount shipping', () => {
  assert.equal(quote({ deal_is_active: true, deal_product_id: id, deal_discount_price: 7.99, deal_ends_at: '2099-01-01' }).subtotal, 15.98);
  assert.equal(quote({ deal_is_active: true, deal_product_id: id, deal_discount_price: 7.99, deal_ends_at: '2000-01-01' }).subtotal, 20.50);
  const promo = { is_active: true, minimum_order: 0, type: 'percentage', value: 15 };
  assert.equal(quote({}, promo, 'SAVE').discount_amount, 3.08);
  assert.equal(quote({}, { ...promo, type: 'fixed_amount', value: 100 }, 'SAVE').total_amount, 2.95);
  for (const invalid of [null, { ...promo, is_active: false }, { ...promo, ends_at: '2000-01-01' }, { ...promo, starts_at: '2099-01-01' }, { ...promo, minimum_order: 50 }]) assert.throws(() => quote({}, invalid, 'SAVE'), /promotion|minimum/);
});

test('unconfigured providers and unverified bank accounts are not offered', () => {
  const keys = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_WEBHOOK_ID'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    keys.forEach((key) => { delete process.env[key]; });
    assert.deepEqual(paymentMethods(settings), { card: false, paypal: false, bank_transfer: false });
    keys.forEach((key) => { process.env[key] = 'test-value'; });
    const bank = { bank_name: 'Test Bank', bank_account_name: 'Test company', bank_sort_code: '12-34-56', bank_account_number: '12345678' };
    assert.equal(paymentMethods(bank).bank_transfer, false);
    assert.deepEqual(paymentMethods({ ...bank, payment_bank_transfer_enabled: true }), { card: true, paypal: true, bank_transfer: true });
    assert.equal(paymentMethods({ ...bank, payment_bank_transfer_enabled: true, bank_account_number: '' }).bank_transfer, false);
    assert.equal(paymentMethods({ payment_card_enabled: false }).card, false);
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal(paymentMethods({}).card, false);
  } finally { keys.forEach((key) => { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }); }
});

test('guest receipt requires its access token; unrelated accounts cannot inspect an order', async () => {
  const token = randomUUID();
  const order = { id, user_id: 'owner', checkout_access_hash: hash(token) };
  assert.ok(validAccess(order, token));
  assert.equal(validAccess(order, randomUUID()), false);
  assert.equal(validAccess(order, 'not-a-token'), false);
  await authorizeOrder({}, { headers: { 'x-order-token': token } }, order);
  await assert.rejects(authorizeOrder({}, { headers: {} }, order), /browser used for checkout/);
  const db = { auth: { getUser: async () => ({ data: { user: { id: 'another-customer' } } }) } };
  await assert.rejects(authorizeOrder(db, { headers: { authorization: 'Bearer test' } }, order), /browser used/);
  order.user_id = 'another-customer';
  await authorizeOrder(db, { headers: { authorization: 'Bearer test' } }, order);
  const safe = publicOrder({ ...order, internal_notes: 'PRIVATE', checkout_request_hash: 'PRIVATE', checkout_url: 'PRIVATE', items: [] });
  assert.equal(JSON.stringify(safe).includes('PRIVATE'), false);
  assert.equal(safe.checkout_access_hash, undefined);
});

test('saved checkout retry does not reserve stock again and checks its fingerprint', async () => {
  const body = { requestId: randomUUID(), accessToken: randomUUID(), customerEmail: 'shopper@example.test', shippingAddress: { full_name: 'Test', address_line_1: '1 Test Road', city: 'London', postcode: 'SW1A 1AA', country: 'United Kingdom' }, items: [{ product_id: id, quantity: 1 }], deliveryTier: 'standard', expectedTotal: 13.2 };
  const normalized = { items: body.items, email: body.customerEmail, address: { ...body.shippingAddress, address_line_2: '', county: '', phone: '' }, deliveryTier: 'standard', promoCode: '', method: 'card', expectedTotal: 13.2, userId: null };
  // Address keys are canonicalized by the server, independently of JSON key order.
  normalized.address = Object.fromEntries(['full_name','address_line_1','city','postcode','country','address_line_2','county','phone'].map((key) => [key, normalized.address[key]]));
  const saved = { id, checkout_access_hash: hash(body.accessToken), checkout_request_hash: hash(JSON.stringify(normalized)), payment_status: 'pending', status: 'pending' };
  let reads = 0;
  const db = { from: () => { reads++; const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: saved }) }; return chain; } };
  assert.equal((await initializeOrder(db, { headers: {}, body }, 'card')).id, id);
  assert.equal(reads, 1);
  await assert.rejects(initializeOrder(db, { headers: {}, body: { ...body, expectedTotal: 1 } }, 'card'), /no longer matches/);
  saved.status = 'cancelled';
  await assert.rejects(initializeOrder(db, { headers: {}, body }, 'card'), /closed/);
});

const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } });
test('checkout endpoints reject unsupported methods and preserve safe error statuses', async () => {
  const handler = endpoint(async () => { throw new CheckoutError('Unavailable', 503); });
  const get = response(); await handler({ method: 'GET' }, get); assert.equal(get.code, 405);
  const post = response(); await handler({ method: 'POST' }, post); assert.equal(post.code, 503); assert.equal(post.headers['Cache-Control'], 'no-store');
});
test('unsigned provider webhooks never acknowledge a payment', async () => {
  for (const handler of [stripeWebhook, paypalWebhook]) {
    const res = response(); await handler({ method: 'POST', headers: {}, body: { event_type: 'PAYMENT.CAPTURE.COMPLETED' } }, res);
    assert.ok([400,503].includes(res.code));
    assert.equal(res.body.received, undefined);
  }
});

test('Stripe rejects a body changed after signing before accessing the database', async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  try {
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit_test';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit_test';
    const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: { payment_status: 'unpaid' } } });
    const signature = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const req = Readable.from([payload.replace('unpaid', 'paid')]);
    req.method = 'POST'; req.headers = { 'stripe-signature': signature };
    const res = response(); await stripeWebhook(req, res);
    assert.equal(res.code, 400); assert.match(res.body.error, /Invalid webhook signature/);
  } finally {
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
  }
});

test('PayPal rejects failed transmission verification before any payment write', async () => {
  const keys = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    keys.forEach((key) => { process.env[key] = 'unit-test'; });
    globalThis.fetch = async (url) => {
      calls.push(url);
      return { ok: true, json: async () => url.endsWith('/token') ? { access_token: 'test' } : { verification_status: 'FAILURE' } };
    };
    const req = { method: 'POST', headers: Object.fromEntries(['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'].map((key) => [key, 'invalid'])), body: { event_type: 'PAYMENT.CAPTURE.COMPLETED' } };
    const res = response(); await paypalWebhook(req, res);
    assert.equal(res.code, 400); assert.match(res.body.error, /Invalid webhook signature/);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key) => { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; });
  }
});
