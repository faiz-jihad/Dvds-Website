import Stripe from 'stripe';
import { getSupabaseServerClient } from './_supabase.js';

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

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: 'Stripe secret key is not configured in environment variables.' });
  }

  try {
    const { items, customerEmail, shippingAddress, promoCode } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No checkout items provided.' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const supabase = getSupabaseServerClient();

    // 1. Fetch trusted product prices from Supabase if available
    let trustedSubtotal = 0;
    const validatedItems = [];

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
      const title = dbProd ? dbProd.title : (item.product_title || item.title || 'Collector Edition DVD');
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const lineTotal = unitPrice * qty;
      trustedSubtotal += lineTotal;
      validatedItems.push({
        product_id: pId,
        title,
        quantity: qty,
        unit_price: unitPrice,
        line_total: lineTotal,
      });
    }

    // Free delivery across the UK
    const shippingFee = 0.0;
    let discountAmount = 0.0;

    // Check promotion if provided
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

    const trustedTotal = Math.max(0, trustedSubtotal - discountAmount + shippingFee);
    const amountInPence = Math.round(trustedTotal * 100);

    // Determine host origin for redirect urls
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    const orderId = req.body?.orderId || crypto.randomUUID();
    const orderNumber =
      req.body?.orderNumber ||
      `AZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

    // 2. Pre-create or record order in Supabase with pending status
    if (supabase) {
      try {
        await supabase.from('orders').upsert({
          id: orderId,
          order_number: orderNumber,
          email: customerEmail || 'customer@example.com',
          status: 'pending',
          payment_status: 'pending',
          payment_method: 'card',
          payment_provider: 'stripe',
          fulfilment_status: 'unfulfilled',
          subtotal: trustedSubtotal,
          shipping_amount: 0,
          discount_amount: discountAmount,
          total_amount: trustedTotal,
          currency: 'GBP',
          shipping_address: shippingAddress || {},
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[create-checkout-session] Order pre-insert note:', err);
      }
    }

    // 3. Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `AZ Rayan DVDs: ${orderNumber}`,
              description: `${validatedItems.length} items • Free UK Tracked Delivery`,
            },
            unit_amount: amountInPence,
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        delivery_tier: 'standard',
        free_shipping: 'true',
      },
      success_url: `${origin}/order-success/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?cancelled=1`,
    });

    return res.status(200).json({ url: session.url, orderId, orderNumber });
  } catch (error) {
    console.error('[Stripe Session Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to create Stripe session' });
  }
}
