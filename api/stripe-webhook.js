import { check, CheckoutError, dbClient, endpoint, loadOrder, recordPayment, stripeClient } from './_checkout.js';
import { minorAmount } from '../shared/commerce.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Extracts raw body Buffer from the incoming request.
 * Handles readable streams, pre-buffered payloads, and string bodies across
 * Vercel Serverless Functions and local development servers.
 */
async function getRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.rawBody === 'string') return Buffer.from(req.rawBody, 'utf8');

  if (typeof req[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024 * 1024) {
        throw new CheckoutError('Webhook payload exceeds 1MB limit.', 413);
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }

  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  throw new CheckoutError('Unable to read raw webhook request payload.', 400);
}

export default async function stripeWebhookHandler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  if (req.method !== 'POST') {
    if (typeof res.setHeader === 'function') res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    console.error('[stripe-webhook] Missing Stripe-Signature header.');
    return res.status(400).json({ error: 'Missing Stripe-Signature header.' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured on the server.');
    return res.status(503).json({ error: 'Stripe webhook secret is not configured.' });
  }

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('[stripe-webhook] Error extracting raw body:', err.message);
    return res.status(err.status || 400).json({ error: err.message || 'Invalid payload.' });
  }

  let event;
  try {
    const stripe = stripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const db = dbClient();
  const eventKey = `stripe:event:${event.id}`;

  // Webhook Idempotency Check:
  // Check if this Stripe event ID has already been recorded in payment_events.
  try {
    const { data: existingEvent } = await db
      .from('payment_events')
      .select('id')
      .eq('id', eventKey)
      .maybeSingle();

    if (existingEvent) {
      console.log(`[stripe-webhook] Event already processed (idempotent duplicate): ${event.id}`);
      return res.status(200).json({ received: true, idempotent_duplicate: true });
    }
  } catch (err) {
    console.warn('[stripe-webhook] Idempotency check query failed, continuing with event processing:', err.message);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        let orderId = session.metadata?.order_id || session.client_reference_id;

        // Fallback: look up order by checkout_session_id
        if (!orderId && session.id) {
          const { data: matchedOrder } = await db
            .from('orders')
            .select('id')
            .eq('checkout_session_id', session.id)
            .maybeSingle();
          if (matchedOrder) orderId = matchedOrder.id;
        }

        if (!orderId) {
          console.warn(`[stripe-webhook] Session ${session.id} contains no order reference.`);
          return res.status(200).json({ received: true, unhandled: 'no_order_reference' });
        }

        const order = await loadOrder(db, orderId);
        if (!order) {
          console.error(`[stripe-webhook] Order ${orderId} not found in database.`);
          return res.status(404).json({ error: 'Order not found.' });
        }

        if (order.payment_provider !== 'stripe') {
          console.error(`[stripe-webhook] Provider mismatch for order ${order.id}: expected stripe, got ${order.payment_provider}`);
          return res.status(409).json({ error: 'Payment provider mismatch.' });
        }

        // Only mark order as paid if Stripe confirms successful payment
        if (session.payment_status === 'paid') {
          const sessionCurrency = String(session.currency || '').toUpperCase();
          const orderCurrency = String(order.currency || 'GBP').toUpperCase();

          if (sessionCurrency !== orderCurrency) {
            console.error(`[stripe-webhook] Currency mismatch for order ${order.id}: Stripe ${sessionCurrency} vs DB ${orderCurrency}`);
            return res.status(409).json({ error: 'Payment currency mismatch.' });
          }

          const expectedPence = minorAmount(order.total_amount, order.currency);
          const actualPence = session.amount_total;

          if (expectedPence !== actualPence) {
            console.error(`[stripe-webhook] Amount mismatch for order ${order.id}: Stripe ${actualPence}p vs DB ${expectedPence}p`);
            return res.status(409).json({ error: 'Payment amount mismatch.' });
          }

          const paymentReference =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.id;

          const numericAmount = Number(
            (session.amount_total / (order.currency === 'JPY' ? 1 : 100)).toFixed(2)
          );

          // Atomic and idempotent payment recording in database
          await recordPayment(
            db,
            order,
            session.id,
            paymentReference,
            numericAmount,
            order.currency
          );

          console.log(
            `[stripe-webhook] Order ${order.id} (#${order.order_number}) successfully recorded as PAID (Ref: ${paymentReference}, Amount: ${order.currency} ${numericAmount}).`
          );

          // Record event idempotency marker
          await db
            .from('payment_events')
            .insert({
              id: eventKey,
              order_id: order.id,
              provider: 'stripe',
              event_type: event.type,
              amount: numericAmount,
            })
            .maybeSingle()
            .catch(() => {});
        } else {
          console.log(
            `[stripe-webhook] Session ${session.id} payment_status is '${session.payment_status}' (not paid). Order remains pending.`
          );
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        const orderId = session.metadata?.order_id || session.client_reference_id;

        if (orderId) {
          console.warn(
            `[stripe-webhook] Async payment failed for order ${orderId}, session ${session.id}. Expiring order and releasing stock.`
          );
          check(
            await db.rpc('expire_checkout_order', {
              p_order_id: orderId,
              p_provider_order_id: session.id,
            })
          );

          await db
            .from('payment_events')
            .insert({
              id: eventKey,
              order_id: orderId,
              provider: 'stripe',
              event_type: event.type,
              amount: session.amount_total ? Number((session.amount_total / 100).toFixed(2)) : null,
            })
            .maybeSingle()
            .catch(() => {});
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.order_id || session.client_reference_id;

        if (orderId) {
          console.log(
            `[stripe-webhook] Checkout session expired for order ${orderId}, session ${session.id}. Releasing inventory.`
          );
          check(
            await db.rpc('expire_checkout_order', {
              p_order_id: orderId,
              p_provider_order_id: session.id,
            })
          );

          await db
            .from('payment_events')
            .insert({
              id: eventKey,
              order_id: orderId,
              provider: 'stripe',
              event_type: event.type,
              amount: null,
            })
            .maybeSingle()
            .catch(() => {});
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        let order = null;

        if (charge.metadata?.order_id) {
          order = await loadOrder(db, charge.metadata.order_id).catch(() => null);
        }

        if (!order && charge.payment_intent) {
          const { data } = await db
            .from('orders')
            .select('*, items:order_items(*)')
            .eq('payment_reference', charge.payment_intent)
            .maybeSingle();
          if (data) order = data;
        }

        if (order && order.payment_provider === 'stripe') {
          const refundAmount = Number(
            (charge.amount_refunded / (order.currency === 'JPY' ? 1 : 100)).toFixed(2)
          );
          console.log(
            `[stripe-webhook] Recording refund of ${order.currency} ${refundAmount} for order ${order.id} (#${order.order_number}).`
          );

          check(
            await db.rpc('record_checkout_refund', {
              p_order_id: order.id,
              p_event_id: event.id,
              p_amount: refundAmount,
              p_cumulative: true,
            })
          );

          await db
            .from('payment_events')
            .insert({
              id: eventKey,
              order_id: order.id,
              provider: 'stripe',
              event_type: event.type,
              amount: refundAmount,
            })
            .maybeSingle()
            .catch(() => {});
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        let orderId = paymentIntent.metadata?.order_id;

        if (!orderId && paymentIntent.id) {
          const { data: matchedOrder } = await db
            .from('orders')
            .select('id')
            .or(`checkout_session_id.eq.${paymentIntent.id},payment_reference.eq.${paymentIntent.id}`)
            .maybeSingle();
          if (matchedOrder) orderId = matchedOrder.id;
        }

        if (!orderId) {
          console.warn(`[stripe-webhook] PaymentIntent ${paymentIntent.id} contains no order reference.`);
          return res.status(200).json({ received: true, unhandled: 'no_order_reference' });
        }

        const order = await loadOrder(db, orderId);
        if (!order) {
          console.error(`[stripe-webhook] Order ${orderId} not found in database.`);
          return res.status(404).json({ error: 'Order not found.' });
        }

        if (order.payment_provider !== 'stripe') {
          console.error(`[stripe-webhook] Provider mismatch for order ${order.id}: expected stripe, got ${order.payment_provider}`);
          return res.status(409).json({ error: 'Payment provider mismatch.' });
        }

        const piCurrency = String(paymentIntent.currency || '').toUpperCase();
        const orderCurrency = String(order.currency || 'GBP').toUpperCase();

        if (piCurrency !== orderCurrency) {
          console.error(`[stripe-webhook] Currency mismatch for order ${order.id}: Stripe ${piCurrency} vs DB ${orderCurrency}`);
          return res.status(409).json({ error: 'Payment currency mismatch.' });
        }

        const expectedPence = minorAmount(order.total_amount, order.currency);
        const actualPence = paymentIntent.amount_received || paymentIntent.amount;

        if (expectedPence !== actualPence) {
          console.error(`[stripe-webhook] Amount mismatch for order ${order.id}: Stripe ${actualPence}p vs DB ${expectedPence}p`);
          return res.status(409).json({ error: 'Payment amount mismatch.' });
        }

        const paymentReference = paymentIntent.id;
        const numericAmount = Number(
          (actualPence / (order.currency === 'JPY' ? 1 : 100)).toFixed(2)
        );

        // Atomic and idempotent payment recording in database
        await recordPayment(
          db,
          order,
          paymentIntent.id,
          paymentReference,
          numericAmount,
          order.currency
        );

        console.log(
          `[stripe-webhook] Order ${order.id} (#${order.order_number}) successfully recorded as PAID via PaymentIntent (Ref: ${paymentReference}, Amount: ${order.currency} ${numericAmount}).`
        );

        // Record event idempotency marker
        await db
          .from('payment_events')
          .insert({
            id: eventKey,
            order_id: order.id,
            provider: 'stripe',
            event_type: event.type,
            amount: numericAmount,
          })
          .maybeSingle()
          .catch(() => {});
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.warn(
          `[stripe-webhook] Payment intent ${paymentIntent.id} payment failed: ${paymentIntent.last_payment_error?.code || 'unknown_code'}`
        );
        break;
      }

      default:
        console.log(`[stripe-webhook] Acknowledged unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Error processing webhook event:', err.message);
    return res.status(err.status || 500).json({
      error: 'An error occurred while processing the Stripe webhook.',
    });
  }
}
