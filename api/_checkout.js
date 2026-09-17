import { countryCode, normalizeAddress, validateShippingZones, minorAmount } from '../shared/commerce.js';
import { exchangeRate, convertQuote } from './_fx.js';
import { createHash, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import { getSupabasePublicClient, getSupabaseServerClient } from './_supabase.js';
import { checkRateLimit, getClientIp, sanitizeInputObject } from './_rate-limit.js';

export const DEFAULT_SHIPPING_ZONES = [
  {
    id: 'zone-europe',
    name: 'Europe (EU)',
    enabled: true,
    countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'IE', 'BE', 'AT', 'SE', 'DK', 'PL', 'PT', 'CH', 'NO', 'FI'],
    standard: { name: 'Royal Mail International Tracked Europe', eta: '4-7 working days', fee: 6.95 },
    express: { name: 'DHL Express Europe', eta: '2-3 working days', fee: 14.95 },
    free_threshold: 60.0,
  },
  {
    id: 'zone-north-america',
    name: 'USA & North America',
    enabled: true,
    countries: ['US', 'CA'],
    standard: { name: 'Royal Mail International Tracked USA', eta: '5-9 working days', fee: 9.95 },
    express: { name: 'FedEx International Priority', eta: '2-4 working days', fee: 19.95 },
    free_threshold: 75.0,
  },
];

