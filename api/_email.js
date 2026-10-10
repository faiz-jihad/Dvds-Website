import { formatMoney } from '../shared/commerce.js';

/**
 * Universal email dispatcher for DVDs Zone.
 * Supports Resend (RESEND_API_KEY), SendGrid (SENDGRID_API_KEY),
 * or graceful simulated delivery in local/test environments.
 */
export async function sendEmail({ to, subject, html, text }) {
  const fromEmail = process.env.EMAIL_FROM || 'DVDs Zone <azrayanltd@gmail.com>';
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;

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
          to: Array.isArray(to) ? to : [to],
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

  if (sendgridKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: (Array.isArray(to) ? to : [to]).map((email) => ({ email })) }],
          from: { email: fromEmail.replace(/.*<([^>]+)>.*/, '$1') || 'azrayanltd@gmail.com', name: 'DVDs Zone' },
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

  // Graceful fallback for local development or when API keys are not yet configured
  console.log(`[email] Simulated delivery to: ${to} | Subject: "${subject}"`);
  return { success: true, provider: 'simulated', simulated: true };
}

/**
 * Log email send attempt to database if email_logs table is available.
 */
export async function logEmailAttempt(db, { orderId = null, recipient, emailType, subject, result }) {
  if (!db) return;
  try {
    await db.from('email_logs').insert({
      order_id: orderId,
      recipient,
      email_type: emailType,
      subject,
      status: result.success ? (result.simulated ? 'simulated' : 'sent') : 'failed',
      error_message: result.error || null,
      provider: result.provider || null,
    });
  } catch (err) {
    // Non-blocking: table might still be in migration or schema cache
    console.warn('[email] Could not record email log in DB:', err.message);
  }
}

/**
 * Generate and send the professional Customer Payment Receipt.
 * Triggered ONLY by verified Stripe webhook.
 */
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

  let items = Array.isArray(order.items) ? order.items : [];
  if (!items.length && db) {
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
      : order.payment_method === 'bank_transfer' || order.payment_provider === 'bank_transfer'
        ? 'UK Bank Transfer'
        : 'Credit/Debit Card (Stripe)';

  const subject = `Payment Receipt - DVDs Zone #${order.order_number}`;

  // Plaintext body matching business specification
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
If you have any questions regarding your order, please contact our support team at azrayanltd@gmail.com.
`;

  // Clean, responsive, branded HTML receipt
  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; margin-top: 24px; margin-bottom: 24px; }
    .header { background: #0B0F19; padding: 28px 32px; border-bottom: 3px solid #1E40AF; text-align: left; }
    .brand-title { color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .brand-sub { color: #94A3B8; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 32px; }
    .badge-paid { display: inline-block; background: #DCFCE7; color: #15803D; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; }
    .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .meta-label { color: #64748B; font-weight: 500; }
    .meta-value { color: #0F172A; font-weight: 600; text-align: right; }
    .items-table { width: 100%; margin: 24px 0; border-top: 1px solid #E2E8F0; }
    .items-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B; padding: 12px 0 8px; border-bottom: 1px solid #E2E8F0; }
    .items-table td { padding: 12px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
    .total-section { margin-top: 16px; padding-top: 16px; border-top: 2px solid #0B0F19; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
    .grand-total { font-size: 18px; font-weight: 800; color: #1E40AF; margin-top: 10px; }
    .customer-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-top: 24px; font-size: 13px; line-height: 1.6; }
    .btn-view { display: inline-block; background: #1E40AF; color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; margin-top: 24px; text-align: center; }
    .footer { background: #F8FAFC; padding: 24px 32px; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="padding: 16px 12px;">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">DVDS ZONE</h1>
        <p class="brand-sub">Official Payment Receipt</p>
      </div>
      <div class="content">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 18px; margin: 0; color: #0F172A;">Thank you for your purchase.</h2>
          <span class="badge-paid">Paid</span>
        </div>
        <p style="color: #64748B; font-size: 14px; margin: 8px 0 20px;">We have received your payment. Your order is now being processed for delivery.</p>

        <div class="meta-box">
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

        <div class="total-section">
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

        <div class="customer-box">
          <strong style="color: #0F172A; display: block; margin-bottom: 4px;">Delivery Address:</strong>
          <span style="color: #334155;">${customerName}</span><br>
          <span style="color: #64748B; white-space: pre-line;">${addressLines}</span>
        </div>

        <div style="text-align: center; margin-top: 28px;">
          <a href="${viewOrderUrl}" class="btn-view" target="_blank">View Your Order Details</a>
        </div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px;">Thank you for shopping with <strong>DVDs Zone</strong>.</p>
        <p style="margin: 0;">If you have any questions regarding your order, please contact our support team at <a href="mailto:azrayanltd@gmail.com" style="color: #1E40AF; text-decoration: none;">azrayanltd@gmail.com</a>.</p>
        <p style="margin: 12px 0 0; font-size: 11px; color: #94A3B8;">This is an automated transaction receipt. No sensitive card credentials or CVV codes are stored or transmitted.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

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

  // Stamp receipt timestamp on orders table if column exists
  try {
    await db.from('orders').update({ receipt_sent_at: new Date().toISOString() }).eq('id', order.id);
  } catch {
    // Non-blocking
  }

  return result;
}

/**
 * Generate and send the automated Admin Business Performance Report.
 */
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

  // Plaintext version
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

  // Clean, executive summary HTML email
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
    .grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 28px; }
    .card-cell { display: table-cell; width: 25%; padding: 0 4px; vertical-align: top; }
    .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 10px; text-align: center; }
    .card-title { font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.5px; margin: 0 0 6px; }
    .card-val { font-size: 17px; font-weight: 800; color: #0F172A; margin: 0; }
    .section-title { font-size: 13px; text-transform: uppercase; font-weight: 800; color: #1E40AF; letter-spacing: 0.8px; margin: 24px 0 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
    .data-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B; padding: 8px 6px; border-bottom: 1px solid #E2E8F0; }
    .data-table td { padding: 10px 6px; border-bottom: 1px solid #F1F5F9; color: #0F172A; }
    .fin-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-top: 16px; }
    .fin-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .fin-total { border-top: 2px solid #0B0F19; padding-top: 10px; margin-top: 10px; font-size: 16px; font-weight: 800; color: #1E40AF; display: flex; justify-content: space-between; }
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
      <!-- 4 Metric Cards -->
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

      <!-- Top Selling Products -->
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

      <!-- Expenses Section -->
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

      <!-- Financial Summary -->
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

      <!-- Order Status Breakdown -->
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

  // Store into report_history table
  try {
    const reportId = (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'rep-' + Date.now());
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
      // Fallback: save to admin_audit_log if table pending migration
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
