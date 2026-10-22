import { dbClient, endpoint, CheckoutError } from './_checkout.js';
import { sendAdminContactInquiry, sendCustomerContactAutoReply } from './_email.js';

export default endpoint(async (req) => {
  const db = dbClient();
  const { name, email, order_reference, message } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new CheckoutError('Please provide your name.', 400);
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new CheckoutError('Please provide a valid email address.', 400);
  }

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    throw new CheckoutError('Please provide a message with at least 5 characters.', 400);
  }

  const cleanName = name.trim().slice(0, 100);
  const cleanEmail = email.trim().toLowerCase().slice(0, 150);
  const cleanOrderRef = order_reference && typeof order_reference === 'string' ? order_reference.trim().slice(0, 50) : null;
  const cleanMessage = message.trim().slice(0, 5000);

  // 1. Record message in contact_messages table
  const { error: insErr } = await db.from('contact_messages').insert({
    name: cleanName,
    email: cleanEmail,
    order_reference: cleanOrderRef,
    message: cleanMessage,
  });

  if (insErr) {
    console.warn('[contact-submit] Database insert note:', insErr.message);
  }

  // 2. Dispatch automated admin inquiry notification
  try {
    await sendAdminContactInquiry(db, {
      name: cleanName,
      email: cleanEmail,
      order_reference: cleanOrderRef,
      message: cleanMessage,
    });
  } catch (err) {
    console.warn('[contact-submit] Admin notification note:', err.message);
  }

  // 3. Dispatch automated customer auto-reply acknowledgment
  try {
    await sendCustomerContactAutoReply(db, {
      name: cleanName,
      email: cleanEmail,
      order_reference: cleanOrderRef,
      message: cleanMessage,
    });
  } catch (err) {
    console.warn('[contact-submit] Customer auto-reply note:', err.message);
  }

  return { success: true, message: 'Your message has been received by customer support.' };
}, 'POST', { max: 10, windowMs: 60000 });
