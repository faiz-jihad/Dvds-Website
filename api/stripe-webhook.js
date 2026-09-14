import Stripe from 'stripe';
import { getSupabaseServerClient } from './_supabase.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    return res.status(500).json({ error: 'Stripe is not configured.' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = JSON.parse(rawBody.toString('utf8'));
    }
  } catch (err) {
    console.error('[Stripe Webhook Signature Error]:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const supabase = getSupabaseServerClient();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;
      const paymentRef = session.payment_intent || session.id;
      const paidAt = new Date().toISOString();

      if (supabase && orderId) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
            paid_at: paidAt,
            payment_reference: paymentRef,
            payment_provider: 'stripe',
            payment_method: 'card',
            updated_at: paidAt,
          })
          .eq('id', orderId);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook Processing Error]:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
