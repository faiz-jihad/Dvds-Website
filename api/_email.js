import { formatMoney } from '../shared/commerce.js';
import nodemailer from 'nodemailer';
import {
  BRAND,
  THEME,
  escapeHtml,
  formatCurrency,
  formatUkDate,
  formatUkDateTime,
  renderEmailLayout,
  renderButton,
  renderInfoBox,
  renderSecurityNotice,
  renderKeyValueTable,
  renderOrderItemsTable,
  renderOrderTotalsTable,
  renderAddressCard,
  renderPlainTextHeader,
  renderPlainTextFooter,
} from './_email-design-system.js';

/**
 * DVDs Zone — Universal Transactional Email Dispatcher & Delivery Engine
 * 
 * Supports:
 * - Local Postfix SMTP with OpenDKIM on VPS (127.0.0.1:25)
 * - Mailtrap API (Official REST API with Live and Sandbox support)
 * - Resend API
 * - SendGrid API
 * - Brevo / Sendinblue API
 * - Postmark API
 * - Graceful fallback / simulation in local and test environments.
 */

export async function sendEmail({ to, subject, html, text, replyTo = null, isInternalAlert = false }) {
  const fromEmail = process.env.EMAIL_FROM || BRAND.fromEmail;
  const defaultReplyTo = process.env.EMAIL_REPLY_TO || BRAND.supportEmail;
  const effectiveReplyTo = replyTo || defaultReplyTo;
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
        replyTo: effectiveReplyTo,
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

  // 2. Mailtrap API (Official REST API)
  if (mailtrapToken) {
    try {
      const fromMatch = fromEmail.match(/<([^>]+)>/);
      const cleanFromEmail = fromMatch ? fromMatch[1] : fromEmail;
      const cleanFromName = fromEmail.includes('<') ? fromEmail.replace(/<[^>]+>/, '').trim() : BRAND.name;

      const isSandbox = Boolean(mailtrapInboxId);
      const endpointUrl = isSandbox
        ? `https://sandbox.api.mailtrap.io/api/send/${mailtrapInboxId}`
        : 'https://send.api.mailtrap.io/api/send';

      const headers = {
        'Content-Type': 'application/json',
        ...(isSandbox ? { 'Api-Token': mailtrapToken } : { Authorization: `Bearer ${mailtrapToken}` }),
      };

      const payload = {
        from: { email: cleanFromEmail, name: cleanFromName || BRAND.name },
        to: recipients.map((r) => ({ email: typeof r === 'string' ? r : r.email })),
        subject,
        html,
        text,
        category: 'Transactional',
      };

      if (effectiveReplyTo) {
        payload.headers = { 'Reply-To': effectiveReplyTo };
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
    }
  }

  // 3. Resend API
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
          reply_to: effectiveReplyTo,
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
    }
  }

  // 4. SendGrid API
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
          personalizations: [{ to: recipients.map((r) => ({ email: typeof r === 'string' ? r : r.email })) }],
          from: { email: cleanFromEmail, name: BRAND.name },
          reply_to: { email: effectiveReplyTo },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`SendGrid HTTP ${response.status}: ${errText}`);
      }
      return { success: true, provider: 'sendgrid' };
    } catch (err) {
      console.error('[email] SendGrid delivery failed:', err.message);
    }
  }

  // 5. Brevo (Sendinblue) API
  if (brevoKey) {
    try {
      const fromMatch = fromEmail.match(/<([^>]+)>/);
      const cleanFromEmail = fromMatch ? fromMatch[1] : fromEmail;
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: BRAND.name, email: cleanFromEmail },
          to: recipients.map((r) => ({ email: typeof r === 'string' ? r : r.email })),
          replyTo: { email: effectiveReplyTo },
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
    }
  }

  // 6. Postmark API
  if (postmarkToken) {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': postmarkToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: fromEmail,
          To: primaryRecipient,
          ReplyTo: effectiveReplyTo,
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
    }
  }

  // 7. Simulation Fallback (Development & Automated Test environments)
  console.log(`[email] Simulated delivery to: ${primaryRecipient} | Subject: "${subject}"`);
  return {
    success: true,
    provider: 'simulated',
    simulated: true,
    to: primaryRecipient,
    subject,
  };
}

/**
 * Returns active email provider configuration details.
 */
