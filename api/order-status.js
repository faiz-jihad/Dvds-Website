import { authorizeOrder, check, CheckoutError, dbClient, endpoint, loadOrder, publicOrder, verifyStripe } from './_checkout.js';
import { capturePayPal } from './_paypal.js';

export default endpoint(async (req) => {
  const db = dbClient();
  let order = null;

  const orderId = typeof req.body?.orderId === 'string' && req.body.orderId.trim() ? req.body.orderId.trim() : null;
  const queryId = req.body?.sessionId || req.body?.paymentIntentId;

  if (orderId) {
    order = await loadOrder(db, orderId);
  } else if (queryId) {
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

  // Active Stripe verification: check Stripe directly if customer returned from checkout and order is still pending
  if (order.payment_provider === 'stripe' && order.payment_status !== 'paid' && order.status !== 'cancelled') {
    const stripeIdentifier =
      req.body?.sessionId ||
      req.body?.paymentIntentId ||
      order.checkout_session_id ||
      order.payment_reference;

    if (stripeIdentifier) {
      try {
        await verifyStripe(db, order, stripeIdentifier);
        order = await loadOrder(db, order.id);
      } catch (err) {
        console.warn('[order-status] Stripe verification attempt note:', err.message);
      }
    }
  }

  // Active PayPal capture: capture and verify if returning from PayPal redirect
  if (order.payment_provider === 'paypal' && order.payment_status !== 'paid' && order.status !== 'cancelled') {
    const paypalId = req.body?.paypalOrderId || req.body?.token || order.paypal_order_id;
    if (paypalId) {
      try {
        await capturePayPal(db, order, paypalId);
        order = await loadOrder(db, order.id);
      } catch (err) {
        console.warn('[order-status] PayPal capture attempt note:', err.message);
      }
    }
  }

  // Ensure customer payment receipt and admin verified payment alert have been dispatched once order is confirmed paid
  if (order.payment_status === 'paid') {
    try {
      const { sendCustomerPaymentReceipt, sendAdminPaymentVerifiedAlert } = await import('./_email.js');
      if (!order.receipt_sent_at) {
        await sendCustomerPaymentReceipt(db, order, {
          paymentReference: order.payment_reference || 'Confirmed',
          paidAt: order.paid_at || new Date().toISOString(),
        });
      }
      if (!order.admin_notified_at) {
        await sendAdminPaymentVerifiedAlert(db, order, {
          paymentReference: order.payment_reference || 'Confirmed',
          amount: order.total_amount,
          currency: order.currency,
          provider: order.payment_provider,
        });
      }
    } catch (err) {
      console.warn('[order-status] Email dispatch check note:', err.message);
    }
  }

  // The order status reflects verified backend / provider data.
  return {
    order: {
      ...publicOrder(order),
      checkout_url: order.payment_status === 'pending' && order.status !== 'cancelled' ? (order.checkout_url || null) : null,
    },
    verified: order.payment_status === 'paid',
    orderId: order.id,
    orderNumber: order.order_number,
    payment_status: order.payment_status,
  };
}, 'POST', { max: 120, windowMs: 60000 });

