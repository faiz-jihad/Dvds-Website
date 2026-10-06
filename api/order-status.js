import { authorizeOrder, check, CheckoutError, dbClient, endpoint, loadOrder, publicOrder } from './_checkout.js';
import { capturePayPal } from './_paypal.js';

export default endpoint(async (req) => {
  const db = dbClient();
  let order = null;

  if (req.body?.orderId) {
    order = await loadOrder(db, req.body.orderId);
  } else if (req.body?.sessionId || req.body?.paymentIntentId) {
    const queryId = req.body?.sessionId || req.body?.paymentIntentId;
    const matched = check(
      await db
        .from('orders')
        .select('*, items:order_items(*)')
        .or(`checkout_session_id.eq.${queryId},payment_reference.eq.${queryId}`)
        .maybeSingle()
    );
    if (matched) order = await loadOrder(db, matched.id);
  } else if (req.body?.requestId) {
    const matched = check(
      await db
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('checkout_request_id', req.body.requestId)
        .maybeSingle()
    );
    if (matched) order = await loadOrder(db, matched.id);
  }

  if (!order) throw new CheckoutError('Order not found.', 404);

  await authorizeOrder(db, req, order);

  // PayPal capture when returning from PayPal redirect
  if (order.payment_provider === 'paypal' && req.body?.paypalOrderId && order.status !== 'cancelled') {
    await capturePayPal(db, order, req.body.paypalOrderId);
    order = await loadOrder(db, order.id);
  }

  // The order status reflects verified backend / webhook data.
  return { order: publicOrder(order) };
}, 'POST', { max: 120, windowMs: 60000 });
