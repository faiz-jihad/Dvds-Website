import { authorizeOrder, dbClient, endpoint, loadOrder, verifyStripe } from './_checkout.js';
export default endpoint(async (req) => {
  const db = dbClient();
  const order = await loadOrder(db, req.body?.orderId);
  await authorizeOrder(db, req, order);
  const session = await verifyStripe(db, order, req.body?.sessionId);
  return { verified: session.payment_status === 'paid', orderId: order.id };
});
