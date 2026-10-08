import { check, CheckoutError, dbClient, endpoint, loadOrder, recordPayment } from './_checkout.js';
import { capturePayPal, paypalRequest } from './_paypal.js';

export default endpoint(async (req) => {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    throw new CheckoutError('PayPal webhook is not configured on the server.', 503);
  }

  const fields = {
    auth_algo: 'paypal-auth-algo',
    cert_url: 'paypal-cert-url',
    transmission_id: 'paypal-transmission-id',
    transmission_sig: 'paypal-transmission-sig',
    transmission_time: 'paypal-transmission-time',
  };

  const signature = Object.fromEntries(
    Object.entries(fields).map(([field, header]) => [field, req.headers[header]])
  );

  if (Object.values(signature).some((value) => !value)) {
    throw new CheckoutError('Missing PayPal webhook signature headers.', 400);
  }

  const verification = await paypalRequest('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      ...signature,
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: req.body,
    }),
  });

  if (verification.verification_status !== 'SUCCESS') {
    console.error('[paypal-webhook] Webhook signature verification failed:', verification);
    throw new CheckoutError('Invalid webhook signature.', 400);
  }

  const event = req.body;
  const resource = event.resource;
  const db = dbClient();
  const eventKey = `paypal:event:${event.id}`;

  // Webhook Idempotency Check:
  try {
    const { data: existingEvent } = await db
      .from('payment_events')
      .select('id')
      .eq('id', eventKey)
      .maybeSingle();

    if (existingEvent) {
      console.log(`[paypal-webhook] Event already processed (idempotent duplicate): ${event.id}`);
      return { received: true, idempotent_duplicate: true };
    }
  } catch (err) {
    console.warn('[paypal-webhook] Idempotency check error, continuing:', err.message);
  }

  let orderIdToRecord = null;
  let amountToRecord = null;

  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
    const order = check(
      await db.from('orders').select('*').eq('paypal_order_id', resource.id).maybeSingle()
    );
    if (!order) throw new CheckoutError('Order is not synchronized yet. Retry event.', 503);
    orderIdToRecord = order.id;

    if (order.status !== 'cancelled') {
      await capturePayPal(db, order, resource.id);
    }
  } else if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const paypalId = resource.supplementary_data?.related_ids?.order_id;
    if (!paypalId) throw new CheckoutError('PayPal order reference is missing.', 400);

    const order = check(
      await db.from('orders').select('*').eq('paypal_order_id', paypalId).maybeSingle()
    );
    if (!order) throw new CheckoutError('Order is not synchronized yet. Retry event.', 503);
    if (resource.status !== 'COMPLETED') throw new CheckoutError('Capture is incomplete.', 409);

    orderIdToRecord = order.id;
    amountToRecord = Number(resource.amount.value);

    // Verify currency and amount against database order
    await recordPayment(
      db,
      order,
      paypalId,
      resource.id,
      amountToRecord,
      resource.amount.currency_code
    );

    try {
      const freshOrder = await loadOrder(db, order.id);
      const { sendCustomerPaymentReceipt } = await import('./_email.js');
      await sendCustomerPaymentReceipt(db, freshOrder || order, {
        paymentReference: resource.id,
        paidAt: new Date().toISOString(),
      });
    } catch (receiptErr) {
      console.warn('[paypal-webhook] Customer receipt dispatch note:', receiptErr.message);
    }
  } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
    const captureId =
      resource.supplementary_data?.related_ids?.capture_id ||
      resource.links?.find((link) => link.rel === 'up')?.href?.split('/').pop();
    if (!captureId) throw new CheckoutError('Capture reference is missing.', 400);

    const order = check(
      await db.from('orders').select('*').eq('paypal_capture_id', captureId).maybeSingle()
    );
    if (!order) throw new CheckoutError('Order is not synchronized yet. Retry event.', 503);
    if (resource.amount.currency_code !== order.currency) {
      throw new CheckoutError('Refund currency mismatch.', 409);
    }

    orderIdToRecord = order.id;
    amountToRecord = Number(resource.amount.value);

    check(
      await db.rpc('record_checkout_refund', {
        p_order_id: order.id,
        p_event_id: resource.id,
        p_amount: amountToRecord,
        p_cumulative: false,
      })
    );
  }

  // Record idempotency marker
  if (orderIdToRecord) {
    await db
      .from('payment_events')
      .insert({
        id: eventKey,
        order_id: orderIdToRecord,
        provider: 'paypal',
        event_type: event.event_type,
        amount: amountToRecord,
      })
      .maybeSingle()
      .catch(() => {});
  }

  return { received: true };
}, 'POST', { max: 120, windowMs: 60000 });
