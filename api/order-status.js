import { authorizeOrder, check, CheckoutError, dbClient, endpoint, loadOrder, publicOrder, verifyStripe } from './_checkout.js';
import { capturePayPal } from './_paypal.js';
export default endpoint(async (req) => {
  const db = dbClient();
  const order = req.body?.orderId ? await loadOrder(db, req.body.orderId) : check(await db.from('orders').select('*, items:order_items(*)').eq('checkout_request_id', req.body?.requestId).maybeSingle());
  if (!order) throw new CheckoutError('Order not found.', 404);
  await authorizeOrder(db, req, order);
  if (req.body.sessionId && !['paid','refunded','partially_refunded'].includes(order.payment_status)) await verifyStripe(db, order, req.body.sessionId);
  if (req.body.paypalOrderId && order.status !== 'cancelled') await capturePayPal(db, order, req.body.paypalOrderId);
  return { order: publicOrder(await loadOrder(db, order.id)) };
});
