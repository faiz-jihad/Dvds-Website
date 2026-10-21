import { dbClient, endpoint, CheckoutError } from './_checkout.js';

export default endpoint(async (req) => {
  const db = dbClient();
  const { email } = req.body || {};

  if (!email || typeof email !== 'string') {
    throw new CheckoutError('Please provide a valid email address.', 400);
  }
  const cleanEmail = email.trim().toLowerCase();

  const { data: listData, error: listError } = await db.auth.admin.listUsers();
  if (listError) {
    throw new CheckoutError('User service unavailable.', 500);
  }

  const existingUser = (listData?.users || []).find((u) => u.email?.toLowerCase() === cleanEmail);
  if (!existingUser) {
    throw new CheckoutError('User not found.', 404);
  }

  if (!existingUser.email_confirmed_at) {
    const { error: updateErr } = await db.auth.admin.updateUserById(existingUser.id, {
      email_confirm: true,
    });
    if (updateErr) {
      throw new CheckoutError(updateErr.message || 'Could not confirm email.', 500);
    }
  }

  return { success: true, confirmed: true };
}, 'POST', { max: 30, windowMs: 60000 });