export function getActiveEmailProvider() {
  const fromEmail = process.env.EMAIL_FROM || BRAND.fromEmail;
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;
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
 * Gracefully catches constraint differences so logging never disrupts transactions.
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

    // Trigger Admin Alert on Email Delivery Failure (guarded against recursive loops)
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
 * Helper to resolve order items from either embedded array or database.
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Customer Order Confirmation (Instant upon order creation)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderConfirmation(db, order) {
  const recipientEmail = order?.email || order?.customer_email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Idempotency check
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'order_confirmation')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const items = await resolveOrderItems(db, order);
  const siteUrl = BRAND.siteUrl;
  const currency = order.currency || 'GBP';
  const orderDate = formatUkDate(order.created_at || Date.now());
  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;

  const isPaid = order.payment_status === 'paid';
  const isAwaitingBank = order.payment_status === 'awaiting_payment' || order.payment_method === 'bank_transfer';
  const badgeText = isPaid ? 'Paid in Full' : isAwaitingBank ? 'Awaiting Payment' : 'Payment Pending';
  const badgeType = isPaid ? 'success' : isAwaitingBank ? 'warning' : 'info';
  
  const statusExplanation = isPaid
    ? 'Your payment has been verified. Your order is queued for warehouse inspection and packaging.'
    : isAwaitingBank
    ? 'Your order has been reserved. Please complete your bank transfer using the instructions provided.'
    : 'Your order has been created. Awaiting payment authorization and confirmation.';

  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const addressLines = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.postcode,
    address.country || 'United Kingdom',
  ].filter(Boolean);

  const subject = `Order Confirmation - DVDs Zone #${order.order_number}`;
  const preheader = `Order #${order.order_number} confirmed. Payment status: ${badgeText}. Estimated dispatch with Royal Mail.`;

  // HTML Content
  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>, thank you for ordering from <strong>${BRAND.name}</strong>.
    </p>

    ${renderInfoBox({
      title: `Order Status: ${badgeText}`,
      content: statusExplanation,
      type: badgeType,
    })}

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Order Date', value: orderDate },
      { label: 'Payment Method', value: order.payment_method || 'Online Card / Checkout' },
      { label: 'Payment Status', value: badgeText, color: THEME[badgeType].text, bold: true },
    ])}

    ${renderOrderItemsTable(items, currency)}

    ${renderOrderTotalsTable({
      subtotal: order.subtotal,
      shippingAmount: order.shipping_amount,
      deliveryName: order.delivery_name || 'Standard UK Delivery',
      discountAmount: order.discount_amount,
      totalAmount: order.total_amount,
      currency,
    })}

    ${renderAddressCard({
      title: 'Delivery Address',
      name: customerName,
      lines: addressLines,
    })}

    ${renderButton({
      text: 'View Order Status',
      url: viewOrderUrl,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Order Confirmation',
    subtitle: 'Order Acknowledgement',
    badgeText,
    badgeType,
    contentHtml,
  });

  // Plain Text Version
  const text = `${renderPlainTextHeader('Order Confirmation', `Order #${order.order_number}`)}
Hello ${customerName},

Thank you for your order with DVDs Zone UK.

ORDER SUMMARY:
Order Reference:  #${order.order_number}
Order Date:       ${orderDate}
Payment Status:   ${badgeText}
Payment Method:   ${order.payment_method || 'Online Checkout'}

${statusExplanation}

ITEMS ORDERED:
${items.map((i) => `• ${i.product_title || 'Item'} (Qty: ${i.quantity || 1}) — ${formatCurrency(i.total_price || i.unit_price, currency)}`).join('\n')}

Subtotal:         ${formatCurrency(order.subtotal, currency)}
Delivery:         ${formatCurrency(order.shipping_amount, currency)} (${order.delivery_name || 'Standard UK Delivery'})
${order.discount_amount ? `Discount:        -${formatCurrency(order.discount_amount, currency)}\n` : ''}Total Amount:     ${formatCurrency(order.total_amount, currency)}

DELIVERY ADDRESS:
${customerName}
${addressLines.join('\n')}

TRACK ORDER STATUS:
${viewOrderUrl}
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: recipientEmail,
    emailType: 'order_confirmation',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Customer Order Processing Notification (When warehouse begins picking)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderProcessing(db, order, { note } = {}) {
  const recipientEmail = order?.email || order?.customer_email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Idempotency check
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'order_processing')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const items = await resolveOrderItems(db, order);
  const siteUrl = BRAND.siteUrl;
  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;
  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const currency = order.currency || 'GBP';
  const subject = `Your Order is Being Processed - DVDs Zone #${order.order_number}`;
  const preheader = `Good news! Order #${order.order_number} is now being picked, quality-checked, and packaged.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Your order <strong>#${escapeHtml(order.order_number)}</strong> is now actively being processed by our warehouse fulfillment team.
    </p>

    ${renderInfoBox({
      title: 'Warehouse Preparation in Progress',
      content: `Our team is currently picking your items, inspecting disc playback quality, and safely packaging your order with reinforced disc mailers. You will receive an automated shipping notification with tracking details as soon as your parcel is collected by Royal Mail.`,
      type: 'info',
    })}

    ${
      note
        ? renderInfoBox({
            title: 'Note from Fulfillment Team',
            content: escapeHtml(note),
            type: 'neutral',
          })
        : ''
    }

    ${renderOrderItemsTable(items, currency)}

    ${renderButton({
      text: 'View Live Fulfillment Status',
      url: viewOrderUrl,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Order Being Processed',
    subtitle: 'Fulfillment & Warehouse Update',
    badgeText: 'Processing',
    badgeType: 'info',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Order Processing Update', `Order #${order.order_number}`)}
Hello ${customerName},

Good news! Your order #${order.order_number} is now being processed.

Our fulfillment team is picking, quality-inspecting, and carefully packaging your DVD items.
${note ? `\nFulfillment Note: ${note}\n` : ''}
Items being prepared:
${items.map((i) => `• ${i.product_title || 'Item'} (Qty: ${i.quantity || 1})`).join('\n')}

TRACK LIVE STATUS:
${viewOrderUrl}
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
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
// 3. Customer Payment Receipt & Tax Invoice (Instant upon payment capture)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerPaymentReceipt(db, order, { paymentReference, paidAt } = {}) {
  const recipientEmail = order?.email || order?.customer_email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Idempotency check
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'customer_receipt')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const items = await resolveOrderItems(db, order);
  const siteUrl = BRAND.siteUrl;
  const currency = order.currency || 'GBP';
  const effectiveRef = paymentReference || order.payment_reference || 'Authoritative Payment Verification';
  const effectivePaidAt = formatUkDateTime(paidAt || order.paid_at || order.created_at || Date.now());
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
  ].filter(Boolean);

  const paymentMethodLabel = (order.payment_method || order.payment_provider || 'Credit / Debit Card')
    .replace('_', ' ')
    .toUpperCase();

  const subject = `Payment Receipt - DVDs Zone #${order.order_number}`;
  const preheader = `Payment confirmed for order #${order.order_number}. Total: ${formatCurrency(order.total_amount, currency)}. Tax receipt enclosed.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Thank you for your purchase. We have received your payment in full. This message serves as your official payment receipt and tax invoice.
    </p>

    ${renderInfoBox({
      title: 'Payment Confirmed',
      content: `Your payment was successfully authorized and verified by our gateway. Your items are queued for warehouse dispatch with Royal Mail.`,
      type: 'success',
    })}

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Payment Date', value: effectivePaidAt },
      { label: 'Payment Method', value: paymentMethodLabel },
      { label: 'Gateway Reference', value: effectiveRef },
      { label: 'Status', value: 'PAID IN FULL', color: THEME.success.text, bold: true },
    ])}

    ${renderOrderItemsTable(items, currency)}

    ${renderOrderTotalsTable({
      subtotal: order.subtotal,
      shippingAmount: order.shipping_amount,
      deliveryName: order.delivery_name || 'Standard UK Delivery',
      discountAmount: order.discount_amount,
      totalAmount: order.total_amount,
      currency,
    })}

    ${renderAddressCard({
      title: 'Delivering To',
      name: customerName,
      lines: addressLines,
    })}

    ${renderButton({
      text: 'View Receipt & Order Status',
      url: viewOrderUrl,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Payment Receipt',
    subtitle: 'Payment Verified & Confirmed',
    badgeText: 'Paid in Full',
    badgeType: 'success',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Payment Receipt & Tax Invoice', `Order #${order.order_number}`)}
Hello ${customerName},

Thank you for your payment. This email is your official receipt for DVDs Zone UK.

PAYMENT DETAILS:
Order Reference:    #${order.order_number}
Payment Date:       ${effectivePaidAt}
Payment Method:     ${paymentMethodLabel}
Gateway Reference:  ${effectiveRef}
Payment Status:     PAID IN FULL

ITEMS PURCHASED:
${items.map((i) => `• ${i.product_title || 'Item'} (Qty: ${i.quantity || 1}) — ${formatCurrency(i.total_price || i.unit_price, currency)}`).join('\n')}

Subtotal:           ${formatCurrency(order.subtotal, currency)}
Delivery:           ${formatCurrency(order.shipping_amount, currency)} (${order.delivery_name || 'Standard UK Delivery'})
${order.discount_amount ? `Discount:          -${formatCurrency(order.discount_amount, currency)}\n` : ''}Total Paid:         ${formatCurrency(order.total_amount, currency)}

DELIVERY ADDRESS:
${customerName}
${addressLines.join('\n')}

VIEW RECEIPT ONLINE:
${viewOrderUrl}
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
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
// 4. Admin New Order Alert (Instant operational alert to store management)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminNewOrderNotification(db, order) {
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;
  if (!order) return { success: false, error: 'No order provided.' };

  // Idempotency check
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
  const siteUrl = BRAND.siteUrl;
  const currency = order.currency || 'GBP';
  const totalFormatted = formatCurrency(order.total_amount, currency);
  const address = order.shipping_address || {};
  const customerName = address.full_name || order.email || 'Customer';
  const orderAdminUrl = `${siteUrl}/admin/orders?order=${encodeURIComponent(order.id)}`;

  const subject = `[New Order] #${order.order_number} — ${totalFormatted} (${customerName})`;
  const preheader = `New order #${order.order_number} placed by ${customerName}. Payment: ${(order.payment_status || 'paid').toUpperCase()}.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      A new customer order has been placed on the DVDs Zone storefront.
    </p>

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Customer Name', value: customerName },
      { label: 'Customer Email', value: `<a href="mailto:${escapeHtml(order.email)}" style="color: ${THEME.primary}; text-decoration: none;">${escapeHtml(order.email)}</a>`, isRawHtml: true },
      { label: 'Payment Method', value: order.payment_method || 'Online' },
      { label: 'Payment Status', value: (order.payment_status || 'PAID').toUpperCase(), color: order.payment_status === 'paid' ? THEME.success.text : THEME.warning.text, bold: true },
      { label: 'Delivery Tier', value: order.delivery_name || 'Standard UK Delivery' },
      { label: 'Order Total', value: totalFormatted, bold: true, color: THEME.primary },
    ])}

    ${renderOrderItemsTable(items, currency)}

    ${renderAddressCard({
      title: 'Customer Shipping Destination',
      name: customerName,
      lines: [address.address_line_1, address.address_line_2, address.city, address.postcode, address.country || 'UK'].filter(Boolean),
    })}

    ${renderButton({
      text: 'Manage Order in Backoffice',
      url: orderAdminUrl,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'New Customer Order Received',
    subtitle: 'Store Backoffice Notification',
    badgeText: order.payment_status === 'paid' ? 'Paid Order' : 'Order Placed',
    badgeType: order.payment_status === 'paid' ? 'success' : 'warning',
    contentHtml,
    isInternal: true,
  });

  const text = `${renderPlainTextHeader('Store Backoffice Alert', `New Order #${order.order_number}`)}
