import { formatMoney } from '../shared/commerce.js';
import nodemailer from 'nodemailer';

/**
 * Universal email dispatcher for DVDs Zone.
 * Supports:
 * - Local Postfix SMTP with OpenDKIM on VPS (127.0.0.1:25)
 * - Mailtrap API (MAILTRAP_API_TOKEN)
 * - Resend (RESEND_API_KEY)
 * - SendGrid (SENDGRID_API_KEY)
 * - Brevo / Sendinblue (BREVO_API_KEY or SIB_API_KEY)
 * - Postmark (POSTMARK_SERVER_TOKEN)
 * - Graceful simulated delivery in local/test environments.
 */
export async function sendEmail({ to, subject, html, text, replyTo = null, isInternalAlert = false }) {
  const fromEmail = process.env.EMAIL_FROM || 'DVDs Zone <info@dvds-zone.co.uk>';
  const smtpHost = process.env.SMTP_HOST || '127.0.0.1';
  const smtpPort = parseInt(process.env.SMTP_PORT || '25', 10);
  const smtpEnabled = process.env.SMTP_ENABLED !== 'false';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const mailtrapToken = process.env.MAILTRAP_API_TOKEN || process.env.MAILTRAP_TOKEN || process.env.MAILTRAP_API_KEY;
  const mailtrapInboxId = process.env.MAILTRAP_INBOX_ID;
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY || process.env.SIB_API_KEY;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;

  const recipients = Array.isArray(to) ? to : [to];
  const primaryRecipient = recipients[0];

  // 1. Local Postfix SMTP Transport (Primary on One.com VPS with OpenDKIM signing)
  if (smtpEnabled) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
        ignoreTLS: smtpPort === 25,
        auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 8000,
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: recipients,
        replyTo: replyTo || undefined,
        subject,
        html,
        text,
      });

      const messageId = info.messageId || (info.response ? `postfix-${info.response.split(/\s+/)[0]}` : 'postfix-ok');
      return { success: true, provider: 'smtp_postfix', id: messageId, response: info.response };
    } catch (err) {
      const isUnavailable = err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND';
      if (!isUnavailable) {
        console.error('[email] SMTP delivery failed:', err.message);
      } else {
        console.log(`[email] Local SMTP ${smtpHost}:${smtpPort} unavailable (${err.code}). Attempting API/simulation fallback...`);
      }
    }
  }

  // 1. Mailtrap API (Official REST API - supports live sending and sandbox inboxes)
  if (mailtrapToken) {
    try {
      const fromMatch = fromEmail.match(/<([^>]+)>/);
      const cleanFromEmail = fromMatch ? fromMatch[1] : fromEmail;
      const cleanFromName = fromEmail.includes('<') ? fromEmail.replace(/<[^>]+>/, '').trim() : 'DVDs Zone';

      const isSandbox = Boolean(mailtrapInboxId);
      const endpointUrl = isSandbox
        ? `https://sandbox.api.mailtrap.io/api/send/${mailtrapInboxId}`
        : 'https://send.api.mailtrap.io/api/send';

      const headers = {
        'Content-Type': 'application/json',
        ...(isSandbox ? { 'Api-Token': mailtrapToken } : { Authorization: `Bearer ${mailtrapToken}` }),
      };

      const payload = {
        from: { email: cleanFromEmail, name: cleanFromName || 'DVDs Zone' },
        to: recipients.map((r) => ({ email: typeof r === 'string' ? r : r.email })),
        subject,
        html,
        text,
        category: 'Transactional',
      };

      if (replyTo) {
        payload.headers = { 'Reply-To': replyTo };
      }

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = Array.isArray(data.errors)
          ? data.errors.join(', ')
          : data.message || `Mailtrap HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      const messageId = Array.isArray(data.message_ids) ? data.message_ids[0] : (data.id || 'mailtrap-ok');
      return { success: true, provider: isSandbox ? 'mailtrap_sandbox' : 'mailtrap', id: messageId };
    } catch (err) {
      console.error('[email] Mailtrap delivery failed:', err.message);
      return { success: false, provider: 'mailtrap', error: err.message };
    }
  }

  // 1. Resend API
  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipients,
          reply_to: replyTo || undefined,
          subject,
          html,
          text,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Resend error HTTP ${response.status}`);
      }
      return { success: true, provider: 'resend', id: data.id };
    } catch (err) {
      console.error('[email] Resend delivery failed:', err.message);
      return { success: false, provider: 'resend', error: err.message };
    }
  }

  // 2. SendGrid API
  if (sendgridKey) {
    try {
      const fromMatch = fromEmail.match(/<([^>]+)>/);
      const cleanFromEmail = fromMatch ? fromMatch[1] : fromEmail;
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: recipients.map((email) => ({ email })) }],
          from: { email: cleanFromEmail, name: 'DVDs Zone' },
          reply_to: replyTo ? { email: replyTo } : undefined,
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (!response.ok) {
        const textErr = await response.text().catch(() => '');
        throw new Error(`SendGrid HTTP ${response.status}: ${textErr}`);
      }
      return { success: true, provider: 'sendgrid' };
    } catch (err) {
      console.error('[email] SendGrid delivery failed:', err.message);
      return { success: false, provider: 'sendgrid', error: err.message };
    }
  }

  // 3. Brevo (Sendinblue) API
  if (brevoKey) {
    try {
      const fromMatch = fromEmail.match(/<([^>]+)>/);
      const cleanFromEmail = fromMatch ? fromMatch[1] : fromEmail;
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'DVDs Zone', email: cleanFromEmail },
          to: recipients.map((email) => ({ email })),
          replyTo: replyTo ? { email: replyTo } : undefined,
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Brevo HTTP ${response.status}`);
      }
      return { success: true, provider: 'brevo', id: data.messageId };
    } catch (err) {
      console.error('[email] Brevo delivery failed:', err.message);
      return { success: false, provider: 'brevo', error: err.message };
    }
  }

  // 4. Postmark API
  if (postmarkToken) {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': postmarkToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          From: fromEmail,
          To: recipients.join(','),
          ReplyTo: replyTo || undefined,
          Subject: subject,
          HtmlBody: html,
          TextBody: text,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.Message || `Postmark HTTP ${response.status}`);
      }
      return { success: true, provider: 'postmark', id: data.MessageID };
    } catch (err) {
      console.error('[email] Postmark delivery failed:', err.message);
      return { success: false, provider: 'postmark', error: err.message };
    }
  }

  // Graceful fallback for local development or when API keys are not yet configured
  console.log(`[email] Simulated delivery to: ${primaryRecipient} | Subject: "${subject}"`);
  return { success: true, provider: 'simulated', simulated: true };
}

/**
 * Returns active email provider identity and configuration state.
 */
export function getActiveEmailProvider() {
  const fromEmail = process.env.EMAIL_FROM || 'DVDs Zone <info@dvds-zone.co.uk>';
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  const smtpHost = process.env.SMTP_HOST || '127.0.0.1';
  const smtpPort = process.env.SMTP_PORT || '25';
  const smtpEnabled = process.env.SMTP_ENABLED !== 'false';
  const mailtrapToken = process.env.MAILTRAP_API_TOKEN || process.env.MAILTRAP_TOKEN || process.env.MAILTRAP_API_KEY;
  const mailtrapInboxId = process.env.MAILTRAP_INBOX_ID;

  if (smtpEnabled) {
    return {
      provider: 'smtp_postfix',
      isProduction: true,
      name: `Postfix SMTP (${smtpHost}:${smtpPort}) + OpenDKIM`,
      fromEmail,
      adminEmail,
    };
  }

  if (mailtrapToken) {
    const isSandbox = Boolean(mailtrapInboxId);
    return {
      provider: isSandbox ? 'mailtrap_sandbox' : 'mailtrap',
      isProduction: !isSandbox,
      name: isSandbox ? `Mailtrap Sandbox (Inbox #${mailtrapInboxId})` : 'Mailtrap Email Sending API',
      fromEmail,
      adminEmail,
    };
  }

  if (process.env.RESEND_API_KEY) {
    return { provider: 'resend', isProduction: true, name: 'Resend API', fromEmail, adminEmail };
  }
  if (process.env.SENDGRID_API_KEY) {
    return { provider: 'sendgrid', isProduction: true, name: 'SendGrid API', fromEmail, adminEmail };
  }
  if (process.env.BREVO_API_KEY || process.env.SIB_API_KEY) {
    return { provider: 'brevo', isProduction: true, name: 'Brevo (Sendinblue) API', fromEmail, adminEmail };
  }
  if (process.env.POSTMARK_SERVER_TOKEN) {
    return { provider: 'postmark', isProduction: true, name: 'Postmark API', fromEmail, adminEmail };
  }
  return { provider: 'simulated', isProduction: false, name: 'Simulation Mode (Dev/Local)', fromEmail, adminEmail };
}

/**
 * Log email send attempt to database if email_logs table is available.
 * Catches schema / check constraint errors gracefully so logging never disrupts operations.
 */
export async function logEmailAttempt(db, { orderId = null, recipient, emailType, subject, result, orderNumber = null }) {
  if (!db) return;
  try {
    const payload = {
      order_id: orderId,
      recipient,
      email_type: emailType,
      subject,
      status: result.success ? (result.simulated ? 'simulated' : 'sent') : 'failed',
      error_message: result.error || null,
      provider: result.provider || null,
    };

    const { error } = await db.from('email_logs').insert(payload);
    if (error) {
      // If table has a legacy CHECK constraint, fallback to allowed type so log is still preserved
      if (error.message?.includes('check constraint') || error.code === '23514') {
        await db.from('email_logs').insert({
          ...payload,
          email_type: 'customer_receipt',
          subject: `[${emailType}] ${subject}`,
        }).catch(() => {});
      } else {
        console.warn('[email] Could not record email log in DB:', error.message);
      }
    }

    // Trigger Admin Alert on Email Delivery Failure (strictly guarded against recursive loops)
    if (
      !result.success &&
      !result.simulated &&
      emailType !== 'admin_email_failure_alert' &&
      !emailType.startsWith('admin_')
    ) {
      sendAdminEmailDeliveryAlert(db, {
        failedRecipient: recipient,
        emailType,
        subject,
        errorReason: result.error,
        orderNumber,
      }).catch((alertErr) => {
        console.warn('[email] Could not dispatch admin delivery alert:', alertErr.message);
      });
    }
  } catch (err) {
    console.warn('[email] Could not record email log in DB:', err.message);
  }
}

