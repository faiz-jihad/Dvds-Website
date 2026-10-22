import { dbClient, endpoint, requestUser, CheckoutError } from './_checkout.js';
import { sendCustomerPasswordResetConfirmation } from './_email.js';

export default endpoint(
  async (req) => {
    const db = dbClient();
    const user = await requestUser(db, req);

    if (!user || !user.email) {
      throw new CheckoutError('Authentication required to confirm password change.', 401, 'AUTH_REQUIRED');
    }

    const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    try {
      await sendCustomerPasswordResetConfirmation(db, {
        email: user.email,
        fullName: user.user_metadata?.full_name,
        changedAt: timestamp,
      });
    } catch (err) {
      console.warn('[customer-password-reset-confirm] Confirmation dispatch note:', err.message);
    }

    return {
      success: true,
      message: 'Password change notification dispatched.',
    };
  },
  'POST',
  { max: 10, windowMs: 60000 }
);
