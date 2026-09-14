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
    return res.status(500).json({ error: 'Stripe secret key is not configured.' });
  }

  const { orderId, sessionId } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing Stripe session ID.' });
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(200).json({
        verified: false,
        payment_status: session.payment_status,
        message: 'Payment is not completed yet.',
      });
    }

    const supabase = getSupabaseServerClient();
    const resolvedOrderId = orderId || session.metadata?.order_id;
    const paidAt = new Date().toISOString();
    const paymentRef = String(session.payment_intent || session.id);

    if (supabase && resolvedOrderId) {
      // Idempotently update order to paid
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
        .eq('id', resolvedOrderId);
    }

    return res.status(200).json({
      verified: true,
      orderId: resolvedOrderId,
      payment_status: 'paid',
      paid_at: paidAt,
      payment_reference: paymentRef,
    });
  } catch (err) {
    console.error('[verify-stripe-payment error]:', err);
    return res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
}
