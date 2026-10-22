import { dbClient, endpoint, requestUser, CheckoutError } from './_checkout.js';

const MASTER_ADMIN_EMAILS = new Set([
  'info@dvds-zone.co.uk',
  'azrayanltd@gmail.com',
  'admin@dvds-zone.co.uk',
  'admin@dvdszone.co.uk',
  'admin@azrayan.co.uk',
  'faizalba74@gmail.com',
]);

export default endpoint(async (req) => {
  const db = dbClient();

  // 1. Authenticate administrative user
  const user = await requestUser(db, req);
  if (!user) {
    throw new CheckoutError('Sign in with an admin account to delete transactions.', 401, 'AUTH_REQUIRED');
  }

  const email = (user.email || '').toLowerCase().trim();
  const isMaster = MASTER_ADMIN_EMAILS.has(email);

  let isAuthorized = isMaster || user.app_metadata?.role === 'admin' || user.app_metadata?.role === 'staff';
  if (!isAuthorized) {
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
    isAuthorized = Boolean(profile && ['admin', 'staff'].includes(profile.role));
  }

  if (!isAuthorized) {
    throw new CheckoutError('Administrative privileges required to delete transactions.', 403, 'FORBIDDEN');
  }

  const orderId = req.body?.orderId || req.body?.id;
  if (!orderId || typeof orderId !== 'string') {
    throw new CheckoutError('Valid orderId is required.', 400, 'INVALID_ORDER_ID');
  }

  // 2. Verify order exists
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, order_number, total_amount, email, status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    throw new CheckoutError('Order not found or may have already been deleted.', 404, 'ORDER_NOT_FOUND');
  }

  // 3. Clean up related rows before deleting the order
  await db.from('payment_events').delete().eq('order_id', orderId);
  try {
    await db.from('email_logs').delete().eq('order_id', orderId);
  } catch {}
  await db.from('order_status_history').delete().eq('order_id', orderId);
  await db.from('order_items').delete().eq('order_id', orderId);

  // 4. Delete the order
  const { error: delErr } = await db.from('orders').delete().eq('id', orderId);
  if (delErr) {
    throw new CheckoutError(`Could not delete order: ${delErr.message}`, 500, 'DELETE_FAILED');
  }

  return {
    success: true,
    deletedOrderId: order.id,
    orderNumber: order.order_number,
    message: `Transaction ${order.order_number} has been deleted successfully.`
  };
}, 'POST', { max: 10, windowMs: 60000 });
