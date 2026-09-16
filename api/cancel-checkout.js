import { authorizeOrder, check, CheckoutError, dbClient, endpoint, loadOrder, stripeClient, verifyStripe } from './_checkout.js';
import { paypalRequest } from './_paypal.js';
export default endpoint(async (req) => {
  const db = dbClient();
  let order = await loadOrder(db, req.body?.orderId);
  await authorizeOrder(db, req, order);
  if (['paid', 'refunded', 'partially_refunded'].includes(order.payment_status)) throw new CheckoutError('This order has already been paid. Contact support for a refund.', 409);
  if (order.status === 'cancelled') return { cancelled: true };
  if (order.checkout_session_id) {
    const session = await verifyStripe(db, order, order.checkout_session_id);
    if (session.status === 'complete') throw new CheckoutError('Payment is being processed. Please check your order status.', 409);
    if (session.status === 'open') await stripeClient().checkout.sessions.expire(session.id);
  }
  if (order.paypal_order_id) {
    const providerOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}`);
    if (providerOrder.status === 'COMPLETED') throw new CheckoutError('Payment is being processed. Please check your order status.', 409);
  }
  check(await db.rpc('expire_checkout_order', { p_order_id: order.id, p_provider_order_id: order.checkout_session_id || null }));
  order = await loadOrder(db, order.id);
  if (order.status !== 'cancelled') throw new CheckoutError('Payment has already been received. Refresh the order before continuing.', 409);
  return { cancelled: true };
});