/**
 * Helper to resolve order items from either embedded array or database
 */
async function resolveOrderItems(db, order) {
  let items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length && db && order?.id) {
    try {
      const { data: dbItems } = await db
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      if (dbItems && dbItems.length) items = dbItems;
    } catch {
      // non-blocking
    }
  }
  return items;
}

/**
 * Helper to build common email styling and header/footer wrapper
 */
function buildEmailTemplate({ title, subtitle, badgeText, badgeColor = '#10B981', badgeBg = '#ECFDF5', contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 24px auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; }
    .header { background: #0B0F19; padding: 28px 32px; border-bottom: 3px solid #1E40AF; text-align: left; }
    .brand-title { color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .brand-sub { color: #94A3B8; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 32px; }
    .badge { display: inline-block; background: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; }
    .box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .items-table { width: 100%; margin: 20px 0; border-top: 1px solid #E2E8F0; }
    .items-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B; padding: 12px 0 8px; border-bottom: 1px solid #E2E8F0; }
    .items-table td { padding: 12px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
    .btn-action { display: inline-block; background: #1E40AF; color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; text-align: center; }
    .footer { background: #F8FAFC; padding: 24px 32px; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="padding: 16px 12px;">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">DVDS ZONE</h1>
        <p class="brand-sub">${subtitle}</p>
      </div>
      <div class="content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h2 style="font-size: 18px; margin: 0; color: #0F172A;">${title}</h2>
          ${badgeText ? `<span class="badge">${badgeText}</span>` : ''}
        </div>
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px;">Thank you for shopping with <strong>DVDs Zone</strong>.</p>
        <p style="margin: 0;">Need help with your order? Contact our support team at <a href="mailto:azrayanltd@gmail.com" style="color: #1E40AF; text-decoration: none;">azrayanltd@gmail.com</a>.</p>
        <p style="margin: 12px 0 0; font-size: 11px; color: #94A3B8;">Official automated notification from DVDs Zone UK &bull; azrayanltd@gmail.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. Customer Order Confirmation (Instant upon order creation, with accurate status)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderConfirmation(db, order) {
  const recipientEmail = order?.email || order?.customer_email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Durable Idempotency: verify if order confirmation has already been sent
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'order_confirmation')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      console.log(`[email] Order confirmation already sent for order ${order.id}. Skipping duplicate.`);
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const items = await resolveOrderItems(db, order);
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const currency = order.currency || 'GBP';
  const subtotalFormatted = formatMoney(order.subtotal, currency);
  const shippingFormatted = formatMoney(order.shipping_amount, currency);
  const discountFormatted = order.discount_amount ? formatMoney(order.discount_amount, currency) : null;
  const totalFormatted = formatMoney(order.total_amount, currency);
  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;

  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const addressLines = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.postcode,
    address.country || 'United Kingdom',
  ]
    .filter(Boolean)
    .join('\n');

  // Determine accurate payment status badge & text
  const isPaid = order.payment_status === 'paid';
  const isAwaitingBank = order.payment_status === 'awaiting_payment' || order.payment_method === 'bank_transfer';
  const badgeText = isPaid ? 'Paid' : isAwaitingBank ? 'Awaiting Payment' : 'Payment Pending';
  const badgeColor = isPaid ? '#15803D' : '#D97706';
  const badgeBg = isPaid ? '#DCFCE7' : '#FEF3C7';
  const statusExplanation = isPaid
    ? 'Your payment has been received and verified. Your order is queued for fulfillment.'
    : isAwaitingBank
    ? 'Your order has been reserved. Please complete your bank transfer using the instructions provided.'
    : 'Your order has been created. Awaiting payment authorization and confirmation.';

  const subject = `Order Confirmation - DVDs Zone #${order.order_number}`;

  const textBody = `DVDs Zone - Order Confirmation
Order Number: #${order.order_number}
Date: ${orderDate}
Payment Status: ${badgeText}

${statusExplanation}

Items:
${items.map((i) => `• ${i.product_title || 'Item'} (x${i.quantity || 1}) - ${formatMoney(i.total_price || i.unit_price, currency)}`).join('\n')}

Subtotal: ${subtotalFormatted}
Delivery (${order.delivery_name || 'Standard Delivery'}): ${shippingFormatted}
${discountFormatted ? `Discount: -${discountFormatted}\n` : ''}Total: ${totalFormatted}

Delivery Address:
${customerName}
${addressLines}

View Order Details & Status:
${viewOrderUrl}
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 16px;">
      Hello <strong>${customerName}</strong>, thank you for your order with <strong>DVDs Zone</strong>.
    </p>

    <div class="box" style="background: ${isPaid ? '#F0FDF4' : '#FFFBEB'}; border-color: ${isPaid ? '#BBF7D0' : '#FDE68A'};">
      <table style="width: 100%;">
        <tr>
          <td style="color: #475569; font-size: 13px; padding: 4px 0;">Order Reference:</td>
          <td style="text-align: right; font-weight: 700; font-size: 14px; color: #0F172A;">#${order.order_number}</td>
        </tr>
        <tr>
          <td style="color: #475569; font-size: 13px; padding: 4px 0;">Order Date:</td>
          <td style="text-align: right; font-size: 13px; color: #64748B;">${orderDate}</td>
        </tr>
        <tr>
          <td style="color: #475569; font-size: 13px; padding: 4px 0;">Payment Status:</td>
          <td style="text-align: right; font-size: 13px; font-weight: 700; color: ${badgeColor};">${badgeText}</td>
        </tr>
      </table>
      <p style="margin: 10px 0 0; font-size: 12px; color: #475569; line-height: 1.4;">${statusExplanation}</p>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
              <td>
                <strong style="color: #0F172A; display: block;">${item.product_title || 'DVD Item'}</strong>
                ${item.product_sku ? `<span style="font-size: 11px; color: #94A3B8;">SKU: ${item.product_sku}</span>` : ''}
              </td>
              <td style="text-align: center; color: #64748B;">${item.quantity || 1}</td>
              <td style="text-align: right; font-weight: 600; color: #0F172A;">${formatMoney(item.total_price || item.unit_price, currency)}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div style="margin: 16px 0 24px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748B; padding: 4px 0;">Subtotal:</td><td style="text-align: right; color: #0F172A;">${subtotalFormatted}</td></tr>
        <tr><td style="color: #64748B; padding: 4px 0;">Delivery (${order.delivery_name || 'Standard'}):</td><td style="text-align: right; color: #0F172A;">${shippingFormatted}</td></tr>
        ${discountFormatted ? `<tr><td style="color: #10B981; padding: 4px 0;">Discount:</td><td style="text-align: right; color: #10B981;">-${discountFormatted}</td></tr>` : ''}
        <tr>
          <td style="font-size: 16px; font-weight: 800; color: #0F172A; padding-top: 12px; border-top: 2px solid #0F172A;">Total:</td>
          <td style="text-align: right; font-size: 18px; font-weight: 800; color: #1E40AF; padding-top: 12px; border-top: 2px solid #0F172A;">${totalFormatted}</td>
        </tr>
      </table>
    </div>

    <div class="box">
      <strong style="color: #0F172A; display: block; margin-bottom: 4px;">Delivery Address:</strong>
      <span style="color: #334155;">${customerName}</span><br>
      <span style="color: #64748B; white-space: pre-line;">${addressLines}</span>
    </div>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${viewOrderUrl}" class="btn-action" target="_blank">Track Order Status</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Order Confirmation',
    subtitle: 'Order Acknowledgement',
    badgeText,
    badgeColor,
    badgeBg,
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: recipientEmail,
    emailType: 'order_confirmation',
    subject,
    result,
  });

  try {
    await db.from('orders').update({ order_confirmation_sent_at: new Date().toISOString() }).eq('id', order.id);
  } catch {
    // Non-blocking
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 0.1 Customer Order Processing Notification (When warehouse begins picking)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderProcessing(db, order, { note } = {}) {
  const recipientEmail = order?.email || order?.customer_email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Durable Idempotency
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'order_processing')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      console.log(`[email] Order processing email already sent for order ${order.id}. Skipping duplicate.`);
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const items = await resolveOrderItems(db, order);
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;
  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const subject = `Your Order is Being Processed - DVDs Zone #${order.order_number}`;

  const textBody = `DVDs Zone - Order Processing Update
Order Number: #${order.order_number}

Good news! Your order is now being processed. Our warehouse team is picking, quality-inspecting, and securely packaging your items for dispatch.

Items being prepared:
${items.map((i) => `• ${i.product_title || 'Item'} (x${i.quantity || 1})`).join('\n')}

${note ? `Note from fulfillment team: ${note}\n` : ''}
Track live progress:
${viewOrderUrl}
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 16px;">
      Hello <strong>${customerName}</strong>, your order <strong>#${order.order_number}</strong> is now being actively processed!
    </p>

    <div class="box" style="background: #EFF6FF; border-color: #BFDBFE;">
      <p style="color: #1E40AF; margin: 0; font-size: 13px; line-height: 1.5;">
        Our warehouse dispatch team has received your order and is currently picking, inspecting, and carefully packaging your DVD items.
        You will receive another update with carrier tracking as soon as your package ships.
      </p>
      ${note ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #BFDBFE; font-size: 12px; color: #1E3A8A;"><strong>Fulfillment Note:</strong> ${note}</div>` : ''}
    </div>

    <div class="box">
      <strong style="color: #0F172A; display: block; margin-bottom: 8px;">Items In This Order:</strong>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px;">
        ${items.map((i) => `<li style="padding: 2px 0;"><strong>${i.product_title || 'DVD Item'}</strong> (x${i.quantity || 1})</li>`).join('')}
      </ul>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${viewOrderUrl}" class="btn-action" target="_blank">Track Order Status</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Order Being Processed',
    subtitle: 'Fulfillment Update',
    badgeText: 'Processing',
    badgeColor: '#2563EB',
    badgeBg: '#DBEAFE',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: recipientEmail,
    emailType: 'order_processing',
    subject,
    result,
  });

  try {
    await db.from('orders').update({ processing_email_sent_at: new Date().toISOString() }).eq('id', order.id);
  } catch {
    // Non-blocking
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Customer Payment Receipt (Instant upon payment)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerPaymentReceipt(db, order, { paymentReference, paidAt } = {}) {
  const recipientEmail = order?.email || order?.customer_email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    console.warn('[email] Order has no email recipient, skipping receipt.');
    return { success: false, error: 'No recipient email on order.' };
  }

  // Idempotency: verify whether a customer receipt has already been logged/sent
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'customer_receipt')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      console.log(`[email] Customer receipt already sent for order ${order.id}. Skipping duplicate.`);
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // If table not present yet, proceed
  }

  const items = await resolveOrderItems(db, order);
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedPaidAt = new Date(paidAt || order.paid_at || Date.now()).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const currency = order.currency || 'GBP';
  const subtotalFormatted = formatMoney(order.subtotal || order.total_amount, currency);
  const shippingFormatted = Number(order.shipping_amount) > 0 ? formatMoney(order.shipping_amount, currency) : 'FREE';
  const discountFormatted = Number(order.discount_amount) > 0 ? `-${formatMoney(order.discount_amount, currency)}` : null;
  const totalPaidFormatted = formatMoney(order.total_amount, currency);

  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const addressLines = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.county,
    address.postcode,
    address.country || 'United Kingdom',
  ].filter(Boolean).join('\n');

  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;

  const paymentMethodLabel =
    order.payment_method === 'paypal' || order.payment_provider === 'paypal'
      ? 'PayPal'
      : order.payment_method === 'bank_transfer' || order.payment_provider === 'manual_bank' || order.payment_provider === 'bank_transfer'
        ? 'UK Bank Transfer'
        : 'Credit/Debit Card (Stripe)';

  const subject = `Payment Receipt - DVDs Zone #${order.order_number}`;

  const textBody = `DVDs Zone
Thank you for your purchase.

## ORDER DETAILS
Order Number: #${order.order_number}
Order Date: ${orderDate}
Payment Status: PAID
Payment Method: ${paymentMethodLabel}
Transaction Reference: ${paymentReference || order.payment_reference || 'Confirmed'}

## ITEMS
${items.map((i) => `${(i.product_title || 'DVD Item').padEnd(30, ' ')} x${i.quantity || 1}   ${formatMoney(i.total_price || i.unit_price, currency)}`).join('\n')}

Subtotal:                 ${subtotalFormatted}
Shipping:                 ${shippingFormatted}
${discountFormatted ? `Discount:                ${discountFormatted}\n` : ''}--------------------------------
TOTAL PAID:               ${totalPaidFormatted}

## CUSTOMER
Name: ${customerName}
Email: ${order.email}
Shipping Address:
${addressLines}

## PAYMENT
Status: PAID
Paid At: ${formattedPaidAt}

View your order online:
${viewOrderUrl}

Thank you for shopping with DVDs Zone.
Support: azrayanltd@gmail.com
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 20px;">We have received your payment. Your order is now being processed for delivery.</p>

    <div class="box">
      <table style="width: 100%;">
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Order Number:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #0F172A;">#${order.order_number}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Order Date:</td><td style="text-align: right; font-size: 13px; color: #0F172A;">${orderDate}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Payment Method:</td><td style="text-align: right; font-size: 13px; color: #0F172A;">${paymentMethodLabel}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Transaction Ref:</td><td style="text-align: right; font-family: monospace; font-size: 12px; color: #475569;">${paymentReference || order.payment_reference || 'Confirmed'}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Paid At:</td><td style="text-align: right; font-size: 13px; color: #0F172A;">${formattedPaidAt}</td></tr>
      </table>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
              <td style="font-weight: 600; color: #0F172A;">${item.product_title || 'DVD Item'}<br><span style="font-size: 11px; color: #94A3B8; font-family: monospace;">SKU: ${item.product_sku || 'N/A'}</span></td>
              <td style="text-align: center; color: #475569;">x${item.quantity || 1}</td>
              <td style="text-align: right; font-weight: 600; color: #0F172A;">${formatMoney(item.total_price || item.unit_price, currency)}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div style="border-top: 2px solid #0B0F19; padding-top: 16px; margin-top: 16px;">
      <table style="width: 100%;">
        <tr><td style="color: #64748B; font-size: 14px; padding: 3px 0;">Subtotal:</td><td style="text-align: right; font-size: 14px; color: #0F172A;">${subtotalFormatted}</td></tr>
        <tr><td style="color: #64748B; font-size: 14px; padding: 3px 0;">Delivery (${order.delivery_name || 'Standard'}):</td><td style="text-align: right; font-size: 14px; color: #0F172A;">${shippingFormatted}</td></tr>
        ${discountFormatted ? `<tr><td style="color: #DC2626; font-size: 14px; padding: 3px 0;">Discount:</td><td style="text-align: right; font-size: 14px; color: #DC2626; font-weight: 600;">${discountFormatted}</td></tr>` : ''}
        <tr>
          <td style="font-size: 16px; font-weight: 800; color: #0F172A; padding-top: 10px;">TOTAL PAID:</td>
          <td style="text-align: right; font-size: 18px; font-weight: 800; color: #1E40AF; padding-top: 10px;">${totalPaidFormatted}</td>
        </tr>
      </table>
    </div>

    <div class="box" style="margin-top: 24px;">
      <strong style="color: #0F172A; display: block; margin-bottom: 4px;">Delivery Address:</strong>
      <span style="color: #334155;">${customerName}</span><br>
      <span style="color: #64748B; white-space: pre-line;">${addressLines}</span>
    </div>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${viewOrderUrl}" class="btn-action" target="_blank">View Your Order Details</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Thank you for your purchase',
    subtitle: 'Official Payment Receipt',
    badgeText: 'Paid',
    badgeColor: '#15803D',
    badgeBg: '#DCFCE7',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    recipient: recipientEmail,
    emailType: 'customer_receipt',
    subject,
    result,
  });

  try {
    await db.from('orders').update({ receipt_sent_at: new Date().toISOString() }).eq('id', order.id);
  } catch {
    // Non-blocking
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Admin New Order Alert (Instant notification to store owner)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminNewOrderNotification(db, order) {
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  if (!order) return { success: false, error: 'No order provided.' };

  // Idempotency: verify whether admin was already notified for this order
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'admin_new_order')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const items = await resolveOrderItems(db, order);
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const currency = order.currency || 'GBP';
  const totalFormatted = formatMoney(order.total_amount, currency);
  const address = order.shipping_address || {};
  const customerName = address.full_name || order.email || 'Customer';
  const orderAdminUrl = `${siteUrl}/admin/orders?order=${encodeURIComponent(order.id)}`;

  const subject = `🚨 [New Order] #${order.order_number} - ${totalFormatted} (${customerName})`;

  const textBody = `DVDs Zone Admin Alert
NEW ORDER RECEIVED: #${order.order_number}

Customer: ${customerName} (${order.email})
Payment Status: ${(order.payment_status || 'PAID').toUpperCase()}
Payment Method: ${order.payment_method || order.payment_provider || 'Card'}
Total Amount: ${totalFormatted}
Delivery Tier: ${order.delivery_name || 'Standard UK Delivery'}

Shipping Address:
${[address.address_line_1, address.city, address.postcode, address.country || 'UK'].filter(Boolean).join(', ')}

Items:
${items.map((i) => `• ${i.product_title || 'Item'} (Qty: ${i.quantity || 1}) - ${formatMoney(i.total_price || i.unit_price, currency)}`).join('\n')}

Manage order in Admin Backoffice:
${orderAdminUrl}
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 20px;">A new customer order has been placed on the DVDs Zone storefront.</p>

    <div class="box">
      <table style="width: 100%;">
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Order Number:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #0F172A;">#${order.order_number}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Customer Name:</td><td style="text-align: right; font-weight: 600; font-size: 13px; color: #0F172A;">${customerName}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Customer Email:</td><td style="text-align: right; font-size: 13px; color: #1E40AF;"><a href="mailto:${order.email}" style="color: #1E40AF; text-decoration: none;">${order.email}</a></td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Payment Method:</td><td style="text-align: right; font-size: 13px; color: #0F172A;">${order.payment_method || 'Online'}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Payment Status:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: ${order.payment_status === 'paid' ? '#15803D' : '#D97706'};">${(order.payment_status || 'paid').toUpperCase()}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Order Total:</td><td style="text-align: right; font-weight: 800; font-size: 15px; color: #1E40AF;">${totalFormatted}</td></tr>
      </table>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Ordered Items</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
              <td style="font-weight: 600; color: #0F172A;">${item.product_title || 'DVD Item'}<br><span style="font-size: 11px; color: #94A3B8;">SKU: ${item.product_sku || 'N/A'}</span></td>
              <td style="text-align: center; color: #475569;">x${item.quantity || 1}</td>
              <td style="text-align: right; font-weight: 600; color: #0F172A;">${formatMoney(item.total_price || item.unit_price, currency)}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div class="box">
      <strong style="color: #0F172A; display: block; margin-bottom: 4px;">Delivery Address:</strong>
      <span style="color: #64748B; white-space: pre-line;">${[address.full_name, address.address_line_1, address.address_line_2, address.city, address.postcode, address.country || 'UK'].filter(Boolean).join('\n')}</span>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${orderAdminUrl}" class="btn-action" target="_blank">View Order in Backoffice</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'New Customer Order Received',
    subtitle: 'Store Backoffice Notification',
    badgeText: order.payment_status === 'paid' ? 'Paid Order' : 'Order Placed',
    badgeColor: '#1E40AF',
    badgeBg: '#DBEAFE',
    contentHtml,
  });

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    recipient: adminEmail,
    emailType: 'admin_new_order',
    subject,
    result,
  });

  try {
    await db.from('orders').update({ admin_notified_at: new Date().toISOString() }).eq('id', order.id);
  } catch {
    // Non-blocking
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Customer Order Dispatched / Shipped Email
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderDispatched(db, order, { carrier = 'Royal Mail', trackingNumber, trackingUrl, note } = {}) {
  const recipientEmail = order?.email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Idempotency: verify whether dispatch email was already sent
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'order_dispatched')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const items = await resolveOrderItems(db, order);
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const effectiveCarrier = carrier || order.carrier || 'Royal Mail';
  const effectiveTracking = trackingNumber || order.tracking_number || '';
  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;
  const effectiveTrackingUrl =
    trackingUrl ||
    (effectiveCarrier.toLowerCase().includes('royal')
      ? `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(effectiveTracking)}`
      : viewOrderUrl);

  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const subject = `📦 Your Order Has Been Dispatched! - DVDs Zone #${order.order_number}`;

  const textBody = `DVDs Zone
Your order #${order.order_number} is on its way!

Carrier: ${effectiveCarrier}
${effectiveTracking ? `Tracking Number: ${effectiveTracking}\n` : ''}Track Delivery: ${effectiveTrackingUrl}

Delivery Address:
${customerName}
${[address.address_line_1, address.city, address.postcode, address.country || 'UK'].filter(Boolean).join('\n')}

Dispatched Items:
${items.map((i) => `• ${i.product_title || 'Item'} (x${i.quantity || 1})`).join('\n')}

${note ? `Note from dispatch team: ${note}\n` : ''}
Track progress anytime:
${viewOrderUrl}
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 20px;">Great news! Your package has been securely packed and handed over to the courier for delivery.</p>

    <div class="box" style="background: #F0FDF4; border-color: #BBF7D0;">
      <table style="width: 100%;">
        <tr><td style="color: #166534; font-size: 13px; padding: 4px 0; font-weight: 600;">Delivery Service:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #14532D;">${effectiveCarrier}</td></tr>
        ${
          effectiveTracking
            ? `<tr><td style="color: #166534; font-size: 13px; padding: 4px 0; font-weight: 600;">Tracking Number:</td><td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 13px; color: #15803D;">${effectiveTracking}</td></tr>`
            : ''
        }
        <tr><td style="color: #166534; font-size: 13px; padding: 4px 0; font-weight: 600;">Order Reference:</td><td style="text-align: right; font-size: 13px; color: #14532D;">#${order.order_number}</td></tr>
      </table>
    </div>

    ${
      effectiveTracking
        ? `<div style="text-align: center; margin: 24px 0;">
            <a href="${effectiveTrackingUrl}" class="btn-action" target="_blank" style="background: #16A34A;">Track Your Package</a>
          </div>`
        : ''
    }

    <div class="box">
      <strong style="color: #0F172A; display: block; margin-bottom: 4px;">Delivering To:</strong>
      <span style="color: #334155;">${customerName}</span><br>
      <span style="color: #64748B; white-space: pre-line;">${[address.address_line_1, address.address_line_2, address.city, address.postcode, address.country || 'UK'].filter(Boolean).join('\n')}</span>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Items in this Shipment</th>
          <th style="text-align: center;">Qty</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
              <td style="font-weight: 600; color: #0F172A;">${item.product_title || 'DVD Item'}</td>
              <td style="text-align: center; color: #475569;">x${item.quantity || 1}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${viewOrderUrl}" style="color: #1E40AF; font-size: 13px; font-weight: 600; text-decoration: none;">View Order Details Online &rarr;</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Your Order Has Been Dispatched',
    subtitle: 'Shipping & Delivery Confirmation',
    badgeText: 'Dispatched',
    badgeColor: '#166534',
    badgeBg: '#DCFCE7',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    recipient: recipientEmail,
    emailType: 'order_dispatched',
    subject,
    result,
  });

  try {
    await db.from('orders').update({
      dispatch_email_sent_at: new Date().toISOString(),
      dispatched_at: new Date().toISOString(),
      tracking_carrier: effectiveCarrier,
      tracking_number: effectiveTracking || null,
    }).eq('id', order.id);
  } catch {
    // Non-blocking
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Customer Bank Transfer Payment Instructions
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerBankTransferInstructions(db, order) {
  const recipientEmail = order?.email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  const bank = order.bank_details || {};
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const currency = order.currency || 'GBP';
  const totalFormatted = formatMoney(order.total_amount, currency);
  const uploadProofUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;

  const subject = `Action Required: Bank Transfer Instructions - DVDs Zone #${order.order_number}`;

  const textBody = `DVDs Zone
Thank you for your order #${order.order_number}.

To complete your order, please transfer the exact total of ${totalFormatted} using the details below:

Bank Name:       ${bank.bank_name || 'Lloyds Bank'}
Account Name:    ${bank.bank_account_name || 'DVDs Zone / AZ Rayan Ltd'}
Sort Code:       ${bank.bank_sort_code || '30-90-89'}
Account Number:  ${bank.bank_account_number || '42318960'}
${bank.bank_iban ? `IBAN:            ${bank.bank_iban}\n` : ''}Payment Ref:     ${order.order_number}

IMPORTANT: Please enter "${order.order_number}" in your bank transfer reference so we can allocate your payment instantly.

Once transferred, upload your payment receipt here:
${uploadProofUrl}
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 20px;">Thank you for your order! Your physical media items have been reserved. Please transfer the total amount using the bank details below.</p>

    <div class="box" style="background: #EFF6FF; border-color: #BFDBFE;">
      <h3 style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; color: #1E40AF; letter-spacing: 0.5px;">UK Bank Transfer Details</h3>
      <table style="width: 100%;">
        <tr><td style="color: #1E40AF; font-size: 13px; padding: 4px 0; font-weight: 600;">Bank Name:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #0F172A;">${bank.bank_name || 'Lloyds Bank'}</td></tr>
        <tr><td style="color: #1E40AF; font-size: 13px; padding: 4px 0; font-weight: 600;">Account Name:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #0F172A;">${bank.bank_account_name || 'DVDs Zone / AZ Rayan Ltd'}</td></tr>
        <tr><td style="color: #1E40AF; font-size: 13px; padding: 4px 0; font-weight: 600;">Sort Code:</td><td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 15px; color: #1E40AF;">${bank.bank_sort_code || '30-90-89'}</td></tr>
        <tr><td style="color: #1E40AF; font-size: 13px; padding: 4px 0; font-weight: 600;">Account Number:</td><td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 15px; color: #1E40AF;">${bank.bank_account_number || '42318960'}</td></tr>
        ${bank.bank_iban ? `<tr><td style="color: #1E40AF; font-size: 13px; padding: 4px 0; font-weight: 600;">IBAN:</td><td style="text-align: right; font-family: monospace; font-size: 12px; color: #0F172A;">${bank.bank_iban}</td></tr>` : ''}
        <tr><td style="color: #DC2626; font-size: 13px; padding: 6px 0; font-weight: 700;">Payment Reference:</td><td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 14px; color: #DC2626;">${order.order_number}</td></tr>
        <tr><td style="color: #1E40AF; font-size: 14px; padding: 8px 0 0; font-weight: 800; border-top: 1px solid #BFDBFE;">Total to Pay:</td><td style="text-align: right; font-weight: 800; font-size: 18px; color: #1E40AF; border-top: 1px solid #BFDBFE;">${totalFormatted}</td></tr>
      </table>
    </div>

    <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px; margin: 16px 0; font-size: 12px; color: #92400E; line-height: 1.5;">
      <strong>Important:</strong> Please ensure you include <strong>#${order.order_number}</strong> as the payment reference so our system can instantly match your transfer.
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${uploadProofUrl}" class="btn-action" target="_blank">Upload Transfer Receipt</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Bank Transfer Payment Instructions',
    subtitle: 'Awaiting Bank Transfer',
    badgeText: 'Action Required',
    badgeColor: '#B45309',
    badgeBg: '#FEF3C7',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    recipient: recipientEmail,
    emailType: 'bank_transfer_instructions',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Admin Payment Proof Upload Alert
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminPaymentProofNotification(db, order, { fileName } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  if (!order) return { success: false, error: 'No order provided.' };

  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const currency = order.currency || 'GBP';
  const totalFormatted = formatMoney(order.total_amount, currency);
  const orderAdminUrl = `${siteUrl}/admin/orders?order=${encodeURIComponent(order.id)}`;

  const subject = `💳 [Payment Proof Uploaded] Order #${order.order_number} (${totalFormatted})`;

  const textBody = `DVDs Zone Admin Alert
PAYMENT PROOF SUBMITTED FOR ORDER: #${order.order_number}

Customer: ${order.email}
Total: ${totalFormatted}
File: ${fileName || 'receipt image'}

Please verify the bank payment and confirm the order in the backoffice:
${orderAdminUrl}
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 20px;">Customer has uploaded a payment proof receipt for order <strong>#${order.order_number}</strong>.</p>

    <div class="box">
      <table style="width: 100%;">
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Order Number:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #0F172A;">#${order.order_number}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Customer:</td><td style="text-align: right; font-size: 13px; color: #1E40AF;">${order.email}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Amount:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #0F172A;">${totalFormatted}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Uploaded File:</td><td style="text-align: right; font-family: monospace; font-size: 12px; color: #475569;">${fileName || 'proof receipt'}</td></tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${orderAdminUrl}" class="btn-action" target="_blank">Review & Confirm Payment</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Payment Proof Uploaded',
    subtitle: 'Store Backoffice Action',
    badgeText: 'Review Required',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    contentHtml,
  });

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    recipient: adminEmail,
    emailType: 'payment_proof_uploaded',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Customer Order Cancellation Email
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderCancelled(db, order, { reason } = {}) {
  const recipientEmail = order?.email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const currency = order.currency || 'GBP';
  const totalFormatted = formatMoney(order.total_amount, currency);
  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;
  const cancelReason = reason || 'Order cancelled upon administrative review.';

  const subject = `Order Cancelled - DVDs Zone #${order.order_number}`;

  const textBody = `DVDs Zone
Your order #${order.order_number} has been cancelled.

Reason: ${cancelReason}
Amount: ${totalFormatted}

${order.payment_status === 'paid' ? 'If payment was received, your refund has been initiated to your original payment method and will appear in 3-5 working days.\n' : ''}
If you have questions, please contact azrayanltd@gmail.com.
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 20px;">We are writing to let you know that your order <strong>#${order.order_number}</strong> has been cancelled.</p>

    <div class="box" style="background: #FEF2F2; border-color: #FECACA;">
      <strong style="color: #991B1B; font-size: 13px; display: block; margin-bottom: 4px;">Reason for Cancellation:</strong>
      <p style="color: #7F1D1D; margin: 0; font-size: 13px;">${cancelReason}</p>
    </div>

    ${
      order.payment_status === 'paid'
        ? `<div class="box">
            <strong style="color: #0F172A; font-size: 13px; display: block; margin-bottom: 4px;">Refund Information:</strong>
            <p style="color: #64748B; margin: 0; font-size: 13px;">A full refund of <strong>${totalFormatted}</strong> has been issued to your original payment method. Depending on your bank or card issuer, funds will appear within 3-5 business days.</p>
          </div>`
        : ''
    }

    <div style="text-align: center; margin-top: 24px;">
      <a href="${viewOrderUrl}" class="btn-action" target="_blank" style="background: #475569;">View Order Status</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Order Cancelled',
    subtitle: 'Order Status Update',
    badgeText: 'Cancelled',
    badgeColor: '#B91C1C',
    badgeBg: '#FEE2E2',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: recipientEmail,
    emailType: 'order_cancelled',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.1 Customer Order Refund Confirmation (Strictly after confirmed refund)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderRefunded(db, order, { refundAmount, currency, refundReference, reason } = {}) {
  const recipientEmail = order?.email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Durable Idempotency
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'order_refunded')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      console.log(`[email] Refund email already sent for order ${order.id}. Skipping duplicate.`);
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const effectiveCurrency = currency || order.currency || 'GBP';
  const effectiveAmount = refundAmount != null ? refundAmount : order.refunded_amount || order.total_amount;
  const amountFormatted = formatMoney(effectiveAmount, effectiveCurrency);
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;
  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const subject = `Refund Confirmation - DVDs Zone #${order.order_number}`;

  const textBody = `DVDs Zone - Refund Confirmation
Order Number: #${order.order_number}
Refund Amount: ${amountFormatted}
${refundReference ? `Refund Reference: ${refundReference}\n` : ''}${reason ? `Reason: ${reason}\n` : ''}
We have successfully processed a refund to your original payment method.
Depending on your payment provider or issuing bank, the credit will appear on your statement within 3-5 business days.

View updated order summary:
${viewOrderUrl}
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 16px;">
      Hello <strong>${customerName}</strong>, this is confirmation that a refund has been issued for your order <strong>#${order.order_number}</strong>.
    </p>

    <div class="box" style="background: #ECFDF5; border-color: #A7F3D0;">
      <table style="width: 100%;">
        <tr>
          <td style="color: #065F46; font-size: 13px; padding: 4px 0;">Refund Amount:</td>
          <td style="text-align: right; font-weight: 800; font-size: 16px; color: #047857;">${amountFormatted}</td>
        </tr>
        <tr>
          <td style="color: #065F46; font-size: 13px; padding: 4px 0;">Order Reference:</td>
          <td style="text-align: right; font-size: 13px; color: #065F46;">#${order.order_number}</td>
        </tr>
        ${
          refundReference
            ? `<tr>
                <td style="color: #065F46; font-size: 13px; padding: 4px 0;">Transaction Ref:</td>
                <td style="text-align: right; font-family: monospace; font-size: 12px; color: #047857;">${refundReference}</td>
              </tr>`
            : ''
        }
      </table>
      <p style="margin: 10px 0 0; font-size: 12px; color: #047857; line-height: 1.4;">
        Funds have been returned to your original payment method. Depending on your bank or credit card company, this typically reflects within 3-5 business days.
      </p>
    </div>

    ${reason ? `<div class="box"><strong style="color: #0F172A; font-size: 13px; display: block; margin-bottom: 4px;">Refund Note:</strong><p style="color: #475569; margin: 0; font-size: 13px;">${reason}</p></div>` : ''}

    <div style="text-align: center; margin-top: 24px;">
      <a href="${viewOrderUrl}" class="btn-action" target="_blank" style="background: #047857;">View Updated Order</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Refund Processed',
    subtitle: 'Payment Adjustment',
    badgeText: 'Refunded',
    badgeColor: '#047857',
    badgeBg: '#D1FAE5',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: recipientEmail,
    emailType: 'order_refunded',
    subject,
    result,
  });

  try {
    await db.from('orders').update({ refund_email_sent_at: new Date().toISOString() }).eq('id', order.id);
  } catch {
    // Non-blocking
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Admin Verified Payment Notification
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminPaymentVerifiedAlert(db, order, { paymentReference, amount, currency, provider } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  if (!order) return { success: false, error: 'No order provided.' };

  // Durable Idempotency
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'admin_payment_verified')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      console.log(`[email] Admin payment verified alert already sent for order ${order.id}. Skipping duplicate.`);
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const items = await resolveOrderItems(db, order);
  const effectiveCurrency = currency || order.currency || 'GBP';
  const effectiveAmount = amount != null ? amount : order.total_amount;
  const amountFormatted = formatMoney(effectiveAmount, effectiveCurrency);
  const effectiveProvider = provider || order.payment_provider || 'Payment Gateway';
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const adminOrderUrl = `${siteUrl}/admin/orders`;

  const subject = `💰 [Payment Verified] #${order.order_number} - ${amountFormatted} (${effectiveProvider})`;

  const textBody = `DVDs Zone Admin Alert - Payment Verified
Order: #${order.order_number}
Amount: ${amountFormatted}
Provider: ${effectiveProvider}
Payment Reference: ${paymentReference || order.payment_reference || 'N/A'}
Customer: ${order.email}

Items:
${items.map((i) => `• ${i.product_title || 'Item'} (x${i.quantity || 1})`).join('\n')}

Manage in Admin Panel:
${adminOrderUrl}
`;

  const contentHtml = `
    <div class="box" style="background: #F0FDF4; border-color: #BBF7D0;">
      <table style="width: 100%;">
        <tr>
          <td style="color: #166534; font-size: 13px; padding: 4px 0;">Verified Amount:</td>
          <td style="text-align: right; font-weight: 800; font-size: 18px; color: #15803D;">${amountFormatted}</td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 13px; padding: 4px 0;">Order Reference:</td>
          <td style="text-align: right; font-weight: 700; font-size: 14px; color: #0F172A;">#${order.order_number}</td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 13px; padding: 4px 0;">Gateway Provider:</td>
          <td style="text-align: right; font-size: 13px; color: #15803D; font-weight: 600;">${effectiveProvider}</td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 13px; padding: 4px 0;">Transaction Ref:</td>
          <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0F172A;">${paymentReference || order.payment_reference || 'N/A'}</td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 13px; padding: 4px 0;">Customer Email:</td>
          <td style="text-align: right; font-size: 13px; color: #1E40AF;"><a href="mailto:${order.email}" style="color: #1E40AF;">${order.email}</a></td>
        </tr>
      </table>
    </div>

    <div class="box">
      <strong style="color: #0F172A; display: block; margin-bottom: 8px;">Purchased Items:</strong>
      <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px;">
        ${items.map((i) => `<li style="padding: 2px 0;">${i.product_title || 'Item'} (x${i.quantity || 1}) - <strong>${formatMoney(i.total_price || i.unit_price, effectiveCurrency)}</strong></li>`).join('')}
      </ul>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${adminOrderUrl}" class="btn-action" target="_blank" style="background: #15803D;">Open in Admin Orders</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Payment Received & Verified',
    subtitle: 'Financial Notification',
    badgeText: 'Verified Paid',
    badgeColor: '#15803D',
    badgeBg: '#DCFCE7',
    contentHtml,
  });

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: adminEmail,
    emailType: 'admin_payment_verified',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Admin Payment Failure Alert
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminPaymentFailedAlert(db, order, { errorReason, provider, paymentReference } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  if (!order) return { success: false, error: 'No order provided.' };

  const effectiveProvider = provider || order.payment_provider || 'Payment Gateway';
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const adminOrderUrl = `${siteUrl}/admin/orders`;
  const currency = order.currency || 'GBP';
  const totalFormatted = formatMoney(order.total_amount, currency);

  const subject = `⚠️ [Payment Failed] #${order.order_number} - ${effectiveProvider}`;

  const textBody = `DVDs Zone Admin Alert - Payment Failed
Order Reference: #${order.order_number}
Attempted Total: ${totalFormatted}
Provider: ${effectiveProvider}
Payment Reference: ${paymentReference || order.payment_reference || 'N/A'}
Customer Email: ${order.email}
Error Reason: ${errorReason || 'Payment declined or asynchronous failure'}

Review order in Admin Panel:
${adminOrderUrl}
`;

  const contentHtml = `
    <div class="box" style="background: #FEF2F2; border-color: #FECACA;">
      <table style="width: 100%;">
        <tr>
          <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Order Reference:</td>
          <td style="text-align: right; font-weight: 700; font-size: 14px; color: #7F1D1D;">#${order.order_number}</td>
        </tr>
        <tr>
          <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Attempted Amount:</td>
          <td style="text-align: right; font-weight: 700; font-size: 14px; color: #7F1D1D;">${totalFormatted}</td>
        </tr>
        <tr>
          <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Provider:</td>
          <td style="text-align: right; font-size: 13px; color: #7F1D1D;">${effectiveProvider}</td>
        </tr>
        <tr>
          <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Failure Code:</td>
          <td style="text-align: right; font-family: monospace; font-size: 12px; color: #DC2626;">${errorReason || 'Payment declined / async failure'}</td>
        </tr>
        <tr>
          <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Customer:</td>
          <td style="text-align: right; font-size: 13px; color: #1E40AF;"><a href="mailto:${order.email}" style="color: #1E40AF;">${order.email}</a></td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${adminOrderUrl}" class="btn-action" target="_blank" style="background: #DC2626;">Inspect in Admin Orders</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Payment Processing Alert',
    subtitle: 'Payment Failure Notification',
    badgeText: 'Payment Failed',
    badgeColor: '#DC2626',
    badgeBg: '#FEE2E2',
    contentHtml,
  });

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: adminEmail,
    emailType: 'admin_payment_failed',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Admin Refund Notification
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminRefundAlert(db, order, { refundAmount, currency, refundReference, provider, reason } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  if (!order) return { success: false, error: 'No order provided.' };

  const effectiveCurrency = currency || order.currency || 'GBP';
  const effectiveAmount = refundAmount != null ? refundAmount : order.refunded_amount || order.total_amount;
  const amountFormatted = formatMoney(effectiveAmount, effectiveCurrency);
  const effectiveProvider = provider || order.payment_provider || 'Payment Gateway';
  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const adminOrderUrl = `${siteUrl}/admin/orders`;

  const subject = `🔄 [Refund Processed] #${order.order_number} - ${amountFormatted} (${effectiveProvider})`;

  const textBody = `DVDs Zone Admin Alert - Refund Confirmed
Order Reference: #${order.order_number}
Refund Amount: ${amountFormatted}
Provider: ${effectiveProvider}
Refund Reference: ${refundReference || 'N/A'}
Customer: ${order.email}
${reason ? `Reason: ${reason}\n` : ''}
Manage orders:
${adminOrderUrl}
`;

  const contentHtml = `
    <div class="box" style="background: #FFFBEB; border-color: #FDE68A;">
      <table style="width: 100%;">
        <tr>
          <td style="color: #92400E; font-size: 13px; padding: 4px 0;">Refunded Amount:</td>
          <td style="text-align: right; font-weight: 800; font-size: 16px; color: #B45309;">${amountFormatted}</td>
        </tr>
        <tr>
          <td style="color: #92400E; font-size: 13px; padding: 4px 0;">Order Reference:</td>
          <td style="text-align: right; font-weight: 700; font-size: 14px; color: #0F172A;">#${order.order_number}</td>
        </tr>
        <tr>
          <td style="color: #92400E; font-size: 13px; padding: 4px 0;">Provider:</td>
          <td style="text-align: right; font-size: 13px; color: #92400E;">${effectiveProvider}</td>
        </tr>
        <tr>
          <td style="color: #92400E; font-size: 13px; padding: 4px 0;">Refund Reference:</td>
          <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0F172A;">${refundReference || 'N/A'}</td>
        </tr>
        <tr>
          <td style="color: #92400E; font-size: 13px; padding: 4px 0;">Customer:</td>
          <td style="text-align: right; font-size: 13px; color: #1E40AF;"><a href="mailto:${order.email}" style="color: #1E40AF;">${order.email}</a></td>
        </tr>
      </table>
      ${reason ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #FDE68A; font-size: 12px; color: #92400E;"><strong>Reason:</strong> ${reason}</div>` : ''}
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${adminOrderUrl}" class="btn-action" target="_blank" style="background: #D97706;">Review in Admin Orders</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Refund Executed',
    subtitle: 'Financial Notification',
    badgeText: 'Refunded',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    contentHtml,
  });

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: adminEmail,
    emailType: 'admin_refund_alert',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Admin Email Delivery Failure Alert (Strictly Anti-Recursive)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminEmailDeliveryAlert(db, { failedRecipient, emailType, subject, errorReason, orderNumber = null } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  // Skip if failed email is an administrative alert or test to avoid recursion or spam
  if (['admin_email_failure_alert', 'admin_report', 'test_email'].includes(emailType) || emailType.startsWith('admin_')) {
    return { success: false, skipped: true };
  }

  const alertSubject = `⚠️ [Delivery Alert] Failed to deliver ${emailType} to ${failedRecipient}`;
  const textBody = `DVDs Zone - Transactional Email Delivery Failure
Time: ${new Date().toISOString()}
Recipient: ${failedRecipient}
Type: ${emailType}
Subject: ${subject}
Order: ${orderNumber ? `#${orderNumber}` : 'N/A'}
Error: ${errorReason || 'Unknown gateway rejection'}

Please verify Mailtrap gateway status or review application logs.
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 16px;">
      A customer transactional email could not be delivered by the active email gateway.
    </p>

    <div class="box" style="background: #FEF2F2; border-color: #FECACA;">
      <table style="width: 100%;">
        <tr>
          <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Target Recipient:</td>
          <td style="text-align: right; font-weight: 700; font-size: 13px; color: #7F1D1D;">${failedRecipient}</td>
        </tr>
        <tr>
          <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Email Type:</td>
          <td style="text-align: right; font-size: 13px; color: #7F1D1D;">${emailType}</td>
        </tr>
        ${
          orderNumber
            ? `<tr>
                <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Order:</td>
                <td style="text-align: right; font-weight: 700; font-size: 13px; color: #7F1D1D;">#${orderNumber}</td>
              </tr>`
            : ''
        }
        <tr>
          <td style="color: #991B1B; font-size: 13px; padding: 4px 0;">Gateway Error:</td>
          <td style="text-align: right; font-family: monospace; font-size: 12px; color: #DC2626;">${errorReason || 'Gateway rejected payload'}</td>
        </tr>
      </table>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Email Delivery Failure',
    subtitle: 'Gateway Operational Alert',
    badgeText: 'Alert',
    badgeColor: '#DC2626',
    badgeBg: '#FEE2E2',
    contentHtml,
  });

  // Critical anti-recursion: pass isInternalAlert: true
  const result = await sendEmail({
    to: adminEmail,
    subject: alertSubject,
    html: htmlBody,
    text: textBody,
    isInternalAlert: true,
  });

  // Log failure alert with type admin_email_failure_alert so logEmailAttempt NEVER loops
  if (db) {
    await db.from('email_logs').insert({
      recipient: adminEmail,
      email_type: 'admin_email_failure_alert',
      subject: alertSubject,
      status: result.success ? (result.simulated ? 'simulated' : 'sent') : 'failed',
      error_message: result.error || null,
      provider: result.provider || null,
    }).catch(() => {});
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Customer Welcome Email (Triggered upon successful registration)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerWelcomeEmail(db, user) {
  const recipientEmail = user?.email;
  if (!user || !recipientEmail) {
    return { success: false, error: 'No recipient email on user.' };
  }

  // Durable Idempotency
  if (db && user.id) {
    try {
      const { data: existingLog } = await db
        .from('email_logs')
        .select('id')
        .eq('recipient', recipientEmail)
        .eq('email_type', 'customer_welcome')
        .in('status', ['sent', 'simulated'])
        .maybeSingle();

      if (existingLog) {
        console.log(`[email] Welcome email already sent for user ${recipientEmail}. Skipping duplicate.`);
        return { success: true, duplicate_skipped: true };
      }
    } catch {
      // Non-blocking
    }
  }

  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const customerName = user.full_name || user.fullName || recipientEmail.split('@')[0];
  const subject = `Welcome to DVDs Zone UK, ${customerName}!`;

  const textBody = `Welcome to DVDs Zone UK!
Hello ${customerName},

Thank you for creating an account with DVDs Zone UK. Your account is now active and ready for use.

What you can do with your account:
- Browse our collection of curated classic, vintage, and rare DVD titles.
- Enjoy rapid checkout with saved shipping preferences.
- Track order processing, dispatched parcels, and Royal Mail tracking numbers in real-time.
- Access your order history and downloadable payment receipts anytime.

Explore the Shop:
${siteUrl}/shop

Your Account Dashboard:
${siteUrl}/account

Customer Support:
If you need any assistance, have questions regarding DVD region codes (UK Region 2 / Multi-Region), or need help finding a rare title, reply to this email or contact us at azrayanltd@gmail.com.

Warm regards,
The DVDs Zone Team
https://dvds-zone.co.uk
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 16px;">
      Hello <strong>${customerName}</strong>,
    </p>
    <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      Welcome to <strong>DVDs Zone UK</strong>! We are delighted to have you join our community of movie lovers and collectors. Your account is active and you can now explore our curated catalog of rare, classic, and collector-edition DVDs.
    </p>

    <div class="box" style="background: #F8FAFC; border-color: #E2E8F0;">
      <h3 style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;">
        Your Account Privileges
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.8;">
        <li>Fast, secure checkout with encrypted address storage</li>
        <li>Live tracking updates with Royal Mail carrier integration</li>
        <li>Instant access to payment receipts and VAT invoices</li>
        <li>Dedicated customer care and assistance with rare disc inquiries</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${siteUrl}/shop" class="btn-action" target="_blank" style="background: #1E40AF; padding: 14px 32px; font-size: 14px;">Browse the DVD Store</a>
    </div>

    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 14px; font-size: 12px; color: #1E40AF; line-height: 1.5;">
      <strong>Did you know?</strong> All of our DVDs are official UK Region 2 or Region 0 (All-Region) releases inspected for disc playback quality prior to fulfillment.
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Welcome to DVDs Zone',
    subtitle: 'Account Activated',
    badgeText: 'Member',
    badgeColor: '#1E40AF',
    badgeBg: '#DBEAFE',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    recipient: recipientEmail,
    emailType: 'customer_welcome',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Customer Password Reset Email (Secure, time-limited recovery link)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerPasswordResetEmail(db, { email, resetUrl, fullName } = {}) {
  const recipientEmail = email?.trim().toLowerCase();
  if (!recipientEmail || !resetUrl) {
    return { success: false, error: 'Recipient email and reset URL are required.' };
  }

  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const customerName = fullName || recipientEmail.split('@')[0];
  const subject = `Reset Your DVDs Zone Password`;

  const textBody = `DVDs Zone - Password Reset Request
Hello ${customerName},

We received a request to reset the password for your DVDs Zone customer account (${recipientEmail}).

To set a new password, open this secure link in your browser:
${resetUrl}

SECURITY NOTICE:
- This password reset link is single-use and expires in 1 hour.
- If you did not request a password reset, you can safely ignore this email. Your account remains completely secure and your current password has not been changed.
- DVDs Zone staff will never ask for your password or reset link.

If you have questions, please reach out to azrayanltd@gmail.com.
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 16px;">
      Hello <strong>${customerName}</strong>,
    </p>
    <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      We received a request to reset the password for your account associated with <strong>${recipientEmail}</strong>. Click the button below to choose a new password:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn-action" target="_blank" style="background: #1E40AF; padding: 14px 32px; font-size: 14px;">Reset Password</a>
    </div>

    <div class="box" style="background: #FEF3C7; border-color: #FDE68A;">
      <strong style="color: #92400E; font-size: 12px; display: block; margin-bottom: 4px;">Security Information:</strong>
      <ul style="margin: 0; padding-left: 20px; color: #92400E; font-size: 12px; line-height: 1.6;">
        <li>This link is cryptographically signed, valid for <strong>1 hour</strong>, and can only be used once.</li>
        <li>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</li>
      </ul>
    </div>

    <p style="color: #94A3B8; font-size: 12px; margin-top: 16px; word-break: break-all;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #1E40AF;">${resetUrl}</a>
    </p>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Password Reset Request',
    subtitle: 'Account Security',
    badgeText: 'Action Required',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    recipient: recipientEmail,
    emailType: 'customer_password_reset',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Customer Password Reset Confirmation (After password has changed)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerPasswordResetConfirmation(db, { email, fullName, changedAt } = {}) {
  const recipientEmail = email?.trim().toLowerCase();
  if (!recipientEmail) {
    return { success: false, error: 'Recipient email is required.' };
  }

  const siteUrl = process.env.SITE_URL || 'https://dvds-zone.co.uk';
  const customerName = fullName || recipientEmail.split('@')[0];
  const timestamp = changedAt || new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });
  const subject = `Security Alert: Your DVDs Zone Password Has Been Changed`;

  const textBody = `DVDs Zone - Security Notification
Hello ${customerName},

The password for your DVDs Zone customer account (${recipientEmail}) was successfully changed on:
${timestamp}

If you made this change, no further action is required. You can now log in using your new credentials:
${siteUrl}/login

IMPORTANT CAUTION:
If you did NOT make this change or suspect unauthorized access to your account, please contact our security team immediately at azrayanltd@gmail.com so we can secure your account.

DVDs Zone Team
https://dvds-zone.co.uk
`;

  const contentHtml = `
    <p style="color: #64748B; font-size: 14px; margin: 8px 0 16px;">
      Hello <strong>${customerName}</strong>,
    </p>
    <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      This email confirms that the password for your account (<strong>${recipientEmail}</strong>) was successfully updated on <strong>${timestamp}</strong>.
    </p>

    <div class="box" style="background: #ECFDF5; border-color: #A7F3D0;">
      <table style="width: 100%;">
        <tr>
          <td style="color: #065F46; font-size: 13px; padding: 4px 0;">Account:</td>
          <td style="text-align: right; font-weight: 700; font-size: 13px; color: #047857;">${recipientEmail}</td>
        </tr>
        <tr>
          <td style="color: #065F46; font-size: 13px; padding: 4px 0;">Timestamp:</td>
          <td style="text-align: right; font-size: 13px; color: #065F46;">${timestamp}</td>
        </tr>
        <tr>
          <td style="color: #065F46; font-size: 13px; padding: 4px 0;">Status:</td>
          <td style="text-align: right; font-weight: 800; font-size: 13px; color: #047857;">Password Updated</td>
        </tr>
      </table>
    </div>

    <div class="box" style="background: #FEF2F2; border-color: #FECACA;">
      <strong style="color: #991B1B; font-size: 12px; display: block; margin-bottom: 4px;">Did not make this change?</strong>
      <p style="color: #7F1D1D; margin: 0; font-size: 12px; line-height: 1.5;">
        If you did not initiate this change, someone else may have accessed your account. Please contact our administrative support immediately at <a href="mailto:azrayanltd@gmail.com" style="color: #991B1B; font-weight: 700;">azrayanltd@gmail.com</a>.
      </p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${siteUrl}/login" class="btn-action" target="_blank" style="background: #1E40AF; padding: 12px 28px;">Go to Sign In</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Password Changed',
    subtitle: 'Security Alert',
    badgeText: 'Updated',
    badgeColor: '#059669',
    badgeBg: '#D1FAE5',
    contentHtml,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    recipient: recipientEmail,
    emailType: 'customer_password_changed',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Customer Support / Contact Message Notifications
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminContactInquiry(db, { name, email, order_reference, message }) {
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  const cleanEmail = email.trim();
  const cleanName = name.trim();
  const subject = `💬 [Customer Inquiry] ${cleanName}${order_reference ? ` (Order #${order_reference})` : ''}`;

  const textBody = `DVDs Zone Customer Inquiry
From: ${cleanName} (${cleanEmail})
${order_reference ? `Order Reference: #${order_reference}\n` : ''}
Message:
${message}

You can reply directly to this email to respond to the customer.
`;

  const contentHtml = `
    <div class="box">
      <table style="width: 100%;">
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Customer Name:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #0F172A;">${cleanName}</td></tr>
        <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Customer Email:</td><td style="text-align: right; font-size: 13px; color: #1E40AF;"><a href="mailto:${cleanEmail}" style="color: #1E40AF;">${cleanEmail}</a></td></tr>
        ${order_reference ? `<tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Order Ref:</td><td style="text-align: right; font-weight: 700; font-size: 13px; color: #0F172A;">#${order_reference}</td></tr>` : ''}
      </table>
    </div>

    <div class="box" style="background: #F8FAFC; border-left: 4px solid #1E40AF;">
      <strong style="color: #0F172A; display: block; margin-bottom: 8px;">Message:</strong>
      <p style="color: #334155; margin: 0; font-size: 14px; white-space: pre-wrap; line-height: 1.6;">${message}</p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="mailto:${cleanEmail}?subject=Re: Inquiry - DVDs Zone" class="btn-action">Reply to Customer</a>
    </div>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'New Customer Support Message',
    subtitle: 'Store Inquiry',
    badgeText: 'Support',
    badgeColor: '#1E40AF',
    badgeBg: '#DBEAFE',
    contentHtml,
  });

  const result = await sendEmail({
    to: adminEmail,
    replyTo: cleanEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    recipient: adminEmail,
    emailType: 'contact_inquiry',
    subject,
    result,
  });

  return result;
}

