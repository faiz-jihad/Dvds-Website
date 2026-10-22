import { check, dbClient, endpoint, initializeOrder, siteOrigin } from './_checkout.js';
import { sendCustomerBankTransferInstructions, sendAdminNewOrderNotification } from './_email.js';

export default endpoint(async (req) => {
  const db = dbClient();
  const origin = siteOrigin(req);
  const order = await initializeOrder(db, req, 'bank_transfer');

  const successUrl = `${origin}/order-success/${order.id}`;

  // Update order with direct navigation url and ensure status reflects bank awaiting payment
  check(
    await db
      .from('orders')
      .update({
        checkout_url: successUrl,
        payment_status: 'awaiting_payment',
        status: 'pending',
      })
      .eq('id', order.id)
      .select('id')
      .single()
  );

  // Automatically dispatch bank transfer instructions to the customer
  try {
    await sendCustomerBankTransferInstructions(db, order);
  } catch (err) {
    console.warn('[bank-transfer] Customer instructions email note:', err.message);
  }

  // Automatically notify admin of newly placed bank transfer order
  try {
    await sendAdminNewOrderNotification(db, order);
  } catch (err) {
    console.warn('[bank-transfer] Admin new order notification note:', err.message);
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    url: successUrl,
    completed: true,
  };
}, 'POST', { max: 15, windowMs: 60000 });
