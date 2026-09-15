import { dbClient, endpoint, initializeOrder } from './_checkout.js';
export default endpoint(async (req) => {
  const order = await initializeOrder(dbClient(), req, 'bank_transfer');
  return { orderId: order.id, orderNumber: order.order_number, payment_status: order.payment_status, total: Number(order.total_amount) };
});
