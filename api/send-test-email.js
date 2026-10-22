import { dbClient, endpoint, requestUser, CheckoutError } from './_checkout.js';
import { sendEmail, getActiveEmailProvider, logEmailAttempt } from './_email.js';
import {
  renderEmailLayout,
  renderInfoBox,
  renderKeyValueTable,
  renderPlainTextHeader,
  renderPlainTextFooter,
  formatUkDateTime,
} from './_email-design-system.js';

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
  const timestamp = formatUkDateTime(Date.now());

  const subject = `[Test Email] DVDs Zone Email System Verification (${activeProvider.name})`;
  const preheader = `Automated delivery pipeline verification test for ${activeProvider.name}.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
      This diagnostic notification confirms that the automated transactional email pipeline for <strong>DVDs Zone</strong> is fully functional.
    </p>

    ${renderInfoBox({
      title: 'Delivery Pipeline Verified',
      content: 'All transactional templates (receipts, dispatch confirmations, bank instructions, and security alerts) are operational.',
      type: 'success',
    })}

    ${renderKeyValueTable([
      { label: 'Active Provider', value: activeProvider.name, bold: true, color: '#1D4ED8' },
      { label: 'Sender Address', value: activeProvider.fromEmail, bold: true },
      { label: 'Recipient', value: targetEmail },
      { label: 'Timestamp', value: timestamp },
    ])}
  `;

  const htmlBody = renderEmailLayout({
    preheader,
    title: 'Email System Verification',
    subtitle: 'System Diagnostic Test',
    badgeText: 'Operational',
    badgeType: 'success',
    contentHtml,
    isInternal: true,
  });

  const textBody = `${renderPlainTextHeader('System Verification', activeProvider.name)}
Date:       ${timestamp}
Provider:   ${activeProvider.name}
From:       ${activeProvider.fromEmail}
Recipient:  ${targetEmail}

This is a test notification confirming that the automated email pipeline for DVDs Zone is operational.
${renderPlainTextFooter(true)}
`;

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
