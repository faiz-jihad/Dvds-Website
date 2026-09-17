import { check, dbClient, endpoint, initializeOrder, siteOrigin, stripeClient } from './_checkout.js';
import { minorAmount } from '../shared/commerce.js';
import { stripeShipping } from './_provider-shipping.js';
export default endpoint(async (req) => {
  const db = dbClient();
  const origin = siteOrigin(req);
  const order = await initializeOrder(db, req, 'card');
  if (order.payment_status === 'paid') return { orderId: order.id, orderNumber: order.order_number, completed: true };
  if (order.checkout_url) return { url: order.checkout_url, orderId: order.id, orderNumber: order.order_number };
  const session = await stripeClient().checkout.sessions.create({
    // Omitting payment_method_types lets Stripe Hosted Checkout automatically
    // surface Apple Pay, Google Pay, and Link on supported devices alongside
    // standard Visa/Mastercard debit and credit card entry.
    // Apple Pay requires the domain to be registered in the Stripe Dashboard:
    // Settings > Payment methods > Apple Pay > Register domain.
    mode: 'payment', customer_email: order.email,
    line_items: [{ price_data: { currency: order.currency.toLowerCase(), unit_amount: minorAmount(order.total_amount, order.currency),
      product_data: { name: `DVDs Zone - ${order.order_number}`, description: `${order.delivery_name} - ${order.items.length} titles` } }, quantity: 1 }],
    metadata: { order_id: order.id }, payment_intent_data: { metadata: { order_id: order.id }, shipping: stripeShipping(order) },
    success_url: `${origin}/order-success/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
  }, { idempotencyKey: `checkout-${order.id}` });
  check(await db.from('orders').update({ checkout_session_id: session.id, checkout_url: session.url }).eq('id', order.id).select('id').single());
  return { url: session.url, orderId: order.id, orderNumber: order.order_number };
}, 'POST', { max: 15, windowMs: 60000 });
