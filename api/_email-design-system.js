import { formatMoney } from '../shared/commerce.js';

/**
 * DVDs Zone — Universal Transactional Email Design System (Premium Edition)
 *
 * Brand: DVDs Zone (AZRAYAN LTD)
 * Visual direction: Premium British e-commerce, editorial, modern, clean, trustworthy.
 * Aesthetic: Midnight Navy + Champagne Gold, editorial serif headlines,
 *            generous whitespace, layered card depth.
 *
 * Compatible with: Apple Mail, Gmail (Web, iOS, Android), Outlook (Desktop, Web, Mac),
 *                  Yahoo, Thunderbird.
 */

export const BRAND = {
  name: 'DVDs Zone',
  tagline: 'Official Physical Media Archive & UK Store',
  operatedBy: 'AZRAYAN LTD',
  companyNumber: '13894195',
  supportEmail: 'info@dvds-zone.co.uk',
  supportPhone: '+44 7400 320038',
  fromEmail: 'DVDs Zone <info@dvds-zone.co.uk>',
  siteUrl: process.env.SITE_URL || 'https://dvds-zone.co.uk',
  logoUrl: 'https://dvds-zone.co.uk/brand/logo-transparent.png',
};

// ---------------------------------------------------------------------------
// Design Tokens — Premium British Editorial
// ---------------------------------------------------------------------------
export const THEME = {
  // Surfaces
  bg: '#F4F5F7',           // Warm neutral stone
  bgDeep: '#ECEEF2',       // Deeper stone for footer
  cardBg: '#FFFFFF',
  cardInner: '#FBFBFC',    // Subtle inner surface

  // Header — Midnight Navy
  headerBg: '#0A1024',
  headerBgDeep: '#060A18',
  headerAccent: '#C8A862', // Champagne Gold
  headerText: '#FFFFFF',
  headerSub: '#8B96AC',

  // Premium Accent — Champagne Gold
  gold: '#C8A862',
  goldDeep: '#A8884A',
  goldSoft: '#F5EFE0',

  // Text
  textMain: '#0B1226',
  textBody: '#2E3A52',
  textMuted: '#5C6B85',
  textLight: '#98A4B8',

  // Borders & Dividers
  border: '#E4E7ED',
  borderDark: '#C9CFD9',
  hairline: '#EDEFF3',

  // Actions — Restrained Royal Blue
  primary: '#1E3A8A',
  primaryHover: '#152C6B',

  // Semantic State Palettes (refined, low-saturation for premium feel)
  success: {
    border: '#BEE3C8',
    bg: '#F2FBF4',
    text: '#166534',
    badgeBg: '#E7F6EB',
    badgeText: '#166534',
  },
  info: {
    border: '#C4D2ED',
    bg: '#F3F6FC',
    text: '#1E3A8A',
    badgeBg: '#E4EBF9',
    badgeText: '#1E3A8A',
  },
  warning: {
    border: '#EBD9A8',
    bg: '#FDF9EE',
    text: '#8A5A00',
    badgeBg: '#F7EDCF',
    badgeText: '#8A5A00',
  },
  danger: {
    border: '#EFC4CC',
    bg: '#FDF3F4',
    text: '#9F1239',
    badgeBg: '#F8E0E4',
    badgeText: '#9F1239',
  },
  neutral: {
    border: '#E4E7ED',
    bg: '#F7F8FA',
    text: '#2E3A52',
    badgeBg: '#EEF0F4',
    badgeText: '#3F4C66',
  },
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatCurrency(amount, currency = 'GBP') {
  return formatMoney(amount, currency);
}

export function formatUkDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
}

