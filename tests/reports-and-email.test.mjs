import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sendEmail, sendCustomerPaymentReceipt, sendAdminBusinessReport } from '../api/_email.js';
import { calculateBusinessMetrics, getReportDateRange } from '../api/_reports.js';

test('Date range helper calculates proper Weekly and Monthly periods', () => {
  const weekly = getReportDateRange('weekly');
  assert.ok(weekly.start instanceof Date);
  assert.ok(weekly.end instanceof Date);
  assert.ok(weekly.start < weekly.end);
  // Weekly starts at UTC 00:00:00 and ends at 23:59:59
  assert.equal(weekly.start.getUTCHours(), 0);
  assert.equal(weekly.end.getUTCHours(), 23);

  const monthly = getReportDateRange('monthly');
  assert.ok(monthly.start instanceof Date);
  assert.ok(monthly.end instanceof Date);
  assert.equal(monthly.start.getUTCDate(), 1);
  assert.ok(monthly.start < monthly.end);
});

test('Customer payment receipt generates correct branded text & HTML without card/CVV data', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-TEST-9921',
    email: 'buyer@example.test',
    total_amount: 32.50,
    subtotal: 29.55,
    shipping_amount: 2.95,
    discount_amount: 0,
    currency: 'GBP',
    delivery_name: 'Royal Mail Tracked 48',
    payment_reference: 'pi_test_stripe_secret_ref_123',
    created_at: '2026-10-06T12:00:00.000Z',
    shipping_address: {
      full_name: 'Jane Doe',
      address_line_1: '10 High Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    items: [
      { product_id: randomUUID(), product_title: 'The Matrix DVD', product_sku: 'DVD-MTX', quantity: 2, unit_price: 10.00, total_price: 20.00 },
      { product_id: randomUUID(), product_title: 'Inception DVD', product_sku: 'DVD-INC', quantity: 1, unit_price: 9.55, total_price: 9.55 },
    ],
  };

  const emailLogs = [];
  const mockDb = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
      insert: async (row) => {
        emailLogs.push({ table, row });
        return { data: row, error: null };
      },
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  };

  const result = await sendCustomerPaymentReceipt(mockDb, mockOrder, {
    paymentReference: 'pi_test_stripe_secret_ref_123',
    paidAt: '2026-10-06T12:05:00.000Z',
  });

  assert.equal(result.success, true);
  assert.equal(emailLogs.length, 1);
  assert.equal(emailLogs[0].table, 'email_logs');
  assert.equal(emailLogs[0].row.recipient, 'buyer@example.test');
  assert.ok(emailLogs[0].row.subject.includes('#ORD-TEST-9921'));

  // Verify that full credit card numbers or CVV are never mentioned
  const logSubject = emailLogs[0].row.subject;
  assert.doesNotMatch(logSubject, /\d{16}/);
  assert.doesNotMatch(logSubject, /cvv/i);
});

test('Customer receipt skips duplicate delivery if already sent', async () => {
  const mockOrder = {
    id: randomUUID(),
    order_number: 'ORD-DUP-01',
    email: 'buyer@example.test',
    total_amount: 15.00,
  };

  const mockDb = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => ({
              maybeSingle: async () => ({ data: { id: 'existing-log-id' } }),
            }),
          }),
        }),
      }),
    }),
  };

  const result = await sendCustomerPaymentReceipt(mockDb, mockOrder, { paymentReference: 'pi_123' });
  assert.equal(result.duplicate_skipped, true);
});

