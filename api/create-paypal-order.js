import { check, dbClient, endpoint, initializeOrder, siteOrigin, CheckoutError } from './_checkout.js';
import { paypalRequest } from './_paypal.js';
export default endpoint(async (req) => {
  const db = dbClient();
  const origin = siteOrigin(req);
  const order = await initializeOrder(db, req, 'paypal');
  if (order.payment_status === 'paid') return { orderId: order.id, orderNumber: order.order_number, completed: true };
  if (order.checkout_url) return { url: order.checkout_url, orderId: order.id, orderNumber: order.order_number };
  const result = await paypalRequest('/v2/checkout/orders', { method: 'POST', headers: { 'PayPal-Request-Id': order.id },
    body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ reference_id: order.order_number, custom_id: order.id,
      description: `AZ Rayan DVDs - ${order.order_number}`, amount: { currency_code: 'GBP', value: Number(order.total_amount).toFixed(2) } }],
      payment_source: { paypal: { experience_context: { brand_name: 'AZ Rayan DVDs', locale: 'en-GB', user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING', return_url: `${origin}/order-success/${order.id}?paypal=1`, cancel_url: `${origin}/checkout?cancelled=1` } } } }) });
  const url = result.links?.find((link) => ['payer-action','approve'].includes(link.rel))?.href;
  if (!url) throw new CheckoutError('PayPal did not return a checkout link. Please retry.', 502);
  check(await db.from('orders').update({ paypal_order_id: result.id, checkout_url: url }).eq('id', order.id).select('id').single());
  return { url, orderId: order.id, orderNumber: order.order_number, paypalOrderId: result.id };
});