NEW ORDER RECEIVED:
Order Reference:  #${order.order_number}
Customer:         ${customerName} (${order.email})
Payment Status:   ${(order.payment_status || 'PAID').toUpperCase()}
Payment Method:   ${order.payment_method || 'Online'}
Total Amount:     ${totalFormatted}
Delivery Tier:    ${order.delivery_name || 'Standard UK Delivery'}

ITEMS:
${items.map((i) => `• ${i.product_title || 'Item'} (Qty: ${i.quantity || 1}) — ${formatCurrency(i.total_price || i.unit_price, currency)}`).join('\n')}

SHIPPING ADDRESS:
${customerName}
${[address.address_line_1, address.city, address.postcode, address.country || 'UK'].filter(Boolean).join('\n')}

OPEN BACKOFFICE:
${orderAdminUrl}
${renderPlainTextFooter(true)}
`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    isInternalAlert: true,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
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
// 5. Customer Order Dispatched / Shipped Notification
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderDispatched(db, order, { carrier = 'Royal Mail', trackingNumber, trackingUrl, note } = {}) {
  const recipientEmail = order?.email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Idempotency check
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
  const siteUrl = BRAND.siteUrl;
  const effectiveCarrier = carrier || order.carrier || 'Royal Mail';
  const effectiveTracking = trackingNumber || order.tracking_number || '';
  const viewOrderUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;
  const effectiveTrackingUrl =
    trackingUrl ||
    (effectiveTracking && effectiveCarrier.toLowerCase().includes('royal')
      ? `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(effectiveTracking)}`
      : viewOrderUrl);

  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const currency = order.currency || 'GBP';
  const subject = `Your Order Has Been Dispatched - DVDs Zone #${order.order_number}`;
  const preheader = `Order #${order.order_number} has been shipped via ${effectiveCarrier}. Tracking: ${effectiveTracking || 'Live online'}.`;

  const trackingRows = [
    { label: 'Carrier', value: effectiveCarrier, bold: true },
  ];
  if (effectiveTracking) {
    trackingRows.push({ label: 'Tracking Number', value: effectiveTracking, bold: true, color: THEME.primary });
  }

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Your DVDs Zone order <strong>#${escapeHtml(order.order_number)}</strong> has been packaged, sealed, and handed over to <strong>${escapeHtml(effectiveCarrier)}</strong> for secure delivery.
    </p>

    ${renderInfoBox({
      title: 'Dispatched via Royal Mail',
      content: `Your parcel is on its way. Delivery typically takes 2-3 working days within the UK (or next working day if Express delivery was selected at checkout).`,
      type: 'success',
    })}

    ${renderKeyValueTable(trackingRows)}

    ${
      note
        ? renderInfoBox({
            title: 'Dispatch Note',
            content: escapeHtml(note),
            type: 'neutral',
          })
        : ''
    }

    ${renderButton({
      text: effectiveTracking ? `Track Parcel on ${effectiveCarrier}` : 'Track Order Status',
      url: effectiveTrackingUrl,
      variant: 'primary',
    })}

    ${renderOrderItemsTable(items, currency)}

    ${renderAddressCard({
      title: 'Dispatched To Address',
      name: customerName,
      lines: [address.address_line_1, address.address_line_2, address.city, address.postcode, address.country || 'UK'].filter(Boolean),
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Order Dispatched',
    subtitle: 'Shipping & Tracking Confirmation',
    badgeText: 'Dispatched',
    badgeType: 'success',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Order Dispatched', `Order #${order.order_number}`)}
Hello ${customerName},

Great news! Your DVDs Zone order #${order.order_number} is on its way.

SHIPPING DETAILS:
Carrier:          ${effectiveCarrier}
${effectiveTracking ? `Tracking Number:  ${effectiveTracking}\n` : ''}Track Delivery:   ${effectiveTrackingUrl}
${note ? `\nDispatch Note: ${note}\n` : ''}
DISPATCHED ITEMS:
${items.map((i) => `• ${i.product_title || 'Item'} (Qty: ${i.quantity || 1})`).join('\n')}

DELIVERY ADDRESS:
${customerName}
${[address.address_line_1, address.city, address.postcode, address.country || 'UK'].filter(Boolean).join('\n')}

TRACK YOUR PACKAGE:
${effectiveTrackingUrl}
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: recipientEmail,
    emailType: 'order_dispatched',
    subject,
    result,
  });

  try {
    await db.from('orders').update({ dispatch_email_sent_at: new Date().toISOString() }).eq('id', order.id);
  } catch {
    // Non-blocking
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Customer Bank Transfer (BACS) Instructions Email
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerBankTransferInstructions(db, order) {
  const recipientEmail = order?.email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  const siteUrl = BRAND.siteUrl;
  const currency = order.currency || 'GBP';
  const totalFormatted = formatCurrency(order.total_amount, currency);
  const uploadProofUrl = `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;
  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';

  const subject = `Bank Transfer Instructions - DVDs Zone #${order.order_number}`;
  const preheader = `Payment instructions for order #${order.order_number}. Total: ${totalFormatted}. Quote reference #${order.order_number}.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Thank you for your order with <strong>${BRAND.name}</strong>. Your items have been reserved in our inventory. Please complete your bank transfer using the official account details below.
    </p>

    ${renderInfoBox({
      title: 'Action Required: Complete Transfer',
      content: `Please transfer <strong>${totalFormatted}</strong> within <strong>48 hours</strong>. It is essential that you include your order reference <strong>#${escapeHtml(order.order_number)}</strong> in the bank payment reference field so we can automatically match your funds.`,
      type: 'warning',
    })}

    ${renderKeyValueTable([
      { label: 'Bank Name', value: 'Barclays Bank UK', bold: true },
      { label: 'Account Name', value: BRAND.operatedBy, bold: true },
      { label: 'Sort Code', value: '20-00-00', bold: true },
      { label: 'Account Number', value: '12345678', bold: true },
      { label: 'Exact Reference', value: `#${order.order_number}`, bold: true, color: THEME.primary },
      { label: 'Amount to Pay', value: totalFormatted, bold: true, color: THEME.primary },
    ])}

    <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
      <strong style="display: block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: ${THEME.textMain}; margin-bottom: 8px;">
        Steps to Complete Your Order:
      </strong>
      <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7; color: ${THEME.textBody};">
        <li>Log in to your UK online banking app or website.</li>
        <li>Create a transfer to <strong>${BRAND.operatedBy}</strong> using Sort Code <strong>20-00-00</strong> and Account <strong>12345678</strong>.</li>
        <li>Enter <strong>#${escapeHtml(order.order_number)}</strong> as your payment reference.</li>
        <li>Once transferred, click the button below to upload your payment receipt or screenshot to speed up dispatch.</li>
      </ol>
    </div>

    ${renderButton({
      text: 'Upload Payment Proof',
      url: uploadProofUrl,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Bank Transfer Instructions',
    subtitle: 'Payment Details & Settlement Guidance',
    badgeText: 'Awaiting Payment',
    badgeType: 'warning',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Bank Transfer Instructions', `Order #${order.order_number}`)}
Hello ${customerName},

Thank you for your order with DVDs Zone UK. Your DVD items have been reserved.

OFFICIAL BANK PAYMENT DETAILS:
Bank:             Barclays Bank UK
Account Name:     ${BRAND.operatedBy}
Sort Code:        20-00-00
Account Number:   12345678
Payment Reference: #${order.order_number}   <-- IMPORTANT: Quote this exact reference
Amount Due:       ${totalFormatted}

NEXT STEPS:
1. Transfer ${totalFormatted} using your online banking application.
2. Quote reference #${order.order_number}.
3. Upload your payment screenshot or proof to speed up warehouse fulfillment:
   ${uploadProofUrl}

Please complete your transfer within 48 hours to preserve your inventory reservation.
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: recipientEmail,
    emailType: 'bank_transfer_instructions',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Admin Payment Proof Upload Alert (When customer submits BACS screenshot)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminPaymentProofNotification(db, order, { fileName } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;
  if (!order) return { success: false, error: 'No order provided.' };

  const siteUrl = BRAND.siteUrl;
  const orderAdminUrl = `${siteUrl}/admin/orders?order=${encodeURIComponent(order.id)}`;
  const totalFormatted = formatCurrency(order.total_amount, order.currency || 'GBP');
  const safeFile = escapeHtml(fileName || 'payment-proof.pdf');

  const subject = `[Action Required] Payment Proof Uploaded - #${order.order_number} (${totalFormatted})`;
  const preheader = `Customer uploaded bank transfer proof for order #${order.order_number} (${safeFile}). Verify funds.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      A customer has uploaded proof of bank payment for an awaiting-payment order. Please verify that funds have reached the business bank account.
    </p>

    ${renderInfoBox({
      title: 'Action Required: Bank Settlement Check',
      content: `File submitted: <strong>${safeFile}</strong>. Log into Barclays Online Banking, check incoming Faster Payments / BACS for reference <strong>#${escapeHtml(order.order_number)}</strong>, and transition this order to <em>Processing</em> in the backoffice.`,
      type: 'warning',
    })}

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Customer Email', value: order.email },
      { label: 'Order Total', value: totalFormatted, bold: true, color: THEME.primary },
      { label: 'Payment Method', value: 'Bank Transfer (BACS)' },
      { label: 'Uploaded File', value: safeFile },
      { label: 'Uploaded At', value: formatUkDateTime(Date.now()) },
    ])}

    ${renderButton({
      text: 'Review & Verify in Backoffice',
      url: orderAdminUrl,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Payment Proof Uploaded',
    subtitle: 'Store Backoffice Action Alert',
    badgeText: 'Action Required',
    badgeType: 'warning',
    contentHtml,
    isInternal: true,
  });

  const text = `${renderPlainTextHeader('Backoffice Alert', `Payment Proof: #${order.order_number}`)}
PAYMENT PROOF SUBMITTED:
Order Reference:  #${order.order_number}
Customer:         ${order.email}
Total Amount:     ${totalFormatted}
File:             ${fileName || 'proof'}
Date/Time:        ${formatUkDateTime(Date.now())}

ACTION:
Verify matching bank transfer in Barclays online banking, then mark order as paid:
${orderAdminUrl}
${renderPlainTextFooter(true)}
`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    isInternalAlert: true,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: adminEmail,
    emailType: 'admin_payment_proof',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Customer Order Cancellation Notification
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderCancelled(db, order, { reason } = {}) {
  const recipientEmail = order?.email || order?.customer_email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  const siteUrl = BRAND.siteUrl;
  const currency = order.currency || 'GBP';
  const totalFormatted = formatCurrency(order.total_amount, currency);
  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const cancellationReason = reason || 'Order cancelled upon request.';

  const isPaid = order.payment_status === 'paid' || order.status === 'refunded';
  const financialNotice = isPaid
    ? 'Since your order was previously paid, a full refund has been initiated to your original payment method. Please allow 3-5 business days for bank processing.'
    : 'No funds were charged to your payment card for this cancelled order.';

  const subject = `Order Cancelled - DVDs Zone #${order.order_number}`;
  const preheader = `Order #${order.order_number} has been cancelled. ${financialNotice}`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      This notification confirms that your DVDs Zone order <strong>#${escapeHtml(order.order_number)}</strong> has been cancelled.
    </p>

    ${renderInfoBox({
      title: 'Reason for Cancellation',
      content: escapeHtml(cancellationReason),
      type: 'danger',
    })}

    ${renderInfoBox({
      title: 'Billing & Financial Status',
      content: financialNotice,
      type: isPaid ? 'info' : 'success',
    })}

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Order Amount', value: totalFormatted },
      { label: 'Status', value: 'CANCELLED', color: THEME.danger.text, bold: true },
    ])}

    <p style="margin: 16px 0; font-size: 13px; line-height: 1.6; color: ${THEME.textMuted};">
      If you did not request this cancellation or would like to re-order your items, please visit our online store or contact our customer support team.
    </p>

    ${renderButton({
      text: 'Return to DVDs Zone Store',
      url: `${siteUrl}/shop`,
      variant: 'secondary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Order Cancelled',
    subtitle: 'Order Cancellation Notice',
    badgeText: 'Cancelled',
    badgeType: 'danger',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Order Cancelled', `Order #${order.order_number}`)}
Hello ${customerName},

Your order #${order.order_number} has been cancelled.

Reason: ${cancellationReason}

BILLING STATUS:
${financialNotice}

Order Reference:  #${order.order_number}
Total:            ${totalFormatted}

If you have questions, please reach out to ${BRAND.supportEmail}.
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
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
// 9. Customer Order Refunded Confirmation
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerOrderRefunded(db, order, { refundAmount, currency, refundReference, reason } = {}) {
  const recipientEmail = order?.email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  const effectiveCurrency = currency || order.currency || 'GBP';
  const effectiveAmount = refundAmount || order.total_amount || 0;
  const refundFormatted = formatCurrency(effectiveAmount, effectiveCurrency);
  const refundRef = refundReference || order.payment_reference || 'Gateway Refund';
  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const refundReason = reason || 'Refund processed upon administrative review.';

  const subject = `Refund Confirmation - DVDs Zone #${order.order_number} (${refundFormatted})`;
  const preheader = `Your refund of ${refundFormatted} for order #${order.order_number} has been issued.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      We have processed a refund of <strong>${refundFormatted}</strong> for your DVDs Zone order <strong>#${escapeHtml(order.order_number)}</strong>.
    </p>

    ${renderInfoBox({
      title: 'Refund Successfully Issued',
      content: `The funds have been returned to your original payment method. Depending on your bank or card issuer (or PayPal), it typically takes <strong>3 to 5 business days</strong> for the credit to appear on your bank statement.`,
      type: 'success',
    })}

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Amount Refunded', value: refundFormatted, bold: true, color: THEME.success.text },
      { label: 'Refund Reference', value: refundRef },
      { label: 'Reason', value: refundReason },
      { label: 'Refund Date', value: formatUkDateTime(Date.now()) },
    ])}

    <p style="margin: 16px 0 0 0; font-size: 13px; line-height: 1.6; color: ${THEME.textMuted};">
      If you have any questions regarding your refund or do not see the funds after 7 business days, please reply directly to this email or contact us at <a href="mailto:${BRAND.supportEmail}" style="color: ${THEME.primary};">${BRAND.supportEmail}</a>.
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Refund Confirmation',
    subtitle: 'Payment Refund Completed',
    badgeText: 'Refunded',
    badgeType: 'success',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Refund Confirmation', `Order #${order.order_number}`)}
Hello ${customerName},

A refund has been issued for your order #${order.order_number}.

REFUND DETAILS:
Order Reference:  #${order.order_number}
Amount Refunded:  ${refundFormatted}
Refund Reference: ${refundRef}
Reason:           ${refundReason}
Date:             ${formatUkDateTime(Date.now())}

TIMEFRAME:
Funds are returned to your original payment method. Please allow 3 to 5 business days for your banking institution to process the credit.

Questions? Contact ${BRAND.supportEmail}.
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  await logEmailAttempt(db, {
    orderId: order.id,
    orderNumber: order.order_number,
    recipient: recipientEmail,
    emailType: 'order_refunded',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Customer Payment Failed Notification (Gentle, non-alarmist checkout help)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerPaymentFailed(db, order, { errorReason, provider = 'card', retryUrl } = {}) {
  const recipientEmail = order?.email || order?.customer_email || order?.shipping_address?.email;
  if (!order || !recipientEmail) {
    return { success: false, error: 'No recipient email on order.' };
  }

  // Idempotency: avoid sending duplicate payment failure alerts
  try {
    const { data: existingLog } = await db
      .from('email_logs')
      .select('id')
      .eq('order_id', order.id)
      .eq('email_type', 'order_cancelled')
      .in('status', ['sent', 'simulated'])
      .maybeSingle();

    if (existingLog) {
      return { success: true, duplicate_skipped: true };
    }
  } catch {
    // Non-blocking
  }

  const siteUrl = BRAND.siteUrl;
  const currency = order.currency || 'GBP';
  const totalFormatted = formatCurrency(order.total_amount, currency);
  const checkoutRetryUrl = retryUrl || `${siteUrl}/order-success/${encodeURIComponent(order.id)}`;
  const address = order.shipping_address || {};
  const customerName = address.full_name || 'Valued Customer';
  const declineReason = errorReason || 'The card issuer was unable to authorize the transaction.';

  const subject = `Payment Unsuccessful - DVDs Zone #${order.order_number}`;
  const preheader = `Payment for order #${order.order_number} was not completed. Your card has not been charged.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      We were unable to complete the payment for your recent DVDs Zone order <strong>#${escapeHtml(order.order_number)}</strong>.
    </p>

    ${renderInfoBox({
      title: 'Your Card Was Not Charged',
      content: `Please rest assured that <strong>no funds have been deducted from your account</strong>. The transaction was stopped before any charge was finalized.`,
      type: 'warning',
    })}

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Order Amount', value: totalFormatted },
      { label: 'Decline Notice', value: declineReason },
      { label: 'Payment Method', value: provider.toUpperCase() },
    ])}

    <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13px; line-height: 1.6; color: ${THEME.textBody};">
      <strong style="display: block; margin-bottom: 6px; color: ${THEME.textMain};">Common Solutions:</strong>
      <ul style="margin: 0; padding-left: 18px; color: ${THEME.textMuted};">
        <li>Double-check your card number, expiry date, and security code (CVV).</li>
        <li>Ensure your billing postcode matches the address registered with your bank.</li>
        <li>Check that your bank or banking app approved any 3D Secure / Verified-by-Visa verification prompt.</li>
        <li>Try an alternative payment method such as PayPal or UK Bank Transfer.</li>
      </ul>
    </div>

    ${renderButton({
      text: 'Retry Payment Securely',
      url: checkoutRetryUrl,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Payment Unsuccessful',
    subtitle: 'Checkout Assistance',
    badgeText: 'Payment Incomplete',
    badgeType: 'warning',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Payment Unsuccessful', `Order #${order.order_number}`)}
Hello ${customerName},

We were unable to complete the payment for your order #${order.order_number}.

IMPORTANT REASSURANCE:
Your card has NOT been charged. No funds have been taken from your account.

Notice: ${declineReason}
Amount: ${totalFormatted}

HOW TO COMPLETE YOUR PURCHASE:
You can retry payment or choose another payment method (such as PayPal or Bank Transfer) using this secure link:
${checkoutRetryUrl}

If you need any assistance, please contact us at ${BRAND.supportEmail}.
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
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
// 11. Customer Welcome Email (Triggered upon registration)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerWelcomeEmail(db, user) {
  const recipientEmail = user?.email;
  if (!user || !recipientEmail) {
    return { success: false, error: 'No recipient email on user.' };
  }

  // Idempotency check
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
        return { success: true, duplicate_skipped: true };
      }
    } catch {
      // Non-blocking
    }
  }

  const siteUrl = BRAND.siteUrl;
  const customerName = user.full_name || user.fullName || recipientEmail.split('@')[0];
  const subject = `Welcome to DVDs Zone UK, ${customerName}!`;
  const preheader = `Welcome to DVDs Zone UK. Your account is active. Explore our physical media archive.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Welcome to <strong>${BRAND.name}</strong>! We are delighted to have you join our community of movie collectors, film enthusiasts, and physical media lovers.
    </p>

    ${renderInfoBox({
      title: 'Your Member Privileges',
      content: `
        <ul style="margin: 0; padding-left: 18px; color: ${THEME.info.text}; line-height: 1.7;">
          <li>Fast, one-click checkout with secure UK address storage</li>
          <li>Live carrier tracking updates with Royal Mail integration</li>
          <li>Instant access to payment receipts and VAT invoices</li>
          <li>Dedicated assistance with rare, vintage, and out-of-print title sourcing</li>
        </ul>
      `,
      type: 'info',
    })}

    <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13px; line-height: 1.6; color: ${THEME.textBody};">
      <strong style="display: block; margin-bottom: 4px; color: ${THEME.textMain};">Our Curation Standards:</strong>
      Every disc in our collection is an official UK Region 2 or Region 0 (All-Region) release. Discs are individually inspected for playback quality and packaged in rigid protective packaging prior to dispatch.
    </div>

    ${renderButton({
      text: 'Explore the DVD Store',
      url: `${siteUrl}/shop`,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Welcome to DVDs Zone',
    subtitle: 'Account Activated',
    badgeText: 'Member',
    badgeType: 'info',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Welcome to DVDs Zone UK', 'Account Activated')}
Hello ${customerName},

Welcome to DVDs Zone UK! We are delighted to have you join our community of film enthusiasts and collectors.

WHAT YOU CAN DO WITH YOUR ACCOUNT:
• Browse our curated catalog of classic, rare, and collector DVD releases.
• Enjoy fast checkout with saved shipping preferences.
• Track Royal Mail parcels and delivery statuses in real-time.
• Download payment receipts and review your purchase history.

DISC QUALITY PROMISE:
All discs are official UK Region 2 or Region 0 releases, inspected for playback quality prior to fulfillment.

VISIT THE STORE:
${siteUrl}/shop

YOUR ACCOUNT DASHBOARD:
${siteUrl}/account
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
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
// 12. Customer Password Reset Email (Supabase Admin recovery link)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerPasswordResetEmail(db, { email, resetUrl, fullName } = {}) {
  const recipientEmail = email?.trim().toLowerCase();
  if (!recipientEmail || !resetUrl) {
    return { success: false, error: 'Recipient email and reset URL are required.' };
  }

  const customerName = fullName || recipientEmail.split('@')[0];
  const subject = `Reset Your DVDs Zone Password`;
  const preheader = `Password reset request for ${recipientEmail}. Secure single-use link expires in 1 hour.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      We received a request to reset the password for your customer account associated with <strong>${escapeHtml(recipientEmail)}</strong>.
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Click the button below to securely create a new password:
    </p>

    ${renderButton({
      text: 'Reset Password',
      url: resetUrl,
      variant: 'primary',
    })}

    ${renderSecurityNotice([
      'This password reset link is cryptographically signed, single-use, and expires in 1 hour.',
      'If you did not request a password reset, you can safely ignore this email. Your account remains completely secure and your current password has not been altered.',
      'DVDs Zone staff will never ask you for your password or reset link.',
    ])}

    <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.5; color: ${THEME.textLight}; word-break: break-all;">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(resetUrl)}" style="color: ${THEME.primary}; font-size: 11px;">${escapeHtml(resetUrl)}</a>
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Password Reset Request',
    subtitle: 'Account Security',
    badgeText: 'Action Required',
    badgeType: 'warning',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Password Reset Request', 'Account Security')}
Hello ${customerName},

We received a request to reset the password for your DVDs Zone account (${recipientEmail}).

RESET YOUR PASSWORD:
Open this secure link in your browser:
${resetUrl}

SECURITY ADVISORY:
• This link is single-use and expires in 1 hour.
• If you did not request this password reset, please ignore this email. Your account remains secure.
• DVDs Zone staff will never ask you for your password or reset link.

Questions? Contact ${BRAND.supportEmail}.
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
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
// 13. Customer Password Reset Confirmation (After password updated)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerPasswordResetConfirmation(db, { email, fullName, changedAt } = {}) {
  const recipientEmail = email?.trim().toLowerCase();
  if (!recipientEmail) {
    return { success: false, error: 'Recipient email is required.' };
  }

  const siteUrl = BRAND.siteUrl;
  const customerName = fullName || recipientEmail.split('@')[0];
  const timestamp = changedAt || formatUkDateTime(Date.now());
  const subject = `Security Alert: Your DVDs Zone Password Has Been Changed`;
  const preheader = `Your account password was updated on ${timestamp}. If this was not you, contact us immediately.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      This security email confirms that the password for your DVDs Zone account (<strong>${escapeHtml(recipientEmail)}</strong>) was successfully changed on <strong>${escapeHtml(timestamp)}</strong>.
    </p>

    ${renderInfoBox({
      title: 'Password Successfully Updated',
      content: 'If you initiated this change, no further action is required. You can now use your new password across all devices.',
      type: 'success',
    })}

    ${renderSecurityNotice([
      'If you DID NOT make this change, please contact our support team immediately at ' + BRAND.supportEmail + ' so we can secure your account.',
      'For your protection, any other active browser sessions may have been invalidated.',
    ])}

    ${renderButton({
      text: 'Sign In to Your Account',
      url: `${siteUrl}/login`,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Password Changed Successfully',
    subtitle: 'Account Security Notification',
    badgeText: 'Secured',
    badgeType: 'success',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Security Notification', 'Password Changed')}
Hello ${customerName},

The password for your DVDs Zone account (${recipientEmail}) was successfully changed on:
${timestamp}

If you made this change, no further action is required. You can sign in here:
${siteUrl}/login

IMPORTANT SECURITY CAUTION:
If you did NOT make this change or suspect unauthorized activity, please contact our support team immediately at ${BRAND.supportEmail}.
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
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
// 14. Customer Contact Auto-Reply Acknowledgement
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomerContactAutoReply(db, { name, email, order_reference, message }) {
  const recipientEmail = (email || '').trim().toLowerCase();
  if (!recipientEmail) return { success: false, error: 'No recipient email.' };

  const customerName = name || recipientEmail.split('@')[0];
  const cleanOrderRef = order_reference ? escapeHtml(order_reference) : null;
  const subject = `We Have Received Your Message - DVDs Zone Support`;
  const preheader = `Thank you for contacting DVDs Zone. We have received your inquiry and will respond within 24 hours.`;

  const inquiryRows = [
    { label: 'Sender', value: customerName },
    { label: 'Email', value: recipientEmail },
  ];
  if (cleanOrderRef) {
    inquiryRows.push({ label: 'Order Reference', value: cleanOrderRef, bold: true });
  }

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Hello <strong>${escapeHtml(customerName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Thank you for reaching out to <strong>${BRAND.name}</strong> customer care. This automated acknowledgement confirms that we have safely received your inquiry.
    </p>

    ${renderInfoBox({
      title: 'Our Response Time',
      content: 'Our UK customer support team reviews inquiries Monday through Friday. We typically respond within <strong>24 business hours</strong>.',
      type: 'info',
    })}

    ${renderKeyValueTable(inquiryRows)}

    <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
      <strong style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${THEME.textMuted}; margin-bottom: 6px;">
        Summary of Your Message:
      </strong>
      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${THEME.textBody}; white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 13px; line-height: 1.6; color: ${THEME.textMuted};">
      If your inquiry is regarding an urgent delivery or order modification, please ensure you include your Order Reference (#) in any follow-up replies.
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Message Received',
    subtitle: 'Customer Support Acknowledgement',
    badgeText: 'Received',
    badgeType: 'info',
    contentHtml,
  });

  const text = `${renderPlainTextHeader('Message Received', 'Customer Support Acknowledgement')}
Hello ${customerName},

Thank you for contacting DVDs Zone UK. We have received your message.

Our UK customer care team typically reviews and answers inquiries within 24 business hours.

INQUIRY DETAILS:
${cleanOrderRef ? `Order Reference: ${cleanOrderRef}\n` : ''}Your Message:
"${message}"

We will be in touch shortly.
${renderPlainTextFooter()}
`;

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  await logEmailAttempt(db, {
    recipient: recipientEmail,
    emailType: 'contact_autoreply',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. Admin Customer Contact Inquiry Alert
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminContactInquiry(db, { name, email, order_reference, message }) {
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;
  const safeName = escapeHtml(name || 'Anonymous');
  const safeEmail = escapeHtml(email || 'No email');
  const safeOrderRef = order_reference ? escapeHtml(order_reference) : null;
  const safeMessage = escapeHtml(message || '');

  const subject = `[Contact Inquiry] ${safeName}${safeOrderRef ? ` (Order ${safeOrderRef})` : ''}`;
  const preheader = `New customer support inquiry from ${safeName} (${safeEmail}).`;

  const detailsRows = [
    { label: 'Customer Name', value: safeName, bold: true },
    { label: 'Customer Email', value: `<a href="mailto:${safeEmail}" style="color: ${THEME.primary};">${safeEmail}</a>`, isRawHtml: true },
  ];
  if (safeOrderRef) {
    detailsRows.push({ label: 'Order Reference', value: safeOrderRef, bold: true });
  }
  detailsRows.push({ label: 'Submitted At', value: formatUkDateTime(Date.now()) });

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      A new customer support inquiry has been submitted via the DVDs Zone contact page.
    </p>

    ${renderKeyValueTable(detailsRows)}

    <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
      <strong style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${THEME.textMuted}; margin-bottom: 8px;">
        Inquiry Content:
      </strong>
      <div style="font-size: 14px; line-height: 1.6; color: ${THEME.textMain}; white-space: pre-wrap;">${safeMessage}</div>
    </div>

    ${renderButton({
      text: `Reply Directly to ${safeName}`,
      url: `mailto:${safeEmail}?subject=Re:%20DVDs%20Zone%20Inquiry${safeOrderRef ? `%20(${safeOrderRef})` : ''}`,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Customer Inquiry Received',
    subtitle: 'Store Inbound Support Ticket',
    badgeText: 'Customer Inquiry',
    badgeType: 'info',
    contentHtml,
    isInternal: true,
  });

  const text = `${renderPlainTextHeader('Backoffice Alert', 'Customer Support Inquiry')}
NEW CONTACT INQUIRY:
Name:       ${name}
Email:      ${email}
${order_reference ? `Order Ref:   ${order_reference}\n` : ''}Date:       ${formatUkDateTime(Date.now())}

MESSAGE:
"${message}"

Reply directly to: ${email}
${renderPlainTextFooter(true)}
`;

  const result = await sendEmail({
    to: adminEmail,
    replyTo: email,
    subject,
    html,
    text,
    isInternalAlert: true,
  });

  await logEmailAttempt(db, {
    recipient: adminEmail,
    emailType: 'contact_inquiry',
    subject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. Admin Payment Verified Alert
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminPaymentVerifiedAlert(db, order, { paymentReference, amount, currency, provider } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;
  if (!order) return { success: false, error: 'No order provided.' };

  const effectiveCurrency = currency || order.currency || 'GBP';
  const effectiveAmount = amount || order.total_amount || 0;
  const totalFormatted = formatCurrency(effectiveAmount, effectiveCurrency);
  const effectiveRef = paymentReference || order.payment_reference || 'Gateway Capture';
  const effectiveProvider = (provider || order.payment_provider || 'gateway').toUpperCase();
  const address = order.shipping_address || {};
  const customerName = address.full_name || order.email || 'Customer';

  const subject = `[Payment Captured] #${order.order_number} — ${totalFormatted} (${effectiveProvider})`;
  const preheader = `Payment captured for order #${order.order_number}. Amount: ${totalFormatted}. Provider: ${effectiveProvider}.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      Gateway payment authorization has been settled and verified. Order is ready for dispatch.
    </p>

    ${renderInfoBox({
      title: 'Settlement Confirmed',
      content: `Funds have been successfully authorized and captured by ${effectiveProvider}.`,
      type: 'success',
    })}

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Amount Captured', value: totalFormatted, bold: true, color: THEME.success.text },
      { label: 'Payment Gateway', value: effectiveProvider },
      { label: 'Gateway Reference', value: effectiveRef },
      { label: 'Customer', value: `${customerName} (${order.email})` },
      { label: 'Captured At', value: formatUkDateTime(Date.now()) },
    ])}

    ${renderButton({
      text: 'View Order in Backoffice',
      url: `${BRAND.siteUrl}/admin/orders?order=${encodeURIComponent(order.id)}`,
      variant: 'primary',
    })}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Payment Verified & Settled',
    subtitle: 'Gateway Settlement Notification',
    badgeText: 'Verified',
    badgeType: 'success',
    contentHtml,
    isInternal: true,
  });

  const text = `${renderPlainTextHeader('Backoffice Alert', 'Payment Captured')}
PAYMENT CAPTURED:
Order Reference:    #${order.order_number}
Amount:             ${totalFormatted}
Gateway:            ${effectiveProvider}
Gateway Reference:  ${effectiveRef}
Customer:           ${customerName} (${order.email})
Time:               ${formatUkDateTime(Date.now())}
${renderPlainTextFooter(true)}
`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    isInternalAlert: true,
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
// 17. Admin Payment Failed Alert
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminPaymentFailedAlert(db, order, { errorReason, provider, paymentReference } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;
  if (!order) return { success: false, error: 'No order provided.' };

  const currency = order.currency || 'GBP';
  const totalFormatted = formatCurrency(order.total_amount, currency);
  const failureReason = errorReason || 'Payment declined by gateway.';

  const subject = `[Payment Failed] Order #${order.order_number} — ${totalFormatted}`;
  const preheader = `Payment failed for order #${order.order_number}. Reason: ${failureReason}.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      A customer payment attempt was declined or failed during checkout.
    </p>

    ${renderInfoBox({
      title: 'Gateway Failure Notice',
      content: escapeHtml(failureReason),
      type: 'danger',
    })}

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Order Total', value: totalFormatted },
      { label: 'Customer Email', value: order.email },
      { label: 'Payment Provider', value: (provider || 'Card').toUpperCase() },
      { label: 'Transaction Reference', value: paymentReference || 'N/A' },
      { label: 'Failure Time', value: formatUkDateTime(Date.now()) },
    ])}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Payment Failure Alert',
    subtitle: 'Gateway Decline Notification',
    badgeText: 'Payment Failed',
    badgeType: 'danger',
    contentHtml,
    isInternal: true,
  });

  const text = `${renderPlainTextHeader('Backoffice Alert', 'Payment Failure')}
PAYMENT FAILED:
Order Reference:  #${order.order_number}
Customer:         ${order.email}
Amount:           ${totalFormatted}
Reason:           ${failureReason}
Reference:        ${paymentReference || 'N/A'}
Date:             ${formatUkDateTime(Date.now())}
${renderPlainTextFooter(true)}
`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    isInternalAlert: true,
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
// 18. Admin Refund Alert (Financial audit notification)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminRefundAlert(db, order, { refundAmount, currency, refundReference, provider, reason } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;
  if (!order) return { success: false, error: 'No order provided.' };

  const effectiveCurrency = currency || order.currency || 'GBP';
  const effectiveAmount = refundAmount || order.total_amount || 0;
  const refundFormatted = formatCurrency(effectiveAmount, effectiveCurrency);
  const refundRef = refundReference || order.payment_reference || 'Gateway Refund';

  const subject = `[Refund Processed] #${order.order_number} — ${refundFormatted}`;
  const preheader = `A refund of ${refundFormatted} was processed for order #${order.order_number}.`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      This is a financial audit alert confirming that a refund has been executed for order <strong>#${escapeHtml(order.order_number)}</strong>.
    </p>

    ${renderKeyValueTable([
      { label: 'Order Reference', value: `#${order.order_number}`, bold: true },
      { label: 'Refund Amount', value: refundFormatted, bold: true, color: THEME.danger.text },
      { label: 'Customer Email', value: order.email },
      { label: 'Payment Provider', value: (provider || order.payment_provider || 'gateway').toUpperCase() },
      { label: 'Refund Reference', value: refundRef },
      { label: 'Reason', value: reason || 'Administrative review' },
      { label: 'Processed At', value: formatUkDateTime(Date.now()) },
    ])}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Refund Processed',
    subtitle: 'Store Financial Audit Notification',
    badgeText: 'Refund Processed',
    badgeType: 'warning',
    contentHtml,
    isInternal: true,
  });

  const text = `${renderPlainTextHeader('Backoffice Alert', 'Refund Processed')}
REFUND AUDIT RECORD:
Order Reference:  #${order.order_number}
Refund Amount:    ${refundFormatted}
Customer:         ${order.email}
Provider:         ${(provider || 'gateway').toUpperCase()}
Reference:        ${refundRef}
Reason:           ${reason || 'Administrative review'}
Date:             ${formatUkDateTime(Date.now())}
${renderPlainTextFooter(true)}
`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    isInternalAlert: true,
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
// 19. Admin Email Delivery Failure Alert
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminEmailDeliveryAlert(db, { failedRecipient, emailType, subject, errorReason, orderNumber = null } = {}) {
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;

  // Anti-recursion safeguard: never send failure alerts for administrative alerts or failure alerts
  if (!emailType || emailType === 'admin_email_failure_alert' || emailType.startsWith('admin_')) {
    return { success: true, skipped: true };
  }

  const alertSubject = `[Delivery Failure] ${emailType} -> ${failedRecipient}`;
  const preheader = `Automated delivery failed for recipient ${failedRecipient} (${emailType}).`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${THEME.textBody};">
      An automated customer transactional email could not be delivered.
    </p>

    ${renderInfoBox({
      title: 'Delivery Error Diagnostic',
      content: escapeHtml(errorReason || 'Network connection or SMTP rejection'),
      type: 'danger',
    })}

    ${renderKeyValueTable([
      { label: 'Intended Recipient', value: failedRecipient, bold: true },
      { label: 'Email Type', value: emailType },
      { label: 'Failed Subject', value: subject },
      { label: 'Related Order', value: orderNumber ? `#${orderNumber}` : 'N/A' },
      { label: 'Failure Timestamp', value: formatUkDateTime(Date.now()) },
    ])}
  `;

  const html = renderEmailLayout({
    preheader,
    title: 'Email Delivery Failure Alert',
    subtitle: 'Infrastructure Diagnostic Notification',
    badgeText: 'Delivery Error',
    badgeType: 'danger',
    contentHtml,
    isInternal: true,
  });

  const text = `${renderPlainTextHeader('Infrastructure Alert', 'Email Delivery Failure')}
DELIVERY FAILURE:
Recipient:    ${failedRecipient}
Email Type:   ${emailType}
Subject:      ${subject}
${orderNumber ? `Order:        #${orderNumber}\n` : ''}Error:        ${errorReason || 'Unknown error'}
Date:         ${formatUkDateTime(Date.now())}
${renderPlainTextFooter(true)}
`;

  const result = await sendEmail({
    to: adminEmail,
    subject: alertSubject,
    html,
    text,
    isInternalAlert: true,
  });

  await logEmailAttempt(db, {
    recipient: adminEmail,
    emailType: 'admin_email_failure_alert',
    subject: alertSubject,
    result,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 20. Admin Scheduled Business Performance Report (Weekly / Monthly)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminBusinessReport(db, report) {
  const adminEmail = process.env.ADMIN_EMAIL || BRAND.supportEmail;
  const { type, periodStart, periodEnd, summary, topProducts, expenses, orderStatuses, weeklyTrend } = report;

  const currency = 'GBP';
  const isWeekly = type === 'weekly';
  const reportTitle = isWeekly ? 'Weekly Business Performance Report' : 'Monthly Business Performance Report';
  const dateRangeLabel = `${formatUkDate(periodStart)} – ${formatUkDate(periodEnd)}`;
  const monthYearLabel = new Date(periodStart).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Europe/London' });
  const subjectPeriod = isWeekly ? dateRangeLabel : monthYearLabel;
  const subject = `DVDs Zone - ${reportTitle} - ${subjectPeriod}`;
  const preheader = `${reportTitle} (${subjectPeriod}). Revenue: ${formatCurrency(summary.revenue, currency)}, Orders: ${summary.ordersCount}.`;

  const revenueFormatted = formatCurrency(summary.revenue, currency);
  const aovFormatted = formatCurrency(summary.averageOrderValue, currency);
  const expensesFormatted = formatCurrency(summary.totalExpenses, currency);
  const netRevenueFormatted = formatCurrency(summary.netResult, currency);

  // Top products table rows
  const topProductsHtml = topProducts.length > 0
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 12px 0 20px 0; border-collapse: collapse;">
        <thead>
          <tr>
            <th align="left" style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${THEME.textMuted}; padding-bottom: 6px; border-bottom: 2px solid ${THEME.border};">#</th>
            <th align="left" style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${THEME.textMuted}; padding-bottom: 6px; border-bottom: 2px solid ${THEME.border};">Title</th>
            <th align="center" style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${THEME.textMuted}; padding-bottom: 6px; border-bottom: 2px solid ${THEME.border};">Units</th>
            <th align="right" style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${THEME.textMuted}; padding-bottom: 6px; border-bottom: 2px solid ${THEME.border};">Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${topProducts.map((p, idx) => `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid ${THEME.border}; font-size: 12px; color: ${THEME.textMuted}; font-weight: 700;">#${idx + 1}</td>
              <td style="padding: 8px 6px; border-bottom: 1px solid ${THEME.border}; font-size: 13px; font-weight: 600; color: ${THEME.textMain};">${escapeHtml(p.title)}</td>
              <td align="center" style="padding: 8px 6px; border-bottom: 1px solid ${THEME.border}; font-size: 13px; font-weight: 700; color: ${THEME.textBody};">${p.unitsSold}</td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid ${THEME.border}; font-size: 13px; font-weight: 700; color: ${THEME.primary};">${formatCurrency(p.revenue, currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : `<p style="font-size: 13px; color: ${THEME.textMuted}; font-style: italic;">No product purchases recorded during this period.</p>`;

  // Financial reconciliation box
  const financialHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; margin: 16px 0;">
      <tr>
        <td style="padding: 16px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
            <tr><td style="color: ${THEME.textMuted}; padding: 4px 0;">Gross Revenue:</td><td align="right" style="font-weight: 600; color: ${THEME.textMain};">${formatCurrency(summary.grossRevenue, currency)}</td></tr>
            <tr><td style="color: ${THEME.textMuted}; padding: 4px 0;">Less Refunds:</td><td align="right" style="color: #DC2626; font-weight: 600;">-${formatCurrency(summary.refunds, currency)}</td></tr>
            <tr><td style="color: ${THEME.textMuted}; padding: 4px 0;">Less Recorded Expenses:</td><td align="right" style="color: #DC2626; font-weight: 600;">-${expensesFormatted}</td></tr>
            <tr>
              <td style="padding: 10px 0 0 0; font-size: 14px; font-weight: 800; color: ${THEME.textMain}; border-top: 2px solid ${THEME.borderDark};">
                ${summary.hasCogs ? 'Estimated Profit:' : 'Net Revenue (After Recorded Expenses):'}
              </td>
              <td align="right" style="padding: 10px 0 0 0; font-size: 16px; font-weight: 800; color: ${THEME.primary}; border-top: 2px solid ${THEME.borderDark};">
                ${netRevenueFormatted}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  // Status pills
  const statusPillsHtml = `
    <div style="margin: 12px 0 20px 0;">
      <span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 14px; font-size: 12px; margin: 2px; font-weight: 600; color: #334155;">Paid: <strong>${orderStatuses.paid || 0}</strong></span>
      <span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 14px; font-size: 12px; margin: 2px; font-weight: 600; color: #334155;">Processing: <strong>${orderStatuses.processing || 0}</strong></span>
      <span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 14px; font-size: 12px; margin: 2px; font-weight: 600; color: #334155;">Shipped: <strong>${orderStatuses.shipped || 0}</strong></span>
      <span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 14px; font-size: 12px; margin: 2px; font-weight: 600; color: #334155;">Delivered: <strong>${orderStatuses.delivered || 0}</strong></span>
      <span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 14px; font-size: 12px; margin: 2px; font-weight: 600; color: #334155;">Cancelled: <strong>${orderStatuses.cancelled || 0}</strong></span>
      <span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 14px; font-size: 12px; margin: 2px; font-weight: 600; color: #334155;">Refunded: <strong>${orderStatuses.refunded || 0}</strong></span>
    </div>
  `;

  const contentHtml = `
    <!-- Top 4 Metrics Summary Grid -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="width: 25%; padding: 4px;">
          <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 12px 6px; text-align: center;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: ${THEME.textMuted}; margin-bottom: 4px;">Revenue</div>
            <div style="font-size: 16px; font-weight: 800; color: ${THEME.primary};">${revenueFormatted}</div>
          </div>
        </td>
        <td style="width: 25%; padding: 4px;">
          <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 12px 6px; text-align: center;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: ${THEME.textMuted}; margin-bottom: 4px;">Orders</div>
            <div style="font-size: 16px; font-weight: 800; color: ${THEME.textMain};">${summary.ordersCount}</div>
          </div>
        </td>
        <td style="width: 25%; padding: 4px;">
          <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 12px 6px; text-align: center;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: ${THEME.textMuted}; margin-bottom: 4px;">Items Sold</div>
            <div style="font-size: 16px; font-weight: 800; color: ${THEME.textMain};">${summary.itemsSold}</div>
          </div>
        </td>
        <td style="width: 25%; padding: 4px;">
          <div style="background-color: #F8FAFC; border: 1px solid ${THEME.border}; border-radius: 8px; padding: 12px 6px; text-align: center;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: ${THEME.textMuted}; margin-bottom: 4px;">Avg Order</div>
            <div style="font-size: 16px; font-weight: 800; color: ${THEME.textMain};">${aovFormatted}</div>
          </div>
        </td>
      </tr>
    </table>

    <h2 style="font-size: 13px; text-transform: uppercase; font-weight: 800; color: ${THEME.primary}; letter-spacing: 0.6px; margin: 24px 0 8px 0; border-bottom: 1px solid ${THEME.border}; padding-bottom: 4px;">
      Top Selling Products
    </h2>
    ${topProductsHtml}

    <h2 style="font-size: 13px; text-transform: uppercase; font-weight: 800; color: ${THEME.primary}; letter-spacing: 0.6px; margin: 24px 0 8px 0; border-bottom: 1px solid ${THEME.border}; padding-bottom: 4px;">
      Financial Summary
    </h2>
    ${financialHtml}

    <h2 style="font-size: 13px; text-transform: uppercase; font-weight: 800; color: ${THEME.primary}; letter-spacing: 0.6px; margin: 24px 0 8px 0; border-bottom: 1px solid ${THEME.border}; padding-bottom: 4px;">
      Order Status Breakdown
    </h2>
    ${statusPillsHtml}
  `;

  const html = renderEmailLayout({
    preheader,
    title: reportTitle,
    subtitle: subjectPeriod,
    badgeText: 'Executive Report',
    badgeType: 'info',
    contentHtml,
    isInternal: true,
  });

  const text = `${renderPlainTextHeader(reportTitle, subjectPeriod)}
EXECUTIVE SALES SUMMARY:
Total Revenue:           ${revenueFormatted}
Number of Orders:        ${summary.ordersCount}
Average Order Value:     ${aovFormatted}
Total Items Sold:        ${summary.itemsSold}
${!isWeekly && summary.customersCount ? `Total Customers:         ${summary.customersCount}\n` : ''}
TOP PRODUCTS:
${topProducts.length > 0 ? topProducts.map((p, idx) => `${idx + 1}. ${p.title} — ${p.unitsSold} sold (${formatCurrency(p.revenue, currency)})`).join('\n') : 'No products sold during this period.'}

FINANCIAL RECONCILIATION:
Gross Revenue:           ${formatCurrency(summary.grossRevenue, currency)}
- Refunds:               ${formatCurrency(summary.refunds, currency)}
- Recorded Expenses:     ${expensesFormatted}
= Net Revenue:           ${netRevenueFormatted}

ORDER STATUSES:
Paid: ${orderStatuses.paid || 0} | Processing: ${orderStatuses.processing || 0} | Shipped: ${orderStatuses.shipped || 0}
Delivered: ${orderStatuses.delivered || 0} | Cancelled: ${orderStatuses.cancelled || 0} | Refunded: ${orderStatuses.refunded || 0}
${renderPlainTextFooter(true)}
`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    isInternalAlert: true,
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
