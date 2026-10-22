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

    // 2. Rapid duplicate request suppression: if an email was sent to this address within 60s, return generic success
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data: recentLog } = await db
        .from('email_logs')
        .select('id')
        .eq('recipient', cleanEmail)
        .eq('email_type', 'customer_password_reset')
        .gt('sent_at', oneMinuteAgo)
        .maybeSingle();

      if (recentLog) {
        return {
          success: true,
          message: 'If an account exists with this email address, a password reset link has been dispatched to your inbox.',
        };
      }
    } catch {
      // Non-blocking
    }

    // 3. Generate secure, cryptographically signed, single-use recovery link via Supabase Auth Admin
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

    // 4. User Enumeration Protection: Always return identical public response whether account exists or not
    return {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been dispatched to your inbox.',
    };
  },
  'POST',
  { max: 10, windowMs: 600000 } // Rate limit: 10 requests per 10 minutes per IP
);
