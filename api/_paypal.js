import { CheckoutError, recordPayment } from './_checkout.js';

export async function paypalRequest(path, options = {}) {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) throw new CheckoutError('PayPal is temporarily unavailable.', 503);
  const base = ['live','production'].includes(process.env.PAYPAL_ENVIRONMENT) ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, { method: 'POST', headers: {
    Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }, body: 'grant_type=client_credentials', signal: AbortSignal.timeout(20_000) });
  if (!tokenResponse.ok) throw new CheckoutError('PayPal could not connect. Please try again.', 502);
  const token = await tokenResponse.json();
  const response = await fetch(`${base}${path}`, { ...options, headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(25_000) });
  const data = await response.json();
  if (!response.ok) throw new CheckoutError('PayPal could not complete this request. Please retry.', 502, data.details?.[0]?.issue || 'PAYPAL_ERROR');
  return data;
}

export async function capturePayPal(db, order, paypalId) {
  if (order.payment_provider !== 'paypal' || order.paypal_order_id !== paypalId) throw new CheckoutError('PayPal payment does not belong to this order.', 403, 'PAYMENT_MISMATCH');
  if (['paid','refunded','partially_refunded'].includes(order.payment_status)) return;
  if (order.status === 'cancelled') throw new CheckoutError('This order has been cancelled. Start a new checkout.', 409, 'ATTEMPT_CLOSED');
  let result = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalId)}`);
  if (result.status === 'APPROVED') result = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalId)}/capture`, { method: 'POST', headers: { 'PayPal-Request-Id': `capture-${order.id}`, Prefer: 'return=representation' }, body: '{}' });
  if (result.status !== 'COMPLETED') return;
  const unit = result.purchase_units?.[0];
  const captures = unit?.payments?.captures || [];
  const capture = captures.find((item) => item.status === 'COMPLETED');
  if (!capture || captures.length !== 1 || (unit.custom_id && unit.custom_id !== order.id)) throw new CheckoutError('PayPal payment details could not be verified.', 409);
  await recordPayment(db, order, paypalId, capture.id, Number(capture.amount.value), capture.amount.currency_code);
}
