import { check, CheckoutError, dbClient, endpoint, loadOrder, recordPayment, stripeClient } from './_checkout.js';
export const config = { api: { bodyParser: false } };
export default endpoint(async (req) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new CheckoutError('Webhook is not configured.', 503);
  if (!req.headers['stripe-signature']) throw new CheckoutError('Missing webhook signature.', 400);
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) throw new CheckoutError('Request too large.', 413); chunks.push(Buffer.from(chunk)); }
  let event;
  try { event = stripeClient().webhooks.constructEvent(Buffer.concat(chunks), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch { throw new CheckoutError('Invalid webhook signature.', 400); }
  const session = event.data.object;
  const db = dbClient();
  if (['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type) && session.metadata?.order_id) {
    const order = await loadOrder(db, session.metadata.order_id);
    if (order.payment_provider !== 'stripe') throw new CheckoutError('Provider mismatch.', 409);
    if (session.payment_status === 'paid') await recordPayment(db, order, session.id, typeof session.payment_intent === 'string' ? session.payment_intent : session.id, session.amount_total / 100, session.currency);
  } else if (event.type === 'checkout.session.expired' && session.metadata?.order_id) {
    check(await db.rpc('expire_checkout_order', { p_order_id: session.metadata.order_id, p_provider_order_id: session.id }));
  } else if (event.type === 'charge.refunded' && session.metadata?.order_id) {
    const order = await loadOrder(db, session.metadata.order_id);
    if (order.payment_provider !== 'stripe' || order.payment_reference !== session.payment_intent || session.currency?.toUpperCase() !== order.currency) throw new CheckoutError('Refund does not match order.', 409);
    check(await db.rpc('record_checkout_refund', { p_order_id: order.id, p_event_id: event.id, p_amount: session.amount_refunded / 100, p_cumulative: true }));
  }
  return { received: true };
});
