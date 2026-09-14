import Stripe from 'stripe';

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
    const { items, customerEmail, shippingAddress, deliveryTier, promoCode, totalAmount } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No checkout items provided.' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Determine host origin for redirect urls
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'dvds-website.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;

    const orderId = req.body?.orderId || 'ord_' + Math.random().toString(36).substring(2, 10);
    const orderNumber =
      req.body?.orderNumber ||
      `AZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

    const amountInPence = Math.round(Number(totalAmount || 15) * 100);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `AZ Rayan DVDs Order: ${orderNumber}`,
              description: `${items.length} titles — Dispatched via Royal Mail Tracked`,
            },
            unit_amount: amountInPence,
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        delivery_tier: deliveryTier || 'standard',
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
