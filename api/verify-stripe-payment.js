import { authorizeOrder, dbClient, endpoint, loadOrder, verifyStripe } from './_checkout.js';
export default endpoint(async (req) => {
  const db = dbClient();
  let order = await loadOrder(db, req.body?.orderId);
  await authorizeOrder(db, req, order);
  const identifier = req.body?.sessionId || req.body?.paymentIntentId || order.checkout_session_id;
  await verifyStripe(db, order, identifier);
  order = await loadOrder(db, order.id);
  return { verified: order.payment_status === 'paid', orderId: order.id, payment_status: order.payment_status };
});
