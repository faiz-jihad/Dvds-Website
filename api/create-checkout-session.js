import { check, CheckoutError, dbClient, endpoint, initializeOrder, siteOrigin, stripeClient } from './_checkout.js';
import { minorAmount } from '../shared/commerce.js';
import { stripeShipping } from './_provider-shipping.js';

export default endpoint(async (req) => {
  const db = dbClient();
  const origin = siteOrigin(req);
  const order = await initializeOrder(db, req, 'card');

  if (order.payment_status === 'paid') {
    return { orderId: order.id, orderNumber: order.order_number, completed: true };
  }

  const stripe = stripeClient();

  // If a session was already created, verify whether it is still valid and open
  if (order.checkout_url && order.checkout_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.checkout_session_id);
      if (existing && existing.status === 'open') {
        return {
          url: existing.url || order.checkout_url,
          orderId: order.id,
          orderNumber: order.order_number,
        };
      }
    } catch {
      // Session has expired or is invalid; proceed to create a new session
    }
  }

  const currency = String(order.currency || 'GBP').toLowerCase();
  const unitAmount = minorAmount(order.total_amount, order.currency || 'GBP');

  if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
    throw new CheckoutError('Invalid order total for payment.', 400);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'en',
    customer_email: order.email,
    client_reference_id: order.id,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: `DVD ZONE - Order ${order.order_number}`,
            description: `${order.delivery_name || 'Standard UK Delivery'} • ${order.items?.length || 1} item(s)`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      order_id: order.id,
      order_number: order.order_number,
      customer_email: order.email,
    },
    payment_intent_data: {
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        customer_email: order.email,
      },
      shipping: stripeShipping(order),
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
    cancel_url: `${origin}/checkout/cancel?order_id=${order.id}`,
  }, { idempotencyKey: `checkout-session-${order.id}` });

  check(
    await db
      .from('orders')
      .update({
        checkout_session_id: session.id,
        checkout_url: session.url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('id')
      .single()
  );

  return { url: session.url, orderId: order.id, orderNumber: order.order_number };
}, 'POST', { max: 15, windowMs: 60000 });
