import test from 'node:test';
import assert from 'node:assert/strict';
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
} from '../api/_email-design-system.js';

test('1. escapeHtml sanitizes dangerous entities and handles nullish gracefully', () => {
  assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml("Tom & Jerry's"), 'Tom &amp; Jerry&#39;s');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(''), '');
  assert.equal(escapeHtml(12345), '12345');
});

test('2. formatCurrency and UK date helpers format reliably', () => {
  assert.equal(formatCurrency(24.99, 'GBP'), '£24.99');
  assert.equal(formatCurrency(0, 'GBP'), '£0.00');
  
  const formattedDate = formatUkDate('2026-10-22T10:00:00.000Z');
  assert.ok(formattedDate.includes('2026'));
  assert.ok(formattedDate.includes('Oct'));

  const formattedDateTime = formatUkDateTime('2026-10-22T10:00:00.000Z');
  assert.ok(formattedDateTime.includes('2026'));
  assert.ok(formattedDateTime.includes(':'));
});

test('3. renderEmailLayout renders complete responsive HTML table shell with legal identity', () => {
  const html = renderEmailLayout({
    preheader: 'Testing preheader preview snippet',
    title: 'Order Status Update',
    subtitle: 'Fulfillment Notification',
    badgeText: 'Dispatched',
    badgeType: 'success',
    contentHtml: '<p>Parcel is in transit via Royal Mail Tracked 48.</p>',
  });

  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<html'));
  assert.ok(html.includes('Testing preheader preview snippet'));
  assert.ok(html.includes('Order Status Update'));
  assert.ok(html.includes('Fulfillment Notification'));
  assert.ok(html.includes('Dispatched'));
  assert.ok(html.includes('Parcel is in transit via Royal Mail Tracked 48.'));
  
  // Verify company registration and legal disclosures
  assert.ok(html.includes('AZRAYAN LTD'));
  assert.ok(html.includes('13894195'));
  assert.ok(html.includes('azrayanltd@gmail.com'));
});

test('4. renderButton generates bulletproof table structure and accessible touch targets', () => {
  const btn = renderButton({
    text: 'Track Royal Mail Delivery',
    url: 'https://dvds-zone.co.uk/order-success/test-id',
    variant: 'primary',
  });

  assert.ok(btn.includes('Track Royal Mail Delivery'));
  assert.ok(btn.includes('https://dvds-zone.co.uk/order-success/test-id'));
  assert.ok(btn.includes('v:roundrect')); // Outlook VML support
});

test('5. renderInfoBox and renderSecurityNotice render appropriate semantic palettes', () => {
  const infoBox = renderInfoBox({
    title: 'Payment Verification',
    content: 'All cards authenticated with 3D Secure.',
    type: 'success',
  });
  assert.ok(infoBox.includes('Payment Verification'));
  assert.ok(infoBox.includes('All cards authenticated with 3D Secure.'));
  assert.ok(infoBox.includes(THEME.success.border));

  const securityBox = renderSecurityNotice([
    'Never share your password with anyone.',
    'Link expires in 60 minutes.',
  ]);
  assert.ok(securityBox.includes('Security &amp; Safety Guidance'));
  assert.ok(securityBox.includes('Never share your password with anyone.'));
  assert.ok(securityBox.includes('Link expires in 60 minutes.'));
});

test('6. renderOrderItemsTable renders products cleanly and handles empty arrays', () => {
  const empty = renderOrderItemsTable([]);
  assert.ok(empty.includes('No items specified'));

  const itemsTable = renderOrderItemsTable([
    { product_title: 'Blade Runner 2049 DVD', product_sku: 'BR-2049', quantity: 2, total_price: 18.00 },
    { product_title: 'Pulp Fiction Collector Edition', product_sku: 'PF-94', quantity: 1, total_price: 12.50 },
  ], 'GBP');

  assert.ok(itemsTable.includes('Blade Runner 2049 DVD'));
  assert.ok(itemsTable.includes('BR-2049'));
  assert.ok(itemsTable.includes('2'));
  assert.ok(itemsTable.includes('£18.00'));
  assert.ok(itemsTable.includes('Pulp Fiction Collector Edition'));
  assert.ok(itemsTable.includes('£12.50'));
});

test('7. renderOrderTotalsTable renders subtotal, delivery, discounts, and total with border emphasis', () => {
  const totalsTable = renderOrderTotalsTable({
    subtotal: 30.50,
    shippingAmount: 2.95,
    deliveryName: 'Tracked 48',
    discountAmount: 5.00,
    totalAmount: 28.45,
    currency: 'GBP',
  });

  assert.ok(totalsTable.includes('£30.50'));
  assert.ok(totalsTable.includes('Tracked 48'));
  assert.ok(totalsTable.includes('£2.95'));
  assert.ok(totalsTable.toLowerCase().includes('discount'));
  assert.ok(totalsTable.includes('£5.00'));
  assert.ok(totalsTable.includes('£28.45'));
});

test('8. renderAddressCard renders multi-line UK addresses safely without undefined placeholders', () => {
  const addr = renderAddressCard({
    title: 'Customer Shipping Address',
    name: 'Sherlock Holmes',
    lines: ['221B Baker Street', 'Marylebone', 'London', 'NW1 6XE', 'United Kingdom'],
  });

  assert.ok(addr.includes('Customer Shipping Address'));
  assert.ok(addr.includes('Sherlock Holmes'));
  assert.ok(addr.includes('221B Baker Street'));
  assert.ok(addr.includes('NW1 6XE'));
  assert.ok(!addr.includes('undefined'));
  assert.ok(!addr.includes('null'));
  assert.ok(!addr.includes('[object Object]'));
});

test('9. Plain text generators produce legible and comprehensive non-HTML alternatives', () => {
  const header = renderPlainTextHeader('Order Confirmation', 'Order #ORD-1234');
  assert.ok(header.toUpperCase().includes('ORDER CONFIRMATION'));
  assert.ok(header.includes('Order #ORD-1234'));

  const customerFooter = renderPlainTextFooter(false);
  assert.ok(customerFooter.includes('Thank you for choosing DVDs Zone UK') || customerFooter.includes('DVDs Zone'));
  assert.ok(customerFooter.includes('AZRAYAN LTD'));
  assert.ok(customerFooter.includes(BRAND.supportEmail));

  const internalFooter = renderPlainTextFooter(true);
  assert.ok(internalFooter.includes('Backoffice') || internalFooter.includes('Confidential'));
});