test('Business metrics engine calculates authoritative sales, refunds, expenses, and label', async () => {
  const o1 = {
    id: randomUUID(),
    order_number: 'ORD-1',
    email: 'alice@example.test',
    total_amount: 30.00,
    refunded_amount: 0,
    payment_status: 'paid',
    status: 'processing',
    paid_at: '2026-10-05T10:00:00.000Z',
    items: [{ product_id: 'p1', product_title: 'Interstellar DVD', quantity: 2, total_price: 30.00 }],
  };
  const o2 = {
    id: randomUUID(),
    order_number: 'ORD-2',
    email: 'bob@example.test',
    total_amount: 50.00,
    refunded_amount: 10.00, // partially refunded
    payment_status: 'partially_refunded',
    status: 'delivered',
    paid_at: '2026-10-06T11:00:00.000Z',
    items: [
      { product_id: 'p1', product_title: 'Interstellar DVD', quantity: 1, total_price: 15.00 },
      { product_id: 'p2', product_title: 'Gladiator DVD', quantity: 2, total_price: 35.00 },
    ],
  };
  const oPending = {
    id: randomUUID(),
    order_number: 'ORD-PENDING',
    email: 'pending@example.test',
    total_amount: 100.00,
    refunded_amount: 0,
    payment_status: 'pending', // Must NOT be counted in revenue!
    status: 'pending',
    created_at: '2026-10-05T12:00:00.000Z',
  };

  const mockDb = {
    from: (table) => {
      if (table === 'orders') {
        return {
          select: () => ({
            or: () => ({
              or: async () => ({ data: [o1, o2, oPending], error: null }),
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => ({
                order: async () => ({
                  data: [
                    { id: 'e1', description: 'Royal Mail post bags', category: 'packaging', amount: 12.50, date: '2026-10-05' },
                    { id: 'e2', description: 'Stripe gateway fees', category: 'stripe_fees', amount: 2.10, date: '2026-10-06' },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'products') {
        return {
          select: () => ({
            not: async () => ({ data: [], error: null }), // No cost_price data
          }),
        };
      }
      return { select: () => ({}) };
    },
  };

  const report = await calculateBusinessMetrics(mockDb, {
    type: 'custom',
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-10T23:59:59.999Z',
  });

  // Gross = 30 + 50 = 80. Refunds = 10. Net revenue = 70.
  assert.equal(report.summary.grossRevenue, 80.00);
  assert.equal(report.summary.refunds, 10.00);
  assert.equal(report.summary.revenue, 70.00);
  assert.equal(report.summary.ordersCount, 2); // Excludes pending
  assert.equal(report.summary.itemsSold, 5); // 2 + 1 + 2
  assert.equal(report.summary.totalExpenses, 14.60); // 12.50 + 2.10

  // Net Revenue After Recorded Expenses = 70 - 14.60 = 55.40
  assert.equal(report.summary.netResult, 55.40);
  assert.equal(report.summary.hasCogs, false);
  assert.equal(report.summary.resultLabel, 'Net Revenue After Recorded Expenses');

  // Verify Top Products: Interstellar has 3 units, Gladiator has 2 units
  assert.equal(report.topProducts[0].title, 'Interstellar DVD');
  assert.equal(report.topProducts[0].unitsSold, 3);
  assert.equal(report.topProducts[1].title, 'Gladiator DVD');
  assert.equal(report.topProducts[1].unitsSold, 2);
});

test('Admin business report formats executive summary and records to report_history', async () => {
  const historyEntries = [];
  const mockDb = {
    from: (table) => ({
      insert: async (row) => {
        historyEntries.push({ table, row });
        return { data: row, error: null };
      },
    }),
  };

  const mockReport = {
    type: 'weekly',
    periodStart: '2026-09-28T00:00:00.000Z',
    periodEnd: '2026-10-04T23:59:59.999Z',
    summary: {
      grossRevenue: 1250.00,
      refunds: 0,
      revenue: 1250.00,
      ordersCount: 42,
      averageOrderValue: 29.76,
      itemsSold: 67,
      totalExpenses: 85.00,
      hasCogs: false,
      netResult: 1165.00,
      resultLabel: 'Net Revenue After Recorded Expenses',
    },
    topProducts: [
      { title: 'The Matrix DVD', unitsSold: 18, revenue: 360.00 },
      { title: 'Inception DVD', unitsSold: 12, revenue: 240.00 },
    ],
    expenses: {
      total: 85.00,
      items: [{ date: '2026-10-01', category: 'shipping', description: 'Royal Mail postage', amount: 85.00 }],
    },
    orderStatuses: {
      paid: 42,
      processing: 8,
      shipped: 21,
      delivered: 90,
      cancelled: 3,
      refunded: 2,
    },
  };

  const result = await sendAdminBusinessReport(mockDb, mockReport);
  assert.equal(result.success, true);
  assert.equal(historyEntries.length, 2); // 1 email_logs, 1 report_history
  const history = historyEntries.find((h) => h.table === 'report_history');
  assert.ok(history);
  assert.equal(history.row.report_type, 'weekly');
  assert.equal(history.row.status, 'sent');
  assert.equal(history.row.payload.summary.ordersCount, 42);
});
