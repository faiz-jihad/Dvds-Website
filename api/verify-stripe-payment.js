import { authorizeOrder, dbClient, endpoint, loadOrder, verifyStripe } from './_checkout.js';
export default endpoint(async (req) => {
  const db = dbClient();
  const order = await loadOrder(db, req.body?.orderId);
  await authorizeOrder(db, req, order);
  const identifier = req.body?.sessionId || req.body?.paymentIntentId;
  const session = await verifyStripe(db, order, identifier);
  return { verified: session.payment_status === 'paid', orderId: order.id };
});
