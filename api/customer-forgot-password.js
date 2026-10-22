import { dbClient, endpoint, CheckoutError } from './_checkout.js';
import { sendCustomerPasswordResetEmail } from './_email.js';

export default endpoint(
  async (req) => {
    const db = dbClient();
    const { email } = req.body || {};

    // 1. Validate email input format
    if (!email || typeof email !== 'string') {
      throw new CheckoutError('Please provide a valid email address.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new CheckoutError('Please provide a valid email address.', 400);
    }

    const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
    const redirectTo = `${siteUrl}/reset-password`;

    // 2. Generate secure, cryptographically signed, single-use recovery link via Supabase Auth Admin
    try {
      const { data, error } = await db.auth.admin.generateLink({
        type: 'recovery',
        email: cleanEmail,
        options: {
          redirectTo,
        },
      });

      if (!error && data?.properties?.action_link) {
        const actionLink = data.properties.action_link;
        const fullName = data.user?.user_metadata?.full_name;

        // Dispatch branded, secure email via DVDs Zone Postfix SMTP transport
        await sendCustomerPasswordResetEmail(db, {
          email: cleanEmail,
          resetUrl: actionLink,
          fullName,
        });
      } else if (error) {
        // Log internally for debugging, never expose to client
        console.warn('[customer-forgot-password] generateLink notice:', error.message);
      }
    } catch (err) {
      console.error('[customer-forgot-password] Exception during recovery link generation:', err.message);
    }

    // 3. User Enumeration Protection: Always return identical public response whether account exists or not
    return {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been dispatched to your inbox.',
    };
  },
  'POST',
  { max: 5, windowMs: 900000 } // Rate limit: 5 requests per 15 minutes per IP
);
