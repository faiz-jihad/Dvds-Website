import { dbClient, endpoint, requestUser, CheckoutError } from './_checkout.js';
import { sendEmail, getActiveEmailProvider, logEmailAttempt } from './_email.js';

export default endpoint(async (req) => {
  const db = dbClient();

  // 1. Authenticate administrative user
  const user = await requestUser(db, req);
  const MASTER_ADMIN_EMAILS = new Set([
    'azrayanltd@gmail.com',
    'admin@dvds-zone.co.uk',
    'admin@dvdszone.co.uk',
    'admin@azrayan.co.uk',
    'faizalba74@gmail.com',
  ]);

  const userEmail = (user?.email || '').toLowerCase().trim();
  let isAuthorized = MASTER_ADMIN_EMAILS.has(userEmail) || user?.app_metadata?.role === 'admin' || user?.app_metadata?.role === 'staff';
  if (!isAuthorized && user) {
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
    isAuthorized = Boolean(profile && ['admin', 'staff'].includes(profile.role));
  }

  // In development, allow non-authenticated local tests if localhost
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isAuthorized && !isDev) {
    throw new CheckoutError('Administrative privileges required to send test emails.', 403, 'FORBIDDEN');
  }

  const activeProvider = getActiveEmailProvider();
  const targetEmail = req.body?.to || activeProvider.adminEmail || 'azrayanltd@gmail.com';
  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

  const subject = `[Test Email] DVDs Zone Email System Verification (${activeProvider.name})`;
  const textBody = `DVDs Zone - System Verification
Date: ${timestamp}
Provider: ${activeProvider.name}
From Address: ${activeProvider.fromEmail}
Recipient: ${targetEmail}

This is a test notification confirming that the automated email pipeline for DVDs Zone is operational.
`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden;">
    <div style="background: #0B0F19; padding: 24px 28px; border-bottom: 3px solid #1E40AF;">
      <h1 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin: 0;">DVDS ZONE</h1>
      <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">Email System Diagnostic</p>
    </div>
    <div style="padding: 28px;">
      <div style="display: inline-block; background: #DCFCE7; color: #15803D; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; text-transform: uppercase;">
        Operational Test
      </div>
      <h2 style="font-size: 17px; margin: 0 0 12px; color: #0F172A;">Email Delivery Pipeline Verified</h2>
      <p style="color: #64748B; font-size: 13px; line-height: 1.5; margin: 0 0 20px;">
        This automated test verifies that transactional emails (customer receipts, dispatch notifications, bank instructions, and admin reports) can be delivered successfully.
      </p>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; font-size: 12px;">
        <table style="width: 100%;">
          <tr><td style="color: #64748B; padding: 3px 0;">Active Provider:</td><td style="text-align: right; font-weight: 700; color: #1E40AF;">${activeProvider.name}</td></tr>
          <tr><td style="color: #64748B; padding: 3px 0;">Sender Address:</td><td style="text-align: right; font-weight: 600; color: #0F172A;">${activeProvider.fromEmail}</td></tr>
          <tr><td style="color: #64748B; padding: 3px 0;">Recipient:</td><td style="text-align: right; font-weight: 600; color: #0F172A;">${targetEmail}</td></tr>
          <tr><td style="color: #64748B; padding: 3px 0;">Timestamp:</td><td style="text-align: right; font-size: 11px; color: #64748B;">${timestamp}</td></tr>
        </table>
      </div>
    </div>
    <div style="background: #F8FAFC; padding: 16px 28px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #94A3B8;">
      DVDs Zone UK &bull; Automated Diagnostic Tool
    </div>
  </div>
</body>
</html>`;

  const result = await sendEmail({
    to: targetEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    recipient: targetEmail,
    emailType: 'test_email',
    subject,
    result,
  });

  return {
    success: result.success,
    provider: activeProvider,
    recipient: targetEmail,
    result,
  };
}, 'POST', { max: 10, windowMs: 60000 });
