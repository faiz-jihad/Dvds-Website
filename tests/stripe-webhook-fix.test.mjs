import test from 'node:test';
import assert from 'node:assert/strict';
import stripeWebhook from '../api/stripe-webhook.js';
import Stripe from 'stripe';

function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, val) {
      this.headers[key] = val;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test('Stripe Webhook: reject missing signature with 400', async () => {
  const req = {
    method: 'POST',
    headers: {},
    body: Buffer.from(JSON.stringify({ id: 'evt_123' })),
  };
  const res = createMockResponse();
  await stripeWebhook(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /Missing Stripe-Signature/i);
});

test('Stripe Webhook: reject invalid method with 405', async () => {
  const req = {
    method: 'GET',
    headers: {},
  };
  const res = createMockResponse();
  await stripeWebhook(req, res);
  assert.equal(res.statusCode, 405);
});

test('Stripe Webhook: duplicate event returns idempotent_duplicate and skips processing', async () => {
  const secretKey = 'sk_test_mock_stripe_key';
  const webhookSecret = 'whsec_mock_webhook_secret';
  const prevKey = process.env.STRIPE_SECRET_KEY;
  const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevSbUrl = process.env.SUPABASE_URL;
  const prevSbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = globalThis.fetch;

  try {
    process.env.STRIPE_SECRET_KEY = secretKey;
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';

    const eventPayload = {
      id: 'evt_test_duplicate_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_duplicate',
          payment_status: 'paid',
          amount_total: 2000,
          currency: 'gbp',
        },
      },
    };

    const payloadString = JSON.stringify(eventPayload);
    const stripe = new Stripe(secretKey);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: webhookSecret,
    });

    // Mock fetch for Supabase calls
    // When querying payment_events for existing event, return that it exists!
    globalThis.fetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/rest/v1/payment_events')) {
        return new Response(JSON.stringify({ id: 'stripe:event:evt_test_duplicate_123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const req = {
      method: 'POST',
      headers: {
        'stripe-signature': signature,
      },
      rawBody: Buffer.from(payloadString, 'utf8'),
    };

    const res = createMockResponse();
    await stripeWebhook(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true, idempotent_duplicate: true });
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevKey;
    if (prevSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
    if (prevSbUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = prevSbUrl;
    if (prevSbKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevSbKey;
  }
});

test('Stripe Webhook: ancillary payment_events failure does not crash or throw .catch is not a function', async () => {
  const secretKey = 'sk_test_mock_stripe_key';
  const webhookSecret = 'whsec_mock_webhook_secret';
  const prevKey = process.env.STRIPE_SECRET_KEY;
  const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevSbUrl = process.env.SUPABASE_URL;
  const prevSbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = globalThis.fetch;

  try {
    process.env.STRIPE_SECRET_KEY = secretKey;
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';

    const orderId = '11111111-1111-4111-8111-111111111111';
    const eventPayload = {
      id: 'evt_test_safe_insert_456',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_safe',
          payment_intent: 'pi_test_safe',
          payment_status: 'paid',
          amount_total: 2000,
          currency: 'gbp',
          metadata: { order_id: orderId },
        },
      },
    };

    const payloadString = JSON.stringify(eventPayload);
    const stripe = new Stripe(secretKey);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: webhookSecret,
    });

    let paymentRecorded = false;
    let paymentEventsAttempted = false;

    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);

      // Idempotency check: not found yet
      if (urlStr.includes('/rest/v1/payment_events') && (!options?.method || options.method === 'GET')) {
        return new Response('null', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Load order query
      if (urlStr.includes('/rest/v1/orders')) {
        return new Response(JSON.stringify({
          id: orderId,
          order_number: 'DVD-1001',
          payment_provider: 'stripe',
          currency: 'GBP',
          total_amount: 20.00,
          payment_status: 'pending',
          items: [],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // record_checkout_payment RPC
      if (urlStr.includes('/rpc/record_checkout_payment')) {
        paymentRecorded = true;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // payment_events insert: simulate database error / constraint error
      if (urlStr.includes('/rest/v1/payment_events') && options?.method === 'POST') {
        paymentEventsAttempted = true;
        return new Response(JSON.stringify({
          message: 'duplicate key value violates unique constraint',
          code: '23505',
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Email notifications or store settings queries
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const req = {
      method: 'POST',
      headers: {
        'stripe-signature': signature,
      },
      rawBody: Buffer.from(payloadString, 'utf8'),
    };

    const res = createMockResponse();
    await stripeWebhook(req, res);

    assert.equal(paymentRecorded, true, 'Primary payment recording must succeed');
    assert.equal(paymentEventsAttempted, true, 'payment_events insert must be attempted');
    assert.equal(res.statusCode, 200, 'Webhook response must be 200 OK');
    assert.deepEqual(res.body, { received: true });
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevKey;
    if (prevSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
    if (prevSbUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = prevSbUrl;
    if (prevSbKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevSbKey;
  }
});
