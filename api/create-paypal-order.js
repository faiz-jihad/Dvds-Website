import { getSupabaseServerClient } from './_supabase.js';

async function getPayPalAccessToken(baseUrl, clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to obtain PayPal token: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const env = (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase();
  const baseUrl = env === 'live' || env === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  try {
    const { items, customerEmail, shippingAddress, promoCode } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items in basket' });
    }

    const supabase = getSupabaseServerClient();

    // 1. Calculate trusted server totals
    let trustedSubtotal = 0;
    const productIds = items.map((i) => i.product_id || i.id).filter(Boolean);
    let dbProducts = [];
    if (supabase && productIds.length > 0) {
      const { data } = await supabase.from('products').select('*').in('id', productIds);
      if (data) dbProducts = data;
    }

    for (const item of items) {
      const pId = item.product_id || item.id;
      const dbProd = dbProducts.find((p) => p.id === pId);
      const unitPrice = dbProd ? Number(dbProd.price) : Number(item.unit_price || item.price || 9.99);
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      trustedSubtotal += unitPrice * qty;
    }

    let discountAmount = 0.0;
    if (promoCode && supabase) {
      const cleanCode = String(promoCode).trim().toUpperCase();
      const { data: promo } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (promo && trustedSubtotal >= Number(promo.minimum_order)) {
        if (promo.type === 'percentage') {
          discountAmount = (trustedSubtotal * Number(promo.value)) / 100;
        } else {
          discountAmount = Number(promo.value);
        }
        discountAmount = Math.min(discountAmount, trustedSubtotal);
      }
    }

    // UK Delivery is 100% Free
    const trustedTotal = Math.max(0, trustedSubtotal - discountAmount);

    const orderId = req.body?.orderId || crypto.randomUUID();
    const orderNumber =
      req.body?.orderNumber ||
      `AZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

    // Determine host origin
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    // Pre-insert order in Supabase
    if (supabase) {
      try {
        await supabase.from('orders').upsert({
          id: orderId,
          order_number: orderNumber,
          email: customerEmail || 'customer@example.com',
          status: 'pending',
          payment_status: 'pending',
          payment_method: 'paypal',
          payment_provider: 'paypal',
          fulfilment_status: 'unfulfilled',
          subtotal: trustedSubtotal,
          shipping_amount: 0,
          discount_amount: discountAmount,
          total_amount: trustedTotal,
          currency: 'GBP',
          shipping_address: shippingAddress || {},
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[create-paypal-order] order pre-insert notice:', e);
      }
    }

    if (!clientId || !clientSecret) {
      // If PayPal credentials are not configured yet, provide clear instruction
      return res.status(503).json({
        error: 'PayPal integration requires PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server environment variables.',
      });
    }

    const accessToken = await getPayPalAccessToken(baseUrl, clientId, clientSecret);

    const ppRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': orderId,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderNumber,
            description: `AZ Rayan DVDs Order: ${orderNumber}`,
            amount: {
              currency_code: 'GBP',
              value: trustedTotal.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: 'AZ Rayan DVDs',
          locale: 'en-GB',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: `${origin}/order-success/${orderId}?paypal=1&orderId=${orderId}`,
          cancel_url: `${origin}/checkout?cancelled=1`,
        },
      }),
    });

    if (!ppRes.ok) {
      const errText = await ppRes.text();
      console.error('[PayPal Create Order Error]:', errText);
      return res.status(500).json({ error: 'PayPal failed to create checkout session' });
    }

    const ppOrder = await ppRes.json();
    const approveLink = (ppOrder.links || []).find((l) => l.rel === 'approve');

    if (supabase) {
      await supabase
        .from('orders')
        .update({ paypal_order_id: ppOrder.id })
        .eq('id', orderId);
    }

    return res.status(200).json({
      url: approveLink?.href,
      orderId,
      orderNumber,
      paypalOrderId: ppOrder.id,
    });
  } catch (err) {
    console.error('[create-paypal-order error]:', err);
    return res.status(500).json({ error: err.message || 'PayPal order creation failed' });
  }
}
