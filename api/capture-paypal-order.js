import { authorizeOrder, dbClient, endpoint, loadOrder } from './_checkout.js';
import { capturePayPal } from './_paypal.js';
export default endpoint(async (req) => {
  const db = dbClient();
  const order = await loadOrder(db, req.body?.orderId);
  await authorizeOrder(db, req, order);
  await capturePayPal(db, order, req.body?.paypalOrderId);
  const updated = await loadOrder(db, order.id);
  return { verified: updated.payment_status === 'paid', orderId: order.id, payment_status: updated.payment_status };
});
