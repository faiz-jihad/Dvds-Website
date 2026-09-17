import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const require = createRequire(import.meta.url);
const input = { items: [{ product_id: '11111111-1111-4111-8111-111111111111', quantity: 2 }], customerEmail: 'buyer@example.test', shippingAddress: { full_name: 'Buyer', address_line_1: '1 Road', city: 'London', postcode: 'SW1A 1AA', country: 'United Kingdom' }, deliveryTier: 'express', expectedTotal: 25.99 };
const cache = new Map();
async function load(entry, extra = {}) {
  if (!cache.has(entry)) {
    const output = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
      plugins: [{ name: 'checkout-test', setup(b) {
        b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: path.resolve('node_modules/lucide-react/dist/esm/lucide-react.js') }));
        b.onResolve({ filter: /\/supabase$/ }, () => ({ path: 'supabase', namespace: 'mock' }));
        b.onResolve({ filter: /\/CustomerAuth$/ }, () => ({ path: 'auth', namespace: 'mock' }));
        b.onResolve({ filter: /\/useCartStore$/ }, () => ({ path: 'cart', namespace: 'mock' }));
        b.onResolve({ filter: /^@tanstack\/react-query$/ }, () => ({ path: 'query', namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: {
          supabase: 'export const supabase = null; export const isSupabaseConfigured = false;',
          auth: 'export const useCustomerAuth = () => ({ customer: null });',
          cart: 'export const useCartStore = (selector) => selector(globalThis.cart);',
          query: 'export const useQuery = () => globalThis.query;',
        }[path] }));
      } }],
    }); cache.set(entry, output.outputFiles[0].text);
  }
  const storage = new Map();
  const context = { module: { exports: {} }, require, console, crypto: webcrypto, URL,
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }, ...extra };
  vm.runInNewContext(cache.get(entry), context);
  return context.module.exports;
}
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const fail = (code, status = 503, orderId) => ({ ok: false, status, json: async () => ({ error: 'Try again', code, orderId }) });

test('network retry keeps the original request and guest access token', async () => {
  const requests = [];
  const api = await load('src/lib/checkoutApi.ts', { fetch: async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body), headers: options.headers });
    if (requests.length === 1) throw new Error('Network lost');
    if (url.endsWith('order-status')) return fail('NOT_FOUND', 404);
    return ok({ orderId: 'order-1', orderNumber: 'ORDER-1', url: 'https://checkout.stripe.com/test' });
  } });
  await assert.rejects(api.checkoutApi.create('card', input), /Network lost/);
  await api.checkoutApi.create('card', input);
  assert.equal(requests[0].body.requestId, requests[2].body.requestId);
  assert.equal(requests[0].body.accessToken, requests[2].body.accessToken);
  assert.equal(api.currentCheckoutAttempt().orderId, 'order-1');
});

test('provider failure retains a saved order for cancellation and prevents duplicate replacement', async () => {
  const requests = [];
  const api = await load('src/lib/checkoutApi.ts', { fetch: async (url, options) => {
    requests.push({ url, headers: options.headers });
    return url.endsWith('cancel-checkout') ? ok({ cancelled: true }) : fail('PAYPAL_ERROR', 502, 'saved-order');
  } });
  await assert.rejects(api.checkoutApi.create('paypal', input));
  assert.equal(api.currentCheckoutAttempt().orderId, 'saved-order');
  await assert.rejects(api.checkoutApi.create('card', input), /previous checkout/);
  assert.equal(requests.length, 1);
  await api.checkoutApi.cancel('saved-order');
  assert.ok(requests[1].headers['X-Order-Token']);
  assert.equal(api.currentCheckoutAttempt(), null);
});

test('receipts consume only their purchased quantities once and never manufacture payment success', async () => {
  const api = await load('src/lib/checkoutApi.ts', { fetch: async (url) => url.endsWith('order-status') ? fail('CHECKOUT_UNAVAILABLE') : ok({ orderId: 'bank-order', orderNumber: 'BANK-1' }) });
  const result = await api.checkoutApi.create('bank_transfer', input);
  assert.equal(result.payment_status, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(api.consumeCheckoutReceipt('bank-order'))), input.items);
  assert.equal(api.consumeCheckoutReceipt('bank-order'), null);
  await assert.rejects(api.checkoutApi.orderStatus('bank-order'), /Try again/);
});

const render = (Page, path = '/order-success/order-1') => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(Routes, null, React.createElement(Route, { path: '/order-success/:orderId', element: React.createElement(Page) }), React.createElement(Route, { path: '/checkout', element: React.createElement(Page) }))));
test('order page distinguishes pending, bank transfer, failed, paid, and refunded states', async () => {
  const base = { id: 'order-1', order_number: 'TEST-1', status: 'pending', payment_status: 'pending', payment_method: 'card', shipping_address: input.shippingAddress, items: [], subtotal: 20, shipping_amount: 5.99, discount_amount: 0, total_amount: 25.99, created_at: '2026-09-15T10:00:00Z' };
  for (const [change, title] of [
    [{}, 'Awaiting payment confirmation'],
    [{ payment_method: 'bank_transfer', payment_status: 'awaiting_payment' }, 'Order placed - awaiting transfer'],
    [{ payment_status: 'failed', status: 'cancelled' }, 'Payment not completed'],
    [{ payment_status: 'paid', status: 'processing' }, 'Payment confirmed'],
    [{ payment_status: 'refunded', status: 'refunded', refunded_amount: 25.99 }, 'Payment refunded'],
  ]) {
    const { OrderSuccessPage } = await load('src/pages/OrderSuccessPage.tsx', { query: { data: { ...base, ...change } } });
    const html = render(OrderSuccessPage);
    assert.ok(html.includes(title), title);
    if (change.payment_status !== 'paid') assert.ok(!html.includes('Payment confirmed'));
    assert.ok(!html.includes('13894195'), 'No sample receiving account');
  }
});

test('checkout renders accessible payment radios, configured delivery, and unavailable provider states', async () => {
  const { CheckoutPage } = await load('src/pages/CheckoutPage.tsx', {
    cart: { items: [{ product_id: input.items[0].product_id, quantity: 2, product: { title: 'Film', cover_image_url: '/film.jpg' } }], appliedPromoCode: null },
    query: { data: { items: [{ ...input.items[0], total_price: 20 }], subtotal: 20, total_amount: 25.99, shipping_amount: 5.99, discount_amount: 0, methods: { card: true, paypal: false, bank_transfer: false }, delivery: { standard: { name: 'Admin standard', eta: '3 days', amount: 2.95 }, express: { name: 'Admin express', eta: '1 day', amount: 5.99 } } } },
  });
  const html = render(CheckoutPage, '/checkout');
  assert.ok(html.includes('Admin express'));
  assert.equal((html.match(/name="payment"/g) || []).length, 3);
  assert.equal((html.match(/Temporarily unavailable/g) || []).length, 2);
  assert.ok(html.includes('Continue to secure payment'));
  assert.ok(!html.includes('Pay in 3'));
  assert.ok(!html.includes('13894195'));
});