export class CheckoutError extends Error {
  constructor(message, status = 400, code = 'CHECKOUT_ERROR') { super(message); this.status = status; this.code = code; }
}
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const money = (value) => Math.round(Number(value) * 100);
const entityId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function dbClient() {
  const db = getSupabaseServerClient();
  if (!db) throw new CheckoutError('Checkout is temporarily unavailable. Please try again later.', 503, 'CHECKOUT_UNAVAILABLE');
  return db;
}
export function quoteDbClient() {
  const db = getSupabasePublicClient();
  if (!db) throw new CheckoutError('Checkout is temporarily unavailable. Please try again later.', 503, 'CHECKOUT_UNAVAILABLE');
  return db;
}
export function check(result, message = 'The order could not be saved. Please retry.') {
  if (result.error) throw new CheckoutError(message, 503, 'DATABASE_ERROR');
  return result.data;
}
export function endpoint(action, method = 'POST', rateLimitOptions = { max: 60, windowMs: 60000 }) {
  return async (req, res) => {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    if (req.method !== method) {
      if (typeof res.setHeader === 'function') res.setHeader('Allow', method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (rateLimitOptions && rateLimitOptions.max > 0) {
      const headers = req?.headers || {};
      const safeReq = { ...req, headers };
      const ip = getClientIp(safeReq);
      const path = typeof req.url === 'string' ? req.url.split('?')[0] : 'checkout-action';
      const key = `${ip}:${path}`;
      const limit = checkRateLimit(key, rateLimitOptions);

      if (typeof res.setHeader === 'function') {
        res.setHeader('X-RateLimit-Limit', String(limit.limit));
        res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(limit.resetMs / 1000)));
      }

      if (!limit.allowed) {
        if (typeof res.setHeader === 'function') {
          res.setHeader('Retry-After', String(Math.ceil(limit.resetMs / 1000)));
        }
        return res.status(429).json({
          error: 'Too many requests. Please wait a moment before retrying.',
          code: 'RATE_LIMITED',
        });
      }
    }

    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeInputObject(req.body);
    }

    try { return res.status(200).json(await action(req)); }
    catch (error) {
      if (!(error instanceof CheckoutError)) console.error('[checkout]', error.code || error.name, error.message);
      return res.status(error.status || 502).json({ error: error instanceof CheckoutError ? error.message : 'The payment service could not complete this request. Please retry.', code: error.code || 'PAYMENT_SERVICE_ERROR', ...(req.checkoutOrder ? { orderId: req.checkoutOrder.id, orderNumber: req.checkoutOrder.order_number } : {}) });
    }
  };
}
export function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50) throw new CheckoutError('Your basket must contain between 1 and 50 titles.');
  const quantities = new Map();
  for (const item of items) {
    if (!entityId.test(item?.product_id || '') || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new CheckoutError('Check the products and quantities in your basket.');
    const quantity = (quantities.get(item.product_id) || 0) + item.quantity;
    if (quantity > 20) throw new CheckoutError('A maximum of 20 copies per title can be ordered.');
    quantities.set(item.product_id, quantity);
  }
  return [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([product_id, quantity]) => ({ product_id, quantity }));
}
export function paymentMethods(settings) {
  // These endpoints invoke service-role-only database functions. Do not list
  // a payment method when the server cannot complete its order lifecycle.
  const backend = Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return {
    card: backend && settings.payment_card_enabled !== false && Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    paypal: backend && settings.payment_paypal_enabled !== false && Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_WEBHOOK_ID),
    bank_transfer: backend && settings.payment_bank_transfer_enabled === true && Boolean(settings.bank_name?.trim() && settings.bank_account_name?.trim() && /^\d{6}$/.test(String(settings.bank_sort_code || '').replace(/\D/g, '')) && /^\d{8}$/.test(String(settings.bank_account_number || '').trim())),
  };
}
export function calculateQuote(items, products, settings, promo, promoCode, deliveryTier, now = Date.now(), country = 'GB') {
  if (!['standard', 'express'].includes(deliveryTier)) throw new CheckoutError('Choose a delivery method.');
  const lines = normalizeItems(items).map((item) => {
    const product = products.find((row) => row.id === item.product_id);
    if (!product || product.status !== 'active') throw new CheckoutError('A selected title is no longer available. Please update your basket.');
    if (product.stock_quantity < item.quantity) throw new CheckoutError(`Only ${product.stock_quantity} copies of ${product.title} are available.`, 409, 'STOCK_CHANGED');
    const base = money(product.price);
    const deal = settings.deal_is_active && settings.deal_product_id === product.id && Date.parse(settings.deal_ends_at) > now && Number(settings.deal_discount_price) > 0;
    const unit = deal ? Math.min(base, money(settings.deal_discount_price)) : base;
    if (!Number.isSafeInteger(unit) || unit < 0) throw new CheckoutError('A selected title has an invalid price.');
    return { ...item, product_title: product.title, product_sku: product.sku, cover_image_url: product.cover_image_url, unit_price: unit / 100, base_price: base / 100, total_price: unit * item.quantity / 100 };
  });
  const subtotal = lines.reduce((sum, line) => sum + money(line.total_price), 0);
  const code = countryCode(country);
  if (!code) throw new CheckoutError('Choose a valid delivery country.');
  let standard, express, delivery, zoneName = 'United Kingdom';
  if (code === 'GB') {
    standard = Number(settings.free_shipping_threshold) <= 0 || subtotal >= money(settings.free_shipping_threshold) ? 0 : money(settings.standard_shipping_fee);
    express = money(settings.express_shipping_fee);
    delivery = { standard: { name: settings.standard_shipping_name, eta: settings.standard_shipping_eta, amount: standard / 100 }, express: { name: settings.express_shipping_name, eta: settings.express_shipping_eta, amount: express / 100 } };
  } else {
    const rawZones = Array.isArray(settings.shipping_zones) && settings.shipping_zones.length > 0
      ? settings.shipping_zones
      : DEFAULT_SHIPPING_ZONES;
    try { validateShippingZones(rawZones); }
    catch { throw new CheckoutError('International delivery settings are unavailable. Please contact the store.', 503); }
    const zone = rawZones.find((z) => z.enabled && z.countries.includes(code));
    if (!zone) throw new CheckoutError('Delivery to this country is not available yet. Please contact us for a shipping quote.', 400, 'DESTINATION_UNAVAILABLE');
    zoneName = zone.name;
    standard = zone.free_threshold != null && subtotal >= money(zone.free_threshold) ? 0 : money(zone.standard.fee);
    express = zone.express ? money(zone.express.fee) : null;
    delivery = { standard: { name: zone.standard.name, eta: zone.standard.eta, amount: standard / 100 }, express: zone.express ? { name: zone.express.name, eta: zone.express.eta, amount: express / 100 } : null };
  }
  if (![standard, ...(express == null ? [] : [express])].every((fee) => Number.isSafeInteger(fee) && fee >= 0)) throw new CheckoutError('Delivery is temporarily unavailable.', 503);
  if (!delivery[deliveryTier]) throw new CheckoutError('This delivery service is not available for your destination. Choose standard delivery.');
  const shipping = deliveryTier === 'express' ? express : standard;
  let discount = 0;
  if (promoCode) {
    if (!promo || !promo.is_active || (promo.starts_at && Date.parse(promo.starts_at) > now) || (promo.ends_at && Date.parse(promo.ends_at) <= now)) throw new CheckoutError('The promotion code is invalid or has expired.', 400, 'PROMO_INVALID');
    if (subtotal < money(promo.minimum_order)) throw new CheckoutError(`This code requires a minimum spend of £${Number(promo.minimum_order).toFixed(2)}.`, 400, 'PROMO_INVALID');
    discount = promo.type === 'percentage' ? Math.round(subtotal * Number(promo.value) / 100) : money(promo.value);
    if (!Number.isSafeInteger(discount) || discount < 0) throw new CheckoutError('This promotion cannot be applied.');
    discount = Math.min(subtotal, discount);
  }
  return { items: lines, subtotal: subtotal / 100, discount_amount: discount / 100, shipping_amount: shipping / 100,
    total_amount: (subtotal - discount + shipping) / 100, currency: 'GBP', delivery_tier: deliveryTier,
    delivery, country: code, shipping_zone_name: zoneName,
    duties_notice: code === 'GB' ? '' : (settings.international_duties_notice || 'Import duties, taxes and carrier clearance fees may be collected by your destination country. These are not included in this total.'),
    methods: paymentMethods(settings), bank_name: settings.bank_name,
  };
}
export async function quoteCheckout(db, input) {
  const items = normalizeItems(input.items);
  const products = check(await db.from('products').select('id,sku,title,price,status,stock_quantity,cover_image_url').in('id', items.map((item) => item.product_id)));
  const settings = check(await db.from('store_settings').select('*').eq('singleton', true).maybeSingle());
  if (!settings || typeof settings.payment_card_enabled !== 'boolean') throw new CheckoutError('Checkout is temporarily unavailable while store settings are being updated.', 503);
  const code = String(input.promoCode || '').trim().toUpperCase();
  const promo = code ? check(await db.from('promotions').select('*').eq('code', code).maybeSingle()) : null;
  const currency = String(input.currency || 'GBP').toUpperCase();
  const allowedCurrencies = Array.isArray(settings.checkout_currencies) && settings.checkout_currencies.length > 0
    ? Array.from(new Set(['GBP', 'EUR', 'USD', ...settings.checkout_currencies]))
    : ['GBP', 'EUR', 'USD'];
  if (!allowedCurrencies.includes(currency)) throw new CheckoutError('This currency is not enabled by the store.');
  const baseQuote = calculateQuote(items, products || [], settings, promo, code, input.deliveryTier, Date.now(), input.shippingAddress?.country || input.country || 'GB');
  const fx = await exchangeRate(currency);
  return { quote: convertQuote(baseQuote, currency, fx), settings };
}
export async function requestUser(db, req) {
  const authorization = req.headers.authorization;
  if (!authorization) return null;
  if (!authorization.startsWith('Bearer ')) throw new CheckoutError('Please sign in again.', 401);
  const { data, error } = await db.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new CheckoutError('Your session expired. Please sign in again.', 401);
  return data.user;
}
export function siteOrigin(req) {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL).origin;
  if (req?.headers?.host) return `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
  return 'http://localhost:3000';
}
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new CheckoutError('Card payments are temporarily unavailable.', 503);
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
export function validAccess(order, token) {
  if (!uuid.test(token || '') || !order.checkout_access_hash) return false;
  const actual = Buffer.from(hash(token)); const expected = Buffer.from(order.checkout_access_hash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function loadOrder(db, id) {
  if (!entityId.test(id || '')) throw new CheckoutError('Invalid order reference.', 400);
  const order = check(await db.from('orders').select('*, items:order_items(*)').eq('id', id).maybeSingle());
  if (!order) throw new CheckoutError('Order not found.', 404);
  return order;
}
export async function authorizeOrder(db, req, order) {
  if (validAccess(order, req.headers['x-order-token'])) return;
  const user = await requestUser(db, req);
  if (user && order.user_id === user.id) return;
  throw new CheckoutError('Open this order in the browser used for checkout, or sign in to the account that placed it.', 403);
}
export function publicOrder(order) {
  // Internal notes, access hashes and request fingerprints never leave the server.
  const keys = ['id','order_number','email','status','payment_status','payment_method','payment_provider','fulfilment_status','subtotal','shipping_amount','discount_amount','total_amount','currency','shipping_address','shipping_carrier','tracking_number','dispatched_at','delivered_at','paid_at','payment_reference','bank_transfer_reference','bank_details','delivery_tier','delivery_name','created_at','updated_at','payment_review_required','refunded_amount','exchange_rate','exchange_rate_date','base_total_amount','shipping_zone_name','duties_notice'];
  return Object.fromEntries([...keys.map((key) => [key, order[key]]), ['items', (order.items || []).map((item) => ({ id: item.id, product_id: item.product_id, product_title: item.product_title, product_sku: item.product_sku, quantity: item.quantity, unit_price: Number(item.unit_price), total_price: Number(item.total_price), cover_image_url: item.product_snapshot?.cover_image_url }))]]);
}
export async function initializeOrder(db, req, method) {
  const input = req.body || {};
  if (!uuid.test(input.requestId || '') || !uuid.test(input.accessToken || '')) throw new CheckoutError('Please refresh checkout and try again.');
  const email = String(input.customerEmail || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CheckoutError('Enter a valid email address.');
  let address;
  try { address = normalizeAddress(input.shippingAddress); }
  catch (error) { throw new CheckoutError(error.message); }
  const user = await requestUser(db, req);
  const normalized = { items: normalizeItems(input.items), email, address, deliveryTier: input.deliveryTier, promoCode: String(input.promoCode || '').trim().toUpperCase(), method, expectedTotal: input.expectedTotal, userId: user?.id || null };
  if (input.currency && input.currency !== 'GBP') normalized.currency = input.currency;
  const requestHash = hash(JSON.stringify(normalized));
  const existing = check(await db.from('orders').select('*, items:order_items(*)').eq('checkout_request_id', input.requestId).maybeSingle());
  if (existing) {
    if (!validAccess(existing, input.accessToken) || existing.checkout_request_hash !== requestHash) throw new CheckoutError('This checkout attempt no longer matches your basket. Start a new checkout.', 409, 'ATTEMPT_MISMATCH');
    if (['cancelled', 'refunded'].includes(existing.status) || existing.payment_status === 'failed') throw new CheckoutError('This checkout has closed. Please try again to start a new payment.', 409, 'ATTEMPT_CLOSED');
    req.checkoutOrder = existing;
    return existing;
  }
  const { quote, settings } = await quoteCheckout(db, input);
  if (quote.country !== 'GB' && input.internationalAcknowledged !== true) throw new CheckoutError('Please acknowledge the international delivery and import charges notice.');
  if (!quote.methods[method]) throw new CheckoutError('This payment method is currently unavailable. Please choose another method.', 503, 'METHOD_UNAVAILABLE');
  if (!Number.isFinite(input.expectedTotal) || minorAmount(input.expectedTotal, quote.currency) !== minorAmount(quote.total_amount, quote.currency)) throw new CheckoutError('Your basket total has changed. Review the updated total and try again.', 409, 'TOTAL_CHANGED');
  if (quote.base_total_amount < 0.5) throw new CheckoutError('The checkout total must be at least £0.50.');
  const bank = method === 'bank_transfer' ? Object.fromEntries(['bank_name','bank_account_name','bank_sort_code','bank_account_number','bank_iban','bank_payment_instructions'].map((key) => [key, settings[key]])) : null;
  let data = await db.rpc('create_global_checkout_order', { p_request_id: input.requestId, p_request_hash: requestHash, p_access_hash: hash(input.accessToken),
    p_order: { email, user_id: user?.id || null, shipping_address: address, payment_method: method, payment_provider: { card: 'stripe', paypal: 'paypal', bank_transfer: 'manual_bank' }[method],
      currency: quote.currency, exchange_rate: quote.exchange_rate, exchange_rate_date: quote.exchange_rate_date, base_total_amount: quote.base_total_amount, shipping_zone_name: quote.shipping_zone_name, duties_notice: quote.duties_notice,
      subtotal: quote.subtotal, shipping_amount: quote.shipping_amount, discount_amount: quote.discount_amount, total_amount: quote.total_amount, delivery_tier: input.deliveryTier, delivery_name: quote.delivery[input.deliveryTier].name, bank_details: bank }, p_items: quote.items });
  if (data?.error && (data.error.code === 'PGRST202' || data.error.message?.includes('create_global_checkout_order'))) {
    data = await db.rpc('create_checkout_order', { p_request_id: input.requestId, p_request_hash: requestHash, p_access_hash: hash(input.accessToken),
      p_order: { email, user_id: user?.id || null, shipping_address: address, payment_method: method, payment_provider: { card: 'stripe', paypal: 'paypal', bank_transfer: 'manual_bank' }[method],
        currency: quote.currency, subtotal: quote.subtotal, shipping_amount: quote.shipping_amount, discount_amount: quote.discount_amount, total_amount: quote.total_amount, delivery_tier: input.deliveryTier, delivery_name: quote.delivery[input.deliveryTier].name, bank_details: bank }, p_items: quote.items });
  }
  if (data?.error) throw new CheckoutError(data.error.code === 'P0001' ? data.error.message : 'Your order could not be created. Please try again.', data.error.code === 'P0001' ? 409 : 503, data.error.code === 'P0001' ? 'STOCK_CHANGED' : 'DATABASE_ERROR');
  const order = await loadOrder(db, data.data.id);
  req.checkoutOrder = order;
  return order;
}
export async function recordPayment(db, order, providerOrderId, reference, amount, currency) {
  if (minorAmount(amount, order.currency || 'GBP') !== minorAmount(order.total_amount, order.currency || 'GBP') || String(currency).toUpperCase() !== (order.currency || 'GBP')) throw new CheckoutError('Payment amount or currency did not match this order.', 409, 'PAYMENT_MISMATCH');
  check(await db.rpc('record_checkout_payment', { p_order_id: order.id, p_provider: order.payment_provider, p_provider_order_id: providerOrderId, p_reference: reference, p_amount: amount, p_currency: String(currency).toUpperCase() }));
}
export async function verifyStripe(db, order, sessionId) {
  const session = await stripeClient().checkout.sessions.retrieve(sessionId);
  if (order.payment_provider !== 'stripe' || session.metadata?.order_id !== order.id || (order.checkout_session_id && order.checkout_session_id !== session.id)) throw new CheckoutError('Payment does not belong to this order.', 403, 'PAYMENT_MISMATCH');
  if (session.payment_status === 'paid') await recordPayment(db, order, session.id, typeof session.payment_intent === 'string' ? session.payment_intent : session.id, session.amount_total / (order.currency === 'JPY' ? 1 : 100), session.currency);
  if (session.status === 'expired' && order.payment_status !== 'paid') check(await db.rpc('expire_checkout_order', { p_order_id: order.id, p_provider_order_id: session.id }));
  return session;
}
