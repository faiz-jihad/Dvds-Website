import { check, CheckoutError, dbClient, endpoint, initializeOrder, stripeClient } from './_checkout.js';
import { minorAmount } from '../shared/commerce.js';
import { stripeShipping } from './_provider-shipping.js';

export default endpoint(async (req) => {
  const db = dbClient();
  const order = await initializeOrder(db, req, 'card');

  if (order.payment_status === 'paid') {
    return { orderId: order.id, orderNumber: order.order_number, completed: true };
  }

  const stripe = stripeClient();

  const currency = String(order.currency || 'GBP').toLowerCase();
  const unitAmount = minorAmount(order.total_amount, order.currency || 'GBP');

  if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
    throw new CheckoutError('Invalid order total for payment.', 400);
  }

  // Reuse existing PaymentIntent if it is still valid and awaiting payment
  let paymentIntent = null;
  if (order.checkout_session_id && order.checkout_session_id.startsWith('pi_')) {
    try {
      const existing = await stripe.paymentIntents.retrieve(order.checkout_session_id);
      if (
        existing &&
        ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existing.status) &&
        existing.amount === unitAmount &&
        existing.currency.toLowerCase() === currency
      ) {
        paymentIntent = existing;
      }
    } catch {
      // Intent was cancelled or invalid; create a new one
    }
  }

  if (!paymentIntent) {
    paymentIntent = await stripe.paymentIntents.create(
      {
        amount: unitAmount,
        currency,
        description: `DVD ZONE - Order ${order.order_number}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_email: order.email,
        },
        shipping: stripeShipping(order),
        receipt_email: order.email,
        automatic_payment_methods: {
          enabled: true,
        },
      },
      { idempotencyKey: `payment-intent-${order.id}` }
    );

    check(
      await db
        .from('orders')
        .update({
          checkout_session_id: paymentIntent.id,
          payment_reference: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .select('id')
        .single()
    );
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    orderId: order.id,
    orderNumber: order.order_number,
    amount: order.total_amount,
    currency: order.currency,
  };
}, 'POST', { max: 15, windowMs: 60000 });
