import { dbClient, endpoint, requestUser, loadOrder, check, CheckoutError } from './_checkout.js';
import {
  sendCustomerOrderDispatched,
  sendCustomerOrderCancelled,
  sendCustomerOrderProcessing,
  sendCustomerOrderRefunded,
  sendAdminRefundAlert,
} from './_email.js';

export default endpoint(async (req) => {
  const db = dbClient();

  // 1. Authenticate administrative user
  const user = await requestUser(db, req);
  if (!user) {
    throw new CheckoutError('Sign in to access administrative functions.', 401, 'AUTH_REQUIRED');
  }

  const email = (user.email || '').toLowerCase().trim();
  const MASTER_ADMIN_EMAILS = new Set([
    'info@dvds-zone.co.uk',
    'azrayanltd@gmail.com',
    'admin@dvds-zone.co.uk',
    'admin@dvdszone.co.uk',
    'admin@azrayan.co.uk',
    'faizalba74@gmail.com',
  ]);

  let isAuthorized = MASTER_ADMIN_EMAILS.has(email) || user.app_metadata?.role === 'admin' || user.app_metadata?.role === 'staff';
  if (!isAuthorized) {
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
    isAuthorized = Boolean(profile && ['admin', 'staff'].includes(profile.role));
  }

  if (!isAuthorized) {
    throw new CheckoutError('Administrative privileges required to update orders.', 403, 'FORBIDDEN');
  }

  const { orderId, status, fulfilmentStatus, carrier, trackingNumber, note, sendNotification = true } = req.body || {};

  if (!orderId || typeof orderId !== 'string') {
    throw new CheckoutError('Order ID is required.', 400);
  }

  // 2. Perform database status transition
  check(
    await db.rpc('transition_order_status', {
      p_order_id: orderId,
      p_status: status,
      p_fulfilment_status: fulfilmentStatus || 'unfulfilled',
      p_carrier: carrier?.trim() || null,
      p_tracking_number: trackingNumber?.trim() || null,
      p_note: note?.trim() || null,
    })
  );

  const freshOrder = await loadOrder(db, orderId);
  if (!freshOrder) {
    throw new CheckoutError('Order not found after status update.', 404);
  }

  let emailResult = null;

  // 3. Automatically dispatch appropriate customer notification emails
  if (sendNotification) {
    if (status === 'dispatched') {
      try {
        emailResult = await sendCustomerOrderDispatched(db, freshOrder, {
          carrier: carrier?.trim() || 'Royal Mail',
          trackingNumber: trackingNumber?.trim() || '',
          note: note?.trim() || '',
        });
      } catch (err) {
        console.warn('[order-status-update] Dispatched email dispatch note:', err.message);
      }
    } else if (status === 'processing') {
      try {
        emailResult = await sendCustomerOrderProcessing(db, freshOrder, {
          note: note?.trim() || '',
        });
      } catch (err) {
        console.warn('[order-status-update] Processing email dispatch note:', err.message);
      }
    } else if (status === 'cancelled') {
      try {
        emailResult = await sendCustomerOrderCancelled(db, freshOrder, {
          reason: note?.trim() || 'Order cancelled upon administrative review.',
        });
      } catch (err) {
        console.warn('[order-status-update] Cancelled email dispatch note:', err.message);
      }
    } else if (status === 'refunded') {
      try {
        emailResult = await sendCustomerOrderRefunded(db, freshOrder, {
          refundAmount: freshOrder.total_amount,
          currency: freshOrder.currency,
          reason: note?.trim() || 'Refund processed by store management.',
        });
        await sendAdminRefundAlert(db, freshOrder, {
          refundAmount: freshOrder.total_amount,
          currency: freshOrder.currency,
          provider: freshOrder.payment_provider,
          reason: note?.trim() || 'Refund processed by store management.',
        });
      } catch (err) {
        console.warn('[order-status-update] Refund email dispatch note:', err.message);
      }
    }
  }

  return {
    success: true,
    order: freshOrder,
    emailResult,
  };
}, 'POST', { max: 60, windowMs: 60000 });
