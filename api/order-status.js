import { authorizeOrder, dbClient, endpoint, loadOrder, publicOrder, verifyStripe } from './_checkout.js';
import { capturePayPal } from './_paypal.js';
export default endpoint(async (req) => {
  const db = dbClient();
  const order = await loadOrder(db, req.body?.orderId);
  await authorizeOrder(db, req, order);
  if (req.body.sessionId) await verifyStripe(db, order, req.body.sessionId);
  if (req.body.paypalOrderId) await capturePayPal(db, order, req.body.paypalOrderId);
  return { order: publicOrder(await loadOrder(db, order.id)) };
});