export async function sendCustomerContactAutoReply(db, { name, email, order_reference, message }) {
  const cleanEmail = email.trim();
  const cleanName = name.trim();
  const subject = `We've received your message - DVDs Zone Support`;

  const textBody = `Hello ${cleanName},

Thank you for reaching out to DVDs Zone.
We have received your message regarding:
"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"

Our customer service team is reviewing your inquiry and will get back to you within 24 business hours.

Best regards,
DVDs Zone Support Team
azrayanltd@gmail.com
`;

  const contentHtml = `
    <p style="color: #334155; font-size: 14px; margin: 0 0 16px;">Hello ${cleanName},</p>
    <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
      Thank you for contacting DVDs Zone. We have received your inquiry and our UK customer support team is on it. We typically reply within 24 hours.
    </p>

    <div class="box" style="background: #F8FAFC; border-left: 4px solid #1E40AF;">
      <strong style="color: #0F172A; display: block; margin-bottom: 6px; font-size: 13px;">Your Message Summary:</strong>
      <p style="color: #64748B; margin: 0; font-size: 13px; font-style: italic; white-space: pre-wrap;">"${message}"</p>
    </div>

    <p style="color: #64748B; font-size: 13px; margin: 20px 0 0;">
      If you need to provide additional details, simply reply directly to this email.
    </p>
  `;

  const htmlBody = buildEmailTemplate({
    title: 'Thank You for Contacting Us',
    subtitle: 'Support Request Received',
    badgeText: 'Received',
    badgeColor: '#166534',
    badgeBg: '#DCFCE7',
    contentHtml,
  });

  const result = await sendEmail({
    to: cleanEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    recipient: cleanEmail,
    emailType: 'contact_autoreply',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Admin Executive Business Performance Report
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminBusinessReport(db, report) {
  const adminEmail = process.env.ADMIN_EMAIL || 'azrayanltd@gmail.com';
  const { type, periodStart, periodEnd, summary, topProducts, expenses, orderStatuses, weeklyTrend } = report;

  const currency = 'GBP';
  const isWeekly = type === 'weekly';
  const reportTitle = isWeekly ? 'Weekly Business Report' : 'Monthly Business Report';
  const dateRangeLabel = `${new Date(periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const monthYearLabel = new Date(periodStart).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const subjectPeriod = isWeekly ? dateRangeLabel : monthYearLabel;
  const subject = `DVDs Zone - ${reportTitle} - ${subjectPeriod}`;

  const revenueFormatted = formatMoney(summary.revenue, currency);
  const aovFormatted = formatMoney(summary.averageOrderValue, currency);
  const expensesFormatted = formatMoney(summary.totalExpenses, currency);
  const netRevenueFormatted = formatMoney(summary.netResult, currency);

  const textBody = `DVDs Zone
${reportTitle} - ${subjectPeriod}

## SALES SUMMARY
Total Revenue:           ${revenueFormatted}
Number of Orders:        ${summary.ordersCount}
Average Order Value:     ${aovFormatted}
Total Items Sold:        ${summary.itemsSold}
${!isWeekly && summary.customersCount ? `Total Customers:         ${summary.customersCount}\n` : ''}
## TOP PRODUCTS
${topProducts.length > 0 ? topProducts.map((p, idx) => `${idx + 1}. ${p.title} — ${p.unitsSold} sold (${formatMoney(p.revenue, currency)})`).join('\n') : 'No products sold during this period.'}

## EXPENSES
${expenses.items.length > 0 ? expenses.items.map((e) => `• [${e.category.toUpperCase()}] ${e.description}: ${formatMoney(e.amount, currency)} (${e.date})`).join('\n') + `\nTotal Expenses: ${expensesFormatted}` : 'No expense data recorded for this period.'}

## FINANCIAL SUMMARY
Gross Revenue:           ${formatMoney(summary.grossRevenue, currency)}
- Refunds:               ${formatMoney(summary.refunds, currency)}
- Recorded Expenses:     ${expensesFormatted}
= ${summary.hasCogs ? 'Estimated Profit' : 'Net Revenue After Recorded Expenses'}: ${netRevenueFormatted}
${!summary.hasCogs ? '(Note: Labeled as Net Revenue After Recorded Expenses because product COGS data is not recorded.)\n' : ''}
## ORDER STATUS BREAKDOWN
Paid: ${orderStatuses.paid || 0}
Processing: ${orderStatuses.processing || 0}
Shipped: ${orderStatuses.shipped || 0}
Delivered: ${orderStatuses.delivered || 0}
Cancelled: ${orderStatuses.cancelled || 0}
Refunded: ${orderStatuses.refunded || 0}
`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; }
    .container { max-width: 650px; margin: 24px auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #CBD5E1; }
    .header { background: #0B0F19; padding: 28px 32px; border-bottom: 4px solid #1E40AF; }
    .brand { color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .sub { color: #94A3B8; font-size: 13px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 32px; }
    .section-title { font-size: 13px; text-transform: uppercase; font-weight: 800; color: #1E40AF; letter-spacing: 0.8px; margin: 24px 0 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
    .data-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B; padding: 8px 6px; border-bottom: 1px solid #E2E8F0; }
    .data-table td { padding: 10px 6px; border-bottom: 1px solid #F1F5F9; color: #0F172A; }
    .fin-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-top: 16px; }
    .status-pill { display: inline-block; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 20px; font-size: 12px; margin: 3px; font-weight: 600; }
    .footer { background: #F8FAFC; padding: 20px; font-size: 11px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="brand">DVDS ZONE</h1>
      <p class="sub">${reportTitle} &bull; ${subjectPeriod}</p>
    </div>
    <div class="content">
      <table style="width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 6px;">
        <tr>
          <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 8px; text-align: center; width: 25%;">
            <div style="font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; margin-bottom: 4px;">Revenue</div>
            <div style="font-size: 17px; font-weight: 800; color: #1E40AF;">${revenueFormatted}</div>
          </td>
          <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 8px; text-align: center; width: 25%;">
            <div style="font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; margin-bottom: 4px;">Orders</div>
            <div style="font-size: 17px; font-weight: 800; color: #0F172A;">${summary.ordersCount}</div>
          </td>
          <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 8px; text-align: center; width: 25%;">
            <div style="font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; margin-bottom: 4px;">Items Sold</div>
            <div style="font-size: 17px; font-weight: 800; color: #0F172A;">${summary.itemsSold}</div>
          </td>
          <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 8px; text-align: center; width: 25%;">
            <div style="font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; margin-bottom: 4px;">Avg Order</div>
            <div style="font-size: 17px; font-weight: 800; color: #0F172A;">${aovFormatted}</div>
          </td>
        </tr>
      </table>

      <div class="section-title">Top Selling Products</div>
      ${
        topProducts.length > 0
          ? `<table class="data-table">
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>Product</th>
                  <th style="text-align: center; width: 80px;">Sold</th>
                  <th style="text-align: right; width: 90px;">Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${topProducts
                  .map(
                    (p, i) => `<tr>
                      <td style="color: #94A3B8; font-weight: 700;">#${i + 1}</td>
                      <td style="font-weight: 600;">${p.title}</td>
                      <td style="text-align: center; font-weight: 700;">${p.unitsSold}</td>
                      <td style="text-align: right; font-weight: 600;">${formatMoney(p.revenue, currency)}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
          : '<p style="color: #64748B; font-size: 13px; font-style: italic;">No product purchases recorded during this period.</p>'
      }

      ${
        weeklyTrend && weeklyTrend.length > 0
          ? `<div class="section-title">Sales Trend (Weekly Breakdown)</div>
            <table class="data-table">
              <thead><tr><th>Week</th><th style="text-align: center;">Orders</th><th style="text-align: right;">Revenue</th></tr></thead>
              <tbody>
                ${weeklyTrend
                  .map(
                    (w) => `<tr>
                      <td style="font-weight: 600;">${w.label}</td>
                      <td style="text-align: center;">${w.ordersCount}</td>
                      <td style="text-align: right; font-weight: 700; color: #1E40AF;">${formatMoney(w.revenue, currency)}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
          : ''
      }

      <div class="section-title">Recorded Business Expenses</div>
      ${
        expenses.items.length > 0
          ? `<table class="data-table">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align: right;">Amount</th></tr></thead>
              <tbody>
                ${expenses.items
                  .map(
                    (e) => `<tr>
                      <td style="color: #64748B;">${e.date}</td>
                      <td><span style="font-size: 11px; text-transform: uppercase; background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${e.category}</span></td>
                      <td>${e.description}</td>
                      <td style="text-align: right; font-weight: 600;">${formatMoney(e.amount, currency)}</td>
                    </tr>`
                  )
                  .join('')}
                <tr>
                  <td colspan="3" style="font-weight: 700; text-align: right; padding-top: 10px;">Total Expenses:</td>
                  <td style="font-weight: 800; text-align: right; color: #DC2626; padding-top: 10px;">${expensesFormatted}</td>
                </tr>
              </tbody>
            </table>`
          : '<p style="color: #64748B; font-size: 13px; font-style: italic;">No expense data recorded for this period.</p>'
      }

      <div class="section-title">Financial Summary</div>
      <div class="fin-box">
        <table style="width: 100%;">
          <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Gross Revenue:</td><td style="text-align: right; font-size: 13px; font-weight: 600;">${formatMoney(summary.grossRevenue, currency)}</td></tr>
          <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Less Refunds:</td><td style="text-align: right; font-size: 13px; color: #DC2626; font-weight: 600;">-${formatMoney(summary.refunds, currency)}</td></tr>
          <tr><td style="color: #64748B; font-size: 13px; padding: 3px 0;">Less Recorded Expenses:</td><td style="text-align: right; font-size: 13px; color: #DC2626; font-weight: 600;">-${expensesFormatted}</td></tr>
          <tr>
            <td style="font-size: 14px; font-weight: 800; color: #0F172A; padding-top: 10px; border-top: 2px solid #0B0F19;">
              ${summary.hasCogs ? 'Estimated Profit:' : 'Net Revenue After Recorded Expenses:'}
            </td>
            <td style="text-align: right; font-size: 16px; font-weight: 800; color: #1E40AF; padding-top: 10px; border-top: 2px solid #0B0F19;">
              ${netRevenueFormatted}
            </td>
          </tr>
        </table>
        ${
          !summary.hasCogs
            ? '<p style="font-size: 11px; color: #64748B; margin: 10px 0 0; line-height: 1.4;">Note: Labeled as <em>Net Revenue After Recorded Expenses</em> because product cost (COGS) is not tracked in the database.</p>'
            : ''
        }
      </div>

      <div class="section-title">Order Status Breakdown</div>
      <div style="margin-top: 8px;">
        <span class="status-pill">Paid: <strong>${orderStatuses.paid || 0}</strong></span>
        <span class="status-pill">Processing: <strong>${orderStatuses.processing || 0}</strong></span>
        <span class="status-pill">Shipped: <strong>${orderStatuses.shipped || 0}</strong></span>
        <span class="status-pill">Delivered: <strong>${orderStatuses.delivered || 0}</strong></span>
        <span class="status-pill">Cancelled: <strong>${orderStatuses.cancelled || 0}</strong></span>
        <span class="status-pill">Refunded: <strong>${orderStatuses.refunded || 0}</strong></span>
      </div>
    </div>
    <div class="footer">
      DVDs Zone &bull; Automated Business Performance Report &bull; Strictly Confidential (Admin Only)
    </div>
  </div>
</body>
</html>`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await logEmailAttempt(db, {
    recipient: adminEmail,
    emailType: 'admin_report',
    subject,
    result,
  });

  try {
    const reportId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'rep-' + Date.now();
    const historyRecord = {
      id: reportId,
      report_type: type,
      period_start: periodStart,
      period_end: periodEnd,
      generated_at: new Date().toISOString(),
      sent_at: result.success ? new Date().toISOString() : null,
      recipient: adminEmail,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
      payload: report,
    };

    const { error: insErr } = await db.from('report_history').insert(historyRecord);
    if (insErr) {
      await db.from('admin_audit_log').insert({
        record_id: reportId,
        table_name: 'report_history',
        action: 'INSERT',
        after_data: historyRecord,
      });
    }
  } catch (err) {
    console.warn('[email] Could not record report_history:', err.message);
  }

  return { ...result, subject, recipient: adminEmail };
}