export function formatUkDateTime(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

// ---------------------------------------------------------------------------
// Shared inline style helpers
// ---------------------------------------------------------------------------
const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONT_SERIF =
  "Georgia, 'Times New Roman', 'Iowan Old Style', 'Palatino Linotype', serif";

const microCaps = (color, size = 10) =>
  `font-family: ${FONT_SANS}; font-size: ${size}px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${color};`;

// ---------------------------------------------------------------------------
// Primary Layout
// ---------------------------------------------------------------------------
export function renderEmailLayout({
  preheader = '',
  title,
  subtitle = 'Official Customer Notification',
  badgeText = null,
  badgeType = 'info',
  contentHtml,
  isInternal = false,
  footerNote = null,
}) {
  const safePreheader = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeBadgeText = badgeText ? escapeHtml(badgeText) : null;
  const badgeStyle = THEME[badgeType] || THEME.info;

  const headerBg = isInternal ? '#0A0E1A' : THEME.headerBg;
  const headerAccent = isInternal ? '#DC2626' : THEME.headerAccent;

  const systemBadge = isInternal
    ? `<span style="background:#7F1D1D; color:#FEE2E2; font-family:${FONT_SANS}; font-size:9px; font-weight:800; padding:3px 9px; border-radius:3px; letter-spacing:1.5px; text-transform:uppercase;">BACKOFFICE</span>`
    : '';

  const preheaderBlock = safePreheader
    ? `<!--[if !mso]><!-->
       <div style="display:none; font-size:1px; color:#FFFFFF; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">
         ${safePreheader}
         &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
       </div>
       <!--<![endif]-->`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${safeTitle}</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style type="text/css">
    html, body {
      margin:0 !important; padding:0 !important;
      height:100% !important; width:100% !important;
      background-color:${THEME.bg};
      -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;
      font-family:${FONT_SANS};
      color:${THEME.textBody};
    }
    table, td {
      mso-table-lspace:0pt !important; mso-table-rspace:0pt !important;
      border-collapse:collapse !important;
    }
    img {
      -ms-interpolation-mode:bicubic; border:0; height:auto;
      line-height:100%; outline:none; text-decoration:none; display:block;
    }
    a { color:${THEME.primary}; text-decoration:underline; }
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; max-width:100% !important; }
      .content-padding { padding:28px 20px !important; }
      .header-padding  { padding:24px 20px !important; }
      .footer-padding  { padding:26px 20px !important; }
      .mobile-full-width { width:100% !important; display:block !important; }
      .mobile-stack { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .mobile-text-center { text-align:center !important; }
      .mobile-pt-12 { padding-top:12px !important; }
      .headline { font-size:22px !important; line-height:1.3 !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${THEME.bg};">
  ${preheaderBlock}

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${THEME.bg}; table-layout:fixed;">
    <tr>
      <td align="center" style="padding:36px 14px 44px 14px;">

        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="600"><tr><td align="center" valign="top" width="600">
        <![endif]-->

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="email-container" style="max-width:600px; margin:0 auto; background-color:${THEME.cardBg}; border:1px solid ${THEME.border}; border-radius:4px; overflow:hidden; box-shadow:0 1px 2px rgba(11,18,38,0.04), 0 12px 32px -8px rgba(11,18,38,0.10);">

          <!-- ══════════ HEADER ══════════ -->
          <tr>
            <td class="header-padding" style="background-color:${headerBg}; padding:30px 36px 28px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle" align="left">
                    <a href="${BRAND.siteUrl}" target="_blank" style="text-decoration:none; display:inline-block;">
                      <span style="font-family:${FONT_SANS}; font-size:22px; font-weight:900; letter-spacing:3px; color:${THEME.headerText}; text-transform:uppercase;">
                        DVDS<span style="color:${THEME.gold};">ZONE</span>
                      </span>
                    </a>
                  </td>
                  ${systemBadge ? `<td valign="middle" align="right">${systemBadge}</td>` : ''}
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:14px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td valign="middle" align="left">
                          <span style="${microCaps(THEME.headerSub, 10)}">${safeSubtitle}</span>
                        </td>
                        <td valign="middle" align="right" style="width:60px;">
                          <div style="height:1px; background-color:${headerAccent}; opacity:0.6;"></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Gold hairline separator -->
          <tr>
            <td style="height:2px; background:linear-gradient(90deg, ${THEME.gold} 0%, ${THEME.gold} 40%, ${headerBg} 40%); line-height:2px; font-size:2px;">&nbsp;</td>
          </tr>

          <!-- ══════════ BODY ══════════ -->
          <tr>
            <td class="content-padding" style="padding:40px 40px 32px 40px; background-color:${THEME.cardBg};">

              <!-- Title + badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td valign="top" align="left">
                    <h1 class="headline" style="margin:0; font-family:${FONT_SERIF}; font-size:24px; font-weight:400; line-height:1.28; color:${THEME.textMain}; letter-spacing:-0.2px;">
                      ${safeTitle}
                    </h1>
                  </td>
                  ${
                    safeBadgeText
                      ? `<td valign="top" align="right" style="padding-left:16px; white-space:nowrap;">
                          <span style="display:inline-block; background-color:${badgeStyle.badgeBg}; color:${badgeStyle.badgeText}; font-family:${FONT_SANS}; font-size:9.5px; font-weight:800; padding:5px 11px; border-radius:2px; text-transform:uppercase; letter-spacing:1.5px; border:1px solid ${badgeStyle.border};">
                            ${safeBadgeText}
                          </span>
                        </td>`
                      : ''
                  }
                </tr>
              </table>

              ${contentHtml}

            </td>
          </tr>

          <!-- ══════════ FOOTER ══════════ -->
          <tr>
            <td class="footer-padding" style="background-color:${THEME.bgDeep}; padding:30px 40px; border-top:1px solid ${THEME.border};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <span style="${microCaps(THEME.textMuted, 9.5)}">${BRAND.tagline}</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <div style="height:1px; width:48px; background-color:${THEME.gold}; opacity:0.6; margin:0 auto;"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:${FONT_SANS}; font-size:12px; line-height:1.7; color:${THEME.textMuted};">
                    <p style="margin:0 0 4px 0;">
                      <strong style="color:${THEME.textBody}; font-weight:700;">${BRAND.name}</strong>
                      &nbsp;&bull;&nbsp;
                      Operated by <strong style="color:${THEME.textBody}; font-weight:700;">${BRAND.operatedBy}</strong>
                    </p>
                    <p style="margin:0 0 12px 0; font-size:11px; color:${THEME.textLight};">
                      Registered in England &amp; Wales &bull; Company No. ${BRAND.companyNumber}
                    </p>
                    <p style="margin:0 0 10px 0;">
                      <a href="mailto:${BRAND.supportEmail}" style="color:${THEME.primary}; font-weight:600; text-decoration:none;">${BRAND.supportEmail}</a>
                      &nbsp;&bull;&nbsp;
                      <a href="tel:${BRAND.supportPhone.replace(/\s+/g, '')}" style="color:${THEME.textMuted}; text-decoration:none;">${BRAND.supportPhone}</a>
                    </p>
                    ${
                      footerNote
                        ? `<p style="margin:0 0 10px 0; font-size:11px; color:${THEME.textLight};">${escapeHtml(footerNote)}</p>`
                        : ''
                    }
                    <p style="margin:14px 0 0 0; font-size:10.5px; line-height:1.6; color:${THEME.textLight}; border-top:1px solid ${THEME.border}; padding-top:14px;">
                      ${
                        isInternal
                          ? 'CONFIDENTIAL INTERNAL NOTIFICATION &bull; AUTHORISED BACKOFFICE USE ONLY'
                          : 'This is an official transactional message regarding your DVDs Zone account or order. You received this because of an active account or transaction.'
                      }
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!--[if (gte mso 9)|(IE)]>
        </td></tr></table>
        <![endif]-->

        <!-- Below-card subtle mark -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px; margin:20px auto 0 auto;">
          <tr>
            <td align="center" style="font-family:${FONT_SANS}; font-size:9.5px; letter-spacing:2px; text-transform:uppercase; color:${THEME.textLight};">
              ${BRAND.siteUrl.replace(/^https?:\/\//, '')}
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Primary CTA Button — Premium Navy with Gold accent
// ---------------------------------------------------------------------------
export function renderButton({ text, url, variant = 'primary', align = 'center' }) {
  const safeText = escapeHtml(text);
  const safeUrl = escapeHtml(url);

  if (variant === 'secondary') {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto; text-align:${align};">
        <tr>
          <td align="${align}">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="8%" strokecolor="${THEME.borderDark}" strokeweight="1pt" fillcolor="${THEME.cardBg}">
            <w:anchorlock/>
            <center style="color:${THEME.textMain};font-family:${FONT_SANS};font-size:13px;font-weight:700;letter-spacing:0.4px;">${safeText}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${safeUrl}" target="_blank" style="display:inline-block; background-color:${THEME.cardBg}; color:${THEME.textMain} !important; font-family:${FONT_SANS}; font-size:13px; font-weight:700; text-decoration:none; padding:14px 30px; border-radius:3px; border:1px solid ${THEME.borderDark}; letter-spacing:0.4px;">
              ${safeText}
            </a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>
    `;
  }

  // Primary — deep navy, gold bottom accent
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto; text-align:${align};">
      <tr>
        <td align="${align}">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:46px;v-text-anchor:middle;width:260px;" arcsize="8%" strokecolor="${THEME.primary}" fillcolor="${THEME.primary}">
          <w:anchorlock/>
          <center style="color:#FFFFFF;font-family:${FONT_SANS};font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">${safeText}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${safeUrl}" target="_blank" style="display:inline-block; background-color:${THEME.primary}; color:#FFFFFF !important; font-family:${FONT_SANS}; font-size:12.5px; font-weight:700; text-decoration:none; padding:15px 32px; border-radius:3px; text-align:center; mso-padding-alt:0; letter-spacing:1.4px; text-transform:uppercase; border-bottom:2px solid ${THEME.gold};">
            ${safeText}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Info / Callout Box
// ---------------------------------------------------------------------------
export function renderInfoBox({ title = null, content, type = 'info' }) {
  const pal = THEME[type] || THEME.info;
  const safeTitle = title ? escapeHtml(title) : null;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${pal.bg}; border:1px solid ${pal.border}; border-left:3px solid ${pal.text}; border-radius:3px; margin:22px 0; table-layout:fixed;">
      <tr>
        <td style="padding:18px 20px; font-family:${FONT_SANS}; font-size:13px; line-height:1.65; color:${pal.text};">
          ${safeTitle ? `<strong style="display:block; margin-bottom:6px; ${microCaps(pal.text, 10)}">${safeTitle}</strong>` : ''}
          <div style="color:${pal.text};">${content}</div>
        </td>
      </tr>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Security Notice
// ---------------------------------------------------------------------------
export function renderSecurityNotice(bullets = []) {
  const bulletItems = bullets
    .map((b) => `<li style="margin-bottom:6px; line-height:1.55;">${escapeHtml(b)}</li>`)
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${THEME.goldSoft}; border:1px solid #E8DDBE; border-left:3px solid ${THEME.goldDeep}; border-radius:3px; margin:24px 0;">
      <tr>
        <td style="padding:18px 20px; font-family:${FONT_SANS}; font-size:12.5px; line-height:1.6; color:#6B5019;">
          <strong style="display:block; margin-bottom:8px; ${microCaps('#6B5019', 10)}">
            Security &amp; Safety Guidance
          </strong>
          <ul style="margin:0; padding-left:18px; color:#6B5019;">
            ${bulletItems}
          </ul>
        </td>
      </tr>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Key-Value Details Table
// ---------------------------------------------------------------------------
export function renderKeyValueTable(rows = []) {
  if (!rows || rows.length === 0) return '';
  const renderedRows = rows
    .map(
      (r, idx) => `
      <tr>
        <td style="padding:9px 0; font-family:${FONT_SANS}; font-size:12.5px; color:${THEME.textMuted}; width:42%; vertical-align:top; border-bottom:${idx === rows.length - 1 ? 'none' : `1px solid ${THEME.hairline}`};">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding:9px 0; font-family:${FONT_SANS}; font-size:12.5px; color:${r.color || THEME.textMain}; font-weight:${r.bold ? '700' : '500'}; text-align:right; width:58%; vertical-align:top; border-bottom:${idx === rows.length - 1 ? 'none' : `1px solid ${THEME.hairline}`};">
          ${r.isRawHtml ? r.value : escapeHtml(r.value)}
        </td>
      </tr>`
    )
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0; background-color:${THEME.cardInner}; border:1px solid ${THEME.border}; border-radius:3px;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${renderedRows}
          </table>
        </td>
      </tr>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Order Items Table
// ---------------------------------------------------------------------------
export function renderOrderItemsTable(items = [], currency = 'GBP') {
  if (!items || items.length === 0) {
    return `<p style="font-family:${FONT_SANS}; font-size:13px; color:${THEME.textMuted}; font-style:italic;">No items specified.</p>`;
  }

  const rows = items
    .map((item) => {
      const title = escapeHtml(item.product_title || 'DVD Item');
      const sku = item.product_sku
        ? `<span style="font-family:${FONT_SANS}; font-size:10.5px; color:${THEME.textLight}; display:block; margin-top:3px; letter-spacing:0.4px;">SKU ${escapeHtml(item.product_sku)}</span>`
        : '';
      const qty = item.quantity || 1;
      const totalFormatted = formatCurrency(
        item.total_price || item.unit_price || 0,
        currency
      );

      return `
        <tr>
          <td style="padding:14px 0; border-bottom:1px solid ${THEME.hairline}; vertical-align:middle;">
            <strong style="font-family:${FONT_SANS}; color:${THEME.textMain}; font-size:13px; font-weight:600; display:block; line-height:1.45;">${title}</strong>
            ${sku}
          </td>
          <td align="center" style="padding:14px 12px; border-bottom:1px solid ${THEME.hairline}; font-family:${FONT_SANS}; font-size:12px; color:${THEME.textMuted}; vertical-align:middle; white-space:nowrap;">
            &times;${qty}
          </td>
          <td align="right" style="padding:14px 0; border-bottom:1px solid ${THEME.hairline}; font-family:${FONT_SANS}; font-size:13px; font-weight:700; color:${THEME.textMain}; vertical-align:middle; white-space:nowrap;">
            ${totalFormatted}
          </td>
        </tr>`;
    })
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 10px 0; border-collapse:collapse;">
      <thead>
        <tr>
          <th align="left" style="${microCaps(THEME.textMuted, 9.5)} padding-bottom:10px; border-bottom:1px solid ${THEME.textMain};">
            Item
          </th>
          <th align="center" style="${microCaps(THEME.textMuted, 9.5)} padding-bottom:10px; border-bottom:1px solid ${THEME.textMain}; width:60px;">
            Qty
          </th>
          <th align="right" style="${microCaps(THEME.textMuted, 9.5)} padding-bottom:10px; border-bottom:1px solid ${THEME.textMain}; width:90px;">
            Price
          </th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Order Totals
// ---------------------------------------------------------------------------
export function renderOrderTotalsTable({
  subtotal,
  shippingAmount,
  deliveryName = 'Standard UK Delivery',
  discountAmount = 0,
  totalAmount,
  currency = 'GBP',
}) {
  const subFormatted = formatCurrency(subtotal || 0, currency);
  const shipFormatted = formatCurrency(shippingAmount || 0, currency);
  const discFormatted = discountAmount ? formatCurrency(discountAmount, currency) : null;
  const totFormatted = formatCurrency(totalAmount || 0, currency);
  const safeDelivery = escapeHtml(deliveryName);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:14px 0 24px 0;">
      <tr>
        <td style="padding:5px 0; font-family:${FONT_SANS}; font-size:12.5px; color:${THEME.textMuted};">Subtotal</td>
        <td align="right" style="padding:5px 0; font-family:${FONT_SANS}; font-size:12.5px; color:${THEME.textMain}; font-weight:500;">${subFormatted}</td>
      </tr>
      <tr>
        <td style="padding:5px 0; font-family:${FONT_SANS}; font-size:12.5px; color:${THEME.textMuted};">Delivery &mdash; ${safeDelivery}</td>
        <td align="right" style="padding:5px 0; font-family:${FONT_SANS}; font-size:12.5px; color:${THEME.textMain}; font-weight:500;">${shipFormatted}</td>
      </tr>
      ${
        discFormatted
          ? `<tr>
              <td style="padding:5px 0; font-family:${FONT_SANS}; font-size:12.5px; color:${THEME.success.text};">Promotional discount</td>
              <td align="right" style="padding:5px 0; font-family:${FONT_SANS}; font-size:12.5px; color:${THEME.success.text}; font-weight:600;">&minus;${discFormatted}</td>
            </tr>`
          : ''
      }
      <tr>
        <td style="padding:16px 0 0 0; font-family:${FONT_SANS}; font-size:11px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:${THEME.textMain}; border-top:1px solid ${THEME.textMain};">
          Total
        </td>
        <td align="right" style="padding:14px 0 0 0; font-family:${FONT_SERIF}; font-size:20px; font-weight:400; color:${THEME.primary}; border-top:1px solid ${THEME.textMain};">
          ${totFormatted}
        </td>
      </tr>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Address Card
// ---------------------------------------------------------------------------
export function renderAddressCard({ title = 'Delivery Address', name, lines = [] }) {
  const safeTitle = escapeHtml(title);
  const safeName = escapeHtml(name || '');
  const cleanLines = (Array.isArray(lines) ? lines : [lines])
    .filter(Boolean)
    .map((l) => escapeHtml(l))
    .join('<br>');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${THEME.cardInner}; border:1px solid ${THEME.border}; border-radius:3px; margin:18px 0;">
      <tr>
        <td style="padding:16px 20px; font-family:${FONT_SANS}; font-size:12.5px; line-height:1.65; color:${THEME.textBody};">
          <strong style="display:block; margin-bottom:8px; ${microCaps(THEME.textMain, 9.5)}">
            ${safeTitle}
          </strong>
          ${safeName ? `<strong style="color:${THEME.textMain}; font-weight:600;">${safeName}</strong><br>` : ''}
          <span style="color:${THEME.textMuted};">${cleanLines}</span>
        </td>
      </tr>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Plain Text Generators
// ---------------------------------------------------------------------------
export function renderPlainTextHeader(title, subtitle) {
  const sep = '='.repeat(54);
  return `${sep}
DVDs Zone UK - ${title.toUpperCase()}
${subtitle}
${sep}
`;
}

export function renderPlainTextFooter(isInternal = false) {
  const sep = '-'.repeat(54);
  if (isInternal) {
    return `
${sep}
DVDs Zone UK  -  Automated Backoffice Notification
Confidential  -  Store Admin Use Only
`;
  }

  return `
${sep}
Thank you for choosing DVDs Zone UK.
${BRAND.tagline}
Operated by ${BRAND.operatedBy} (Company No. ${BRAND.companyNumber})

Need help? Contact our support team:
Email: ${BRAND.supportEmail}
Phone: ${BRAND.supportPhone}
Website: ${BRAND.siteUrl}
`;
}