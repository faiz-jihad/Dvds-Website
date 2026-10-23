/**
 * DVD Zone — Transactional Email Templates
 * Clean, professional HTML emails with no gradients.
 * Design language: solid #1769E0 brand blue, white card on light grey (#F8FAFC) bg,
 * Inter font stack, clear typographic hierarchy.
 */

export interface OrderEmailItem {
  title: string;
  sku?: string;
  format?: string;
  quantity: number;
  unit_price: number;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount?: number;
  promoCode?: string;
  total: number;
  currency?: string;
  shippingAddress: {
    full_name: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country?: string;
  };
  paymentMethod?: string;
  estimatedDelivery?: string;
  orderDate?: string;
  orderId?: string;
}

const BRAND_BLUE = '#1769E0';
const BODY_BG = '#F1F5F9';
const CARD_BG = '#FFFFFF';
const BORDER = '#E2E8F0';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const TEXT_MUTED = '#94A3B8';
const SUCCESS_GREEN = '#16A34A';
const ROW_ALT = '#F8FAFC';

function formatGBPCents(pence: number, currency = 'GBP'): string {
  const symbol = currency === 'GBP' ? '£' : currency + ' ';
  return `${symbol}${(pence / 100).toFixed(2)}`;
}

function formatDate(iso?: string): string {
  if (!iso) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Generates a clean, professional order confirmation HTML email.
 * Compatible with major email clients (Outlook, Gmail, Apple Mail).
 */
export function buildOrderConfirmationEmail(data: OrderEmailData): string {
  const {
    orderNumber,
    customerName,
    customerEmail,
    items,
    subtotal,
    shippingCost,
    discountAmount,
    promoCode,
    total,
    currency = 'GBP',
    shippingAddress,
    paymentMethod,
    estimatedDelivery,
    orderDate,
    orderId,
  } = data;

  const fmt = (p: number) => formatGBPCents(p, currency);
  const orderUrl = orderId
    ? `https://dvds-zone.co.uk/order-confirmation/${orderId}`
    : `https://dvds-zone.co.uk/account/orders`;

  const itemRows = items
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 0 ? CARD_BG : ROW_ALT};">
      <td style="padding:12px 16px; font-size:13px; color:${TEXT_PRIMARY}; border-bottom:1px solid ${BORDER};">
        <span style="font-weight:600; display:block; margin-bottom:2px;">${item.title}</span>
        ${item.sku ? `<span style="font-size:11px; color:${TEXT_MUTED}; font-family:monospace;">SKU: ${item.sku}</span>` : ''}
        ${item.format ? `<span style="font-size:11px; color:${TEXT_SECONDARY}; margin-left:${item.sku ? '8px' : '0'};">${item.format}</span>` : ''}
      </td>
      <td style="padding:12px 16px; font-size:13px; color:${TEXT_SECONDARY}; text-align:center; border-bottom:1px solid ${BORDER}; white-space:nowrap;">${item.quantity}</td>
      <td style="padding:12px 16px; font-size:13px; color:${TEXT_PRIMARY}; text-align:right; font-weight:600; border-bottom:1px solid ${BORDER}; white-space:nowrap;">${fmt(item.unit_price * item.quantity)}</td>
    </tr>`
    )
    .join('');

  const addressLines = [
    shippingAddress.full_name,
    shippingAddress.line1,
    shippingAddress.line2,
    shippingAddress.city,
    shippingAddress.county,
    shippingAddress.postcode,
    shippingAddress.country && shippingAddress.country !== 'GB' ? shippingAddress.country : 'United Kingdom',
  ]
    .filter(Boolean)
    .join('<br>');

  const firstName = customerName?.split(' ')[0] || 'Customer';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Order Confirmed — ${orderNumber} | DVD Zone UK</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0; mso-table-rspace:0; }
    img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    body { margin:0; padding:0; background-color:${BODY_BG}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
    a { color:${BRAND_BLUE}; text-decoration:none; }
    a:hover { text-decoration:underline; }
    @media only screen and (max-width:600px) {
      .email-container { width:100% !important; }
      .mobile-padding { padding:20px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BODY_BG};">
  <!-- Inbox preview text -->
  <div style="display:none;font-size:1px;color:${BODY_BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Order ${orderNumber} confirmed — thank you for shopping with DVD Zone UK. Your physical media is being prepared for dispatch.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BODY_BG};min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:12px;border:1px solid ${BORDER};overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:${BRAND_BLUE};padding:28px 32px;text-align:center;">
              <a href="https://dvds-zone.co.uk" style="text-decoration:none;">
                <span style="font-size:22px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;">DVD Zone</span>
                <span style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.75);margin-left:4px;">UK</span>
              </a>
              <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.70);letter-spacing:0.8px;text-transform:uppercase;font-weight:500;">Order Confirmation</p>
            </td>
          </tr>

          <!-- SUCCESS HEADLINE -->
          <tr>
            <td style="padding:36px 32px 24px;text-align:center;border-bottom:1px solid ${BORDER};" class="mobile-padding">
              <div style="display:inline-block;width:56px;height:56px;background-color:${SUCCESS_GREEN};border-radius:50%;line-height:56px;text-align:center;margin-bottom:16px;">
                <span style="color:#FFFFFF;font-size:26px;font-weight:900;line-height:56px;vertical-align:middle;">&#10003;</span>
              </div>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${TEXT_PRIMARY};letter-spacing:-0.3px;line-height:1.2;">Order Confirmed!</h1>
              <p style="margin:0 0 4px;font-size:15px;color:${TEXT_SECONDARY};line-height:1.6;">
                Thank you, <strong style="color:${TEXT_PRIMARY};">${firstName}</strong>. Your order has been received and is being prepared.
              </p>
              <p style="margin:12px 0 0;font-size:13px;color:${TEXT_MUTED};font-family:monospace;letter-spacing:0.5px;">
                Order&nbsp;#&nbsp;<strong style="color:${TEXT_PRIMARY};font-family:monospace;">${orderNumber}</strong>
                &nbsp;&bull;&nbsp;${formatDate(orderDate)}
              </p>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td style="padding:24px 32px 0;text-align:center;" class="mobile-padding">
              <a href="${orderUrl}" style="display:inline-block;background-color:${BRAND_BLUE};color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:8px;">
                View Order Status &rarr;
              </a>
              <p style="margin:12px 0 0;font-size:11px;color:${TEXT_MUTED};">
                Track at <a href="https://dvds-zone.co.uk/account/orders" style="color:${BRAND_BLUE};">dvds-zone.co.uk/account/orders</a>
              </p>
            </td>
          </tr>

          <!-- ORDER ITEMS -->
          <tr>
            <td style="padding:28px 32px 0;" class="mobile-padding">
              <h2 style="margin:0 0 14px;font-size:12px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.8px;">Order Summary</h2>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:8px;border:1px solid ${BORDER};overflow:hidden;">
                <tr style="background-color:${ROW_ALT};">
                  <td style="padding:10px 16px;font-size:11px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid ${BORDER};">Item</td>
                  <td style="padding:10px 16px;font-size:11px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid ${BORDER};text-align:center;">Qty</td>
                  <td style="padding:10px 16px;font-size:11px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid ${BORDER};text-align:right;">Price</td>
                </tr>
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- TOTALS -->
          <tr>
            <td style="padding:16px 32px 0;" class="mobile-padding">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:${TEXT_SECONDARY};">Subtotal</td>
                  <td style="padding:5px 0;font-size:13px;color:${TEXT_PRIMARY};text-align:right;font-weight:600;">${fmt(subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:${TEXT_SECONDARY};">Delivery</td>
                  <td style="padding:5px 0;font-size:13px;color:${shippingCost === 0 ? SUCCESS_GREEN : TEXT_PRIMARY};text-align:right;font-weight:600;">
                    ${shippingCost === 0 ? 'FREE' : fmt(shippingCost)}
                  </td>
                </tr>
                ${discountAmount && discountAmount > 0 ? `
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:${SUCCESS_GREEN};">Discount${promoCode ? ` (${promoCode})` : ''}</td>
                  <td style="padding:5px 0;font-size:13px;color:${SUCCESS_GREEN};text-align:right;font-weight:600;">-${fmt(discountAmount)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:12px 0 4px;border-top:2px solid ${BORDER};font-size:16px;font-weight:800;color:${TEXT_PRIMARY};">Total Paid</td>
                  <td style="padding:12px 0 4px;border-top:2px solid ${BORDER};font-size:16px;font-weight:800;color:${BRAND_BLUE};text-align:right;">${fmt(total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DELIVERY + PAYMENT INFO -->
          <tr>
            <td style="padding:24px 32px;" class="mobile-padding">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" style="padding-right:10px;vertical-align:top;">
                    <div style="background-color:${ROW_ALT};border:1px solid ${BORDER};border-radius:8px;padding:14px 16px;">
                      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.6px;">Delivery Address</p>
                      <p style="margin:0;font-size:13px;color:${TEXT_PRIMARY};line-height:1.7;">${addressLines}</p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:10px;vertical-align:top;">
                    <div style="background-color:${ROW_ALT};border:1px solid ${BORDER};border-radius:8px;padding:14px 16px;">
                      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.6px;">Delivery Info</p>
                      ${paymentMethod ? `<p style="margin:0 0 6px;font-size:12px;color:${TEXT_SECONDARY};">
                        <span style="color:${TEXT_MUTED};font-size:11px;">Payment:</span><br>
                        <strong style="color:${TEXT_PRIMARY};">${paymentMethod}</strong>
                      </p>` : ''}
                      <p style="margin:0;font-size:12px;color:${TEXT_SECONDARY};">
                        <span style="color:${TEXT_MUTED};font-size:11px;">Est. Arrival:</span><br>
                        <strong style="color:${TEXT_PRIMARY};">${estimatedDelivery || '2-3 Working Days'}</strong>
                      </p>
                      <p style="margin:8px 0 0;font-size:11px;color:${TEXT_MUTED};">Royal Mail Tracked</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DISPATCH NOTICE -->
          <tr>
            <td style="padding:0 32px 28px;" class="mobile-padding">
              <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#1E40AF;line-height:1.6;">
                  <strong style="display:block;margin-bottom:3px;">Same-Day Dispatch</strong>
                  Orders placed before <strong>2 PM GMT</strong> Monday-Saturday are dispatched same day via Royal Mail Tracked.
                  You'll receive a separate dispatch notification with your tracking number.
                </p>
              </div>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid ${BORDER};margin:0;" /></td></tr>

          <!-- TRUST BADGES -->
          <tr>
            <td style="padding:24px 32px;" class="mobile-padding">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="33%" style="text-align:center;padding:0 6px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:20px;">&#128666;</p>
                    <p style="margin:0;font-size:11px;font-weight:700;color:${TEXT_PRIMARY};">Free Delivery</p>
                    <p style="margin:2px 0 0;font-size:10px;color:${TEXT_MUTED};">Royal Mail Tracked</p>
                  </td>
                  <td width="33%" style="text-align:center;padding:0 6px;vertical-align:top;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
                    <p style="margin:0 0 4px;font-size:20px;">&#9989;</p>
                    <p style="margin:0;font-size:11px;font-weight:700;color:${TEXT_PRIMARY};">Genuine Discs</p>
                    <p style="margin:2px 0 0;font-size:10px;color:${TEXT_MUTED};">Region 2 UK / Free</p>
                  </td>
                  <td width="33%" style="text-align:center;padding:0 6px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:20px;">&#8617;&#65039;</p>
                    <p style="margin:0;font-size:11px;font-weight:700;color:${TEXT_PRIMARY};">30-Day Returns</p>
                    <p style="margin:2px 0 0;font-size:10px;color:${TEXT_MUTED};">Hassle-free guarantee</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:${ROW_ALT};border-top:1px solid ${BORDER};padding:24px 32px;text-align:center;border-radius:0 0 12px 12px;" class="mobile-padding">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${TEXT_PRIMARY};">DVD Zone UK</p>
              <p style="margin:0 0 6px;font-size:12px;color:${TEXT_MUTED};">
                <a href="https://dvds-zone.co.uk" style="color:${BRAND_BLUE};">dvds-zone.co.uk</a>
                &nbsp;&bull;&nbsp;
                <a href="mailto:azrayanltd@gmail.com" style="color:${BRAND_BLUE};">azrayanltd@gmail.com</a>
                &nbsp;&bull;&nbsp;
                <a href="tel:+447400320038" style="color:${TEXT_MUTED};text-decoration:none;">+44 7400 320038</a>
              </p>
              <p style="margin:0 0 12px;font-size:11px;color:${TEXT_MUTED};">AZRAYAN LTD &bull; Company No. 13894195 &bull; England &amp; Wales</p>
              <p style="margin:0;font-size:11px;color:${TEXT_MUTED};line-height:1.6;">
                This email was sent to <strong>${customerEmail}</strong> because you placed an order on DVD Zone UK.<br>
                <a href="https://dvds-zone.co.uk/returns" style="color:${TEXT_MUTED};">Returns Policy</a>
                &nbsp;&bull;&nbsp;
                <a href="https://dvds-zone.co.uk/privacy" style="color:${TEXT_MUTED};">Privacy Policy</a>
                &nbsp;&bull;&nbsp;
                <a href="https://dvds-zone.co.uk/contact" style="color:${TEXT_MUTED};">Contact Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates a clean password reset email HTML.
 */
export function buildPasswordResetEmail(opts: {
  customerName?: string;
  resetUrl: string;
}): string {
  const { customerName, resetUrl } = opts;
  const firstName = customerName?.split(' ')[0] || 'Customer';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password — DVD Zone UK</title>
  <style>
    body { margin:0;padding:0;background-color:${BODY_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
    a { color:${BRAND_BLUE};text-decoration:none; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BODY_BG};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BODY_BG};min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:12px;border:1px solid ${BORDER};overflow:hidden;">
          <tr>
            <td style="background-color:${BRAND_BLUE};padding:24px 32px;text-align:center;">
              <span style="font-size:20px;font-weight:900;color:#FFFFFF;">DVD Zone</span>
              <span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.75);margin-left:4px;">UK</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background-color:${BRAND_BLUE};border-radius:50%;line-height:52px;margin-bottom:16px;">
                <span style="color:#FFFFFF;font-size:22px;font-weight:900;line-height:52px;vertical-align:middle;">&#128274;</span>
              </div>
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${TEXT_PRIMARY};">Reset Your Password</h1>
              <p style="margin:0 0 24px;font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;max-width:380px;margin-left:auto;margin-right:auto;">
                Hi ${firstName}, we received a request to reset the password for your DVD Zone account. Click the button below to create a new password.
              </p>
              <a href="${resetUrl}" style="display:inline-block;background-color:${BRAND_BLUE};color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:8px;">
                Reset Password &rarr;
              </a>
              <p style="margin:20px 0 0;font-size:12px;color:${TEXT_MUTED};">
                This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px 16px;">
                <p style="margin:0;font-size:12px;color:#15803D;line-height:1.6;">
                  <strong>Security tip:</strong> DVD Zone will never ask for your password via email or phone.
                  If you're unsure, visit <a href="https://dvds-zone.co.uk" style="color:#15803D;font-weight:600;">dvds-zone.co.uk</a> directly.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:${ROW_ALT};border-top:1px solid ${BORDER};padding:20px 32px;text-align:center;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 4px;font-size:12px;color:${TEXT_MUTED};">
                <a href="https://dvds-zone.co.uk" style="color:${BRAND_BLUE};">dvds-zone.co.uk</a>
                &nbsp;&bull;&nbsp;
                <a href="mailto:azrayanltd@gmail.com" style="color:${BRAND_BLUE};">azrayanltd@gmail.com</a>
              </p>
              <p style="margin:0;font-size:11px;color:${TEXT_MUTED};">AZRAYAN LTD &bull; Company No. 13894195 &bull; England &amp; Wales</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates a dispatch / shipping notification email HTML.
 */
export function buildDispatchEmail(opts: {
  customerName?: string;
  customerEmail: string;
  orderNumber: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  items: Pick<OrderEmailItem, 'title' | 'quantity'>[];
}): string {
  const { customerName, customerEmail, orderNumber, trackingNumber, trackingUrl, estimatedDelivery, items } = opts;
  const firstName = customerName?.split(' ')[0] || 'Customer';

  const itemList = items
    .map(
      (it, i) =>
        `<tr style="background:${i % 2 === 0 ? CARD_BG : ROW_ALT};">
      <td style="padding:10px 16px;font-size:13px;color:${TEXT_PRIMARY};border-bottom:1px solid ${BORDER};">
        <strong>x${it.quantity}</strong>&nbsp;${it.title}
      </td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Order Has Been Dispatched — DVD Zone UK</title>
  <style>
    body { margin:0;padding:0;background-color:${BODY_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
    a { color:${BRAND_BLUE};text-decoration:none; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BODY_BG};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BODY_BG};min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:12px;border:1px solid ${BORDER};overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_BLUE};padding:24px 32px;text-align:center;">
              <span style="font-size:20px;font-weight:900;color:#FFFFFF;">DVD Zone</span>
              <span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.75);margin-left:4px;">UK</span>
              <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.70);text-transform:uppercase;letter-spacing:0.5px;">Dispatch Notification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 20px;text-align:center;">
              <p style="margin:0 0 4px;font-size:36px;line-height:1;">&#128230;</p>
              <h1 style="margin:12px 0 6px;font-size:22px;font-weight:800;color:${TEXT_PRIMARY};">Your Order is On Its Way!</h1>
              <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;">
                Hi <strong style="color:${TEXT_PRIMARY};">${firstName}</strong>, order
                <strong style="font-family:monospace;color:${TEXT_PRIMARY};">#${orderNumber}</strong>
                has been dispatched via Royal Mail Tracked.
              </p>
            </td>
          </tr>
          ${trackingNumber ? `<!-- Tracking box -->
          <tr>
            <td style="padding:0 32px 20px;">
              <div style="background-color:${ROW_ALT};border:1px solid ${BORDER};border-radius:8px;padding:16px 20px;text-align:center;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.6px;">Tracking Reference</p>
                <p style="margin:0 0 12px;font-size:20px;font-weight:800;color:${TEXT_PRIMARY};font-family:monospace;letter-spacing:1px;">${trackingNumber}</p>
                ${trackingUrl ? `<a href="${trackingUrl}" style="display:inline-block;background-color:${BRAND_BLUE};color:#FFFFFF;font-size:13px;font-weight:700;padding:10px 24px;border-radius:7px;text-decoration:none;">
                  Track Your Parcel &rarr;
                </a>` : ''}
              </div>
            </td>
          </tr>` : ''}
          <!-- Estimated delivery -->
          <tr>
            <td style="padding:0 32px 20px;">
              <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#1E40AF;line-height:1.6;">
                  <strong>Estimated Delivery:</strong> ${estimatedDelivery || '2-3 Working Days'}<br>
                  <span style="font-size:12px;color:#3B82F6;">Royal Mail Tracked 48 &bull; Delivered Monday-Saturday</span>
                </p>
              </div>
            </td>
          </tr>
          <!-- Items shipped -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.6px;">Items Dispatched</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
                ${itemList}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${ROW_ALT};border-top:1px solid ${BORDER};padding:20px 32px;text-align:center;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 4px;font-size:12px;color:${TEXT_MUTED};">
                Questions?&nbsp;
                <a href="mailto:azrayanltd@gmail.com" style="color:${BRAND_BLUE};">azrayanltd@gmail.com</a>
                &nbsp;&bull;&nbsp;
                <a href="tel:+447400320038" style="color:${TEXT_MUTED};text-decoration:none;">+44 7400 320038</a>
              </p>
              <p style="margin:0;font-size:11px;color:${TEXT_MUTED};">
                Sent to ${customerEmail} &bull; AZRAYAN LTD &bull; Co. No. 13894195
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
