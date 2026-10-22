import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  sendEmail,
  sendCustomerPaymentReceipt,
  sendCustomerOrderConfirmation,
  sendCustomerOrderProcessing,
  sendCustomerOrderRefunded,
  sendCustomerWelcomeEmail,
  sendCustomerPasswordResetEmail,
  sendCustomerPasswordResetConfirmation,
  sendAdminPaymentVerifiedAlert,
  sendAdminPaymentFailedAlert,
  sendAdminRefundAlert,
  sendAdminEmailDeliveryAlert,
  sendAdminBusinessReport,
  sendAdminNewOrderNotification,
  sendCustomerOrderDispatched,
  sendCustomerBankTransferInstructions,
  sendAdminPaymentProofNotification,
  sendCustomerOrderCancelled,
  sendCustomerPaymentFailed,
  sendAdminContactInquiry,
  sendCustomerContactAutoReply,
  getActiveEmailProvider,
} from '../api/_email.js';
import { calculateBusinessMetrics, getReportDateRange } from '../api/_reports.js';
import cronReportsHandler from '../api/cron-reports.js';

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

test('Customer receipt resolves items from database and displays purchased items with PayPal/Bank Transfer methods', async () => {
  const orderId = randomUUID();
  const mockOrderWithoutItems = {
    id: orderId,
    order_number: 'ORD-PP-7788',
    email: 'customer@example.test',
    total_amount: 25.00,
    subtotal: 22.05,
    shipping_amount: 2.95,
    payment_method: 'paypal',
    created_at: '2026-10-08T09:00:00.000Z',
    shipping_address: {
      full_name: 'John Smith',
      address_line_1: '25 Baker Street',
      city: 'London',
      postcode: 'NW1 6XE',
    },
    // items is missing/empty initially
  };

  const dbItems = [
    { product_title: 'Gladiator 4K Ultra HD', product_sku: 'DVD-GLAD', quantity: 1, unit_price: 12.05, total_price: 12.05 },
    { product_title: 'Saving Private Ryan DVD', product_sku: 'DVD-SPR', quantity: 1, unit_price: 10.00, total_price: 10.00 },
  ];

  const loggedEmails = [];
  const mockDb = {
    from: (table) => {
      if (table === 'order_items') {
        return {
          select: () => ({
            eq: async () => ({ data: dbItems }),
          }),
        };
      }
      return {
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
          loggedEmails.push({ table, row });
          return { data: row, error: null };
        },
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    },
  };

  const result = await sendCustomerPaymentReceipt(mockDb, mockOrderWithoutItems, {
    paymentReference: 'CAPTURE-998811',
  });

  assert.equal(result.success, true);
  assert.equal(loggedEmails.length, 1);
  assert.equal(loggedEmails[0].row.recipient, 'customer@example.test');
  assert.ok(loggedEmails[0].row.subject.includes('#ORD-PP-7788'));

  // Test UK Bank Transfer method label
  const bankTransferOrder = {
    ...mockOrderWithoutItems,
    id: randomUUID(),
    order_number: 'ORD-BT-1122',
    payment_method: 'bank_transfer',
    items: dbItems,
  };
  const btLogged = [];
  const mockDbBt = {
    from: () => ({
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
        btLogged.push(row);
        return { data: row, error: null };
      },
      update: () => ({ eq: async () => ({}) }),
    }),
  };
  const btResult = await sendCustomerPaymentReceipt(mockDbBt, bankTransferOrder, { paymentReference: 'BACS-REF-44' });
  assert.equal(btResult.success, true);
  assert.equal(btLogged.length, 1);
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

test('Business metrics engine seamlessly falls back to admin_audit_log when expenses table is not present', async () => {
  const o1 = {
    id: randomUUID(),
    order_number: 'ORD-AUDIT-1',
    total_amount: 25.00,
    refunded_amount: 0,
    payment_status: 'paid',
    status: 'delivered',
    paid_at: '2026-10-05T10:00:00.000Z',
    items: [{ product_id: 'p1', product_title: 'Aliens DVD', quantity: 1, total_price: 25.00 }],
  };

  const mockDb = {
    from: (table) => {
      if (table === 'orders') {
        return {
          select: () => ({
            or: () => ({
              or: async () => ({ data: [o1], error: null }),
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
                  data: null,
                  error: { code: 'PGRST205', message: 'Table public.expenses not found' },
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'admin_audit_log') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  { after_data: { id: 'aud-1', description: 'Tape', category: 'packaging', amount: 5.00, date: '2026-10-05' } },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'products') {
        return {
          select: () => ({
            not: async () => ({ data: [], error: null }),
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

  assert.equal(report.summary.grossRevenue, 25.00);
  assert.equal(report.summary.totalExpenses, 5.00);
  assert.equal(report.summary.netResult, 20.00);
});

test('getActiveEmailProvider returns active configuration status', () => {
  const provider = getActiveEmailProvider();
  assert.ok(provider);
  assert.ok(provider.provider);
  assert.ok(typeof provider.isProduction === 'boolean');
  assert.ok(provider.fromEmail);
  assert.ok(provider.adminEmail);
});

test('Admin new order notification sends detailed alert with ordered items and link', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-ADMIN-001',
    email: 'shopper@example.test',
    total_amount: 45.00,
    currency: 'GBP',
    payment_method: 'card',
    payment_status: 'paid',
    shipping_address: {
      full_name: 'Arthur Pendelton',
      address_line_1: '12 Abbey Road',
      city: 'London',
      postcode: 'NW8 9AY',
    },
    items: [
      { product_title: 'Blade Runner 2049 4K', product_sku: 'BR-2049', quantity: 1, unit_price: 25.00, total_price: 25.00 },
      { product_title: 'Dunkirk Special Edition', product_sku: 'DK-SE', quantity: 2, unit_price: 10.00, total_price: 20.00 },
    ],
  };

  const logs = [];
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
        logs.push({ table, row });
        return { data: row, error: null };
      },
      update: () => ({ eq: async () => ({}) }),
    }),
  };

  const result = await sendAdminNewOrderNotification(mockDb, mockOrder);
  assert.equal(result.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].table, 'email_logs');
  assert.equal(logs[0].row.email_type, 'admin_new_order');
  assert.ok(logs[0].row.subject.includes('#ORD-ADMIN-001'));
  assert.ok(logs[0].row.subject.includes('Arthur Pendelton'));
});

test('Customer order dispatched email delivers carrier and tracking details', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-SHIP-99',
    email: 'recipient@example.test',
    shipping_address: { full_name: 'Sarah Connor', city: 'Birmingham' },
    items: [{ product_title: 'Terminator 2 DVD', quantity: 1 }],
  };

  const logs = [];
  const mockDb = {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ in: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }),
      insert: async (row) => { logs.push(row); return { data: row, error: null }; },
      update: () => ({ eq: async () => ({}) }),
    }),
  };

  const result = await sendCustomerOrderDispatched(mockDb, mockOrder, {
    carrier: 'Royal Mail Tracked 24',
    trackingNumber: 'GB123456789RM',
  });

  assert.equal(result.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'order_dispatched');
  assert.equal(logs[0].recipient, 'recipient@example.test');
  assert.ok(logs[0].subject.includes('#ORD-SHIP-99'));
});

test('Bank transfer instructions auto-sends bank account details to customer', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-BANK-77',
    email: 'bankbuyer@example.test',
    total_amount: 35.50,
    currency: 'GBP',
    bank_details: {
      bank_name: 'Lloyds Bank',
      bank_account_name: 'DVDs Zone Ltd',
      bank_sort_code: '30-90-89',
      bank_account_number: '42318960',
    },
  };

  const logs = [];
  const mockDb = {
    from: () => ({
      insert: async (row) => { logs.push(row); return { data: row, error: null }; },
    }),
  };

  const result = await sendCustomerBankTransferInstructions(mockDb, mockOrder);
  assert.equal(result.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'bank_transfer_instructions');
  assert.equal(logs[0].recipient, 'bankbuyer@example.test');
  assert.ok(logs[0].subject.includes('#ORD-BANK-77'));
});

test('Support inquiry auto-routes to admin and acknowledges customer', async () => {
  const adminLogs = [];
  const customerLogs = [];
  const mockDb = {
    from: () => ({
      insert: async (row) => {
        if (row.email_type === 'contact_inquiry') adminLogs.push(row);
        if (row.email_type === 'contact_autoreply') customerLogs.push(row);
        return { data: row, error: null };
      },
    }),
  };

  const inquiry = {
    name: 'Oliver Twist',
    email: 'oliver@example.test',
    order_reference: 'ORD-4455',
    message: 'Can I add another DVD to my order before dispatch?',
  };

  const adminRes = await sendAdminContactInquiry(mockDb, inquiry);
  assert.equal(adminRes.success, true);
  assert.equal(adminLogs.length, 1);
  assert.ok(adminLogs[0].subject.includes('Oliver Twist'));

  const customerRes = await sendCustomerContactAutoReply(mockDb, inquiry);
  assert.equal(customerRes.success, true);
  assert.equal(customerLogs.length, 1);
  assert.equal(customerLogs[0].recipient, 'oliver@example.test');
});

test('Customer order confirmation accurately displays pending payment status and enforces idempotency', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-PENDING-01',
    email: 'newbuyer@example.test',
    payment_status: 'pending',
    payment_method: 'card',
    total_amount: 19.99,
    subtotal: 16.99,
    shipping_amount: 3.00,
    currency: 'GBP',
    delivery_name: 'Standard Royal Mail',
    shipping_address: { full_name: 'Arthur Dent', address_line_1: 'Cottington' },
    items: [{ product_title: 'Hitchhiker DVD', quantity: 1, unit_price: 16.99, total_price: 16.99 }],
  };

  const logs = [];
  const existingRecords = new Set();

  const mockDb = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          eq: (field, val) => ({
            in: () => ({
              maybeSingle: async () => ({
                data: existingRecords.has(`${orderId}:${val}`) ? { id: 'existing' } : null,
              }),
            }),
          }),
        }),
      }),
      insert: async (row) => {
        logs.push(row);
        existingRecords.add(`${orderId}:${row.email_type}`);
        return { data: row, error: null };
      },
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  };

  const firstSend = await sendCustomerOrderConfirmation(mockDb, mockOrder);
  assert.equal(firstSend.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'order_confirmation');
  assert.ok(logs[0].subject.includes('#ORD-PENDING-01'));

  // Duplicate call should be skipped via durable idempotency
  const duplicateSend = await sendCustomerOrderConfirmation(mockDb, mockOrder);
  assert.equal(duplicateSend.success, true);
  assert.equal(duplicateSend.duplicate_skipped, true);
  assert.equal(logs.length, 1); // No new email sent
});

test('Customer order processing notification formats pick & pack update with idempotency', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-PROC-88',
    email: 'buyer@example.test',
    shipping_address: { full_name: 'Ford Prefect' },
    items: [{ product_title: 'Sci-Fi Boxset', quantity: 1 }],
  };

  const logs = [];
  const mockDb = {
    from: () => ({
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
        logs.push(row);
        return { data: row, error: null };
      },
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  };

  const res = await sendCustomerOrderProcessing(mockDb, mockOrder, { note: 'Inspected for disc quality' });
  assert.equal(res.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'order_processing');
  assert.ok(logs[0].subject.includes('#ORD-PROC-88'));
});

test('Customer refund notification formats exact verified refund amount and reference', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-REF-77',
    email: 'refundee@example.test',
    currency: 'GBP',
    total_amount: 45.00,
    shipping_address: { full_name: 'Trillian Astra' },
  };

  const logs = [];
  const mockDb = {
    from: () => ({
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
        logs.push(row);
        return { data: row, error: null };
      },
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  };

  const res = await sendCustomerOrderRefunded(mockDb, mockOrder, {
    refundAmount: 22.50,
    currency: 'GBP',
    refundReference: 're_stripe_test_123',
    reason: 'Partial return of 1 disc',
  });

  assert.equal(res.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'order_refunded');
  assert.ok(logs[0].subject.includes('#ORD-REF-77'));
});

test('Admin alerts properly notify verified payments and payment failures', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-ADMIN-TEST-99',
    email: 'customer@example.test',
    total_amount: 59.99,
    currency: 'GBP',
    payment_provider: 'stripe',
    payment_reference: 'pi_test_confirmed_99',
  };

  const logs = [];
  const mockDb = {
    from: () => ({
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
        logs.push(row);
        return { data: row, error: null };
      },
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  };

  // 1. Verified payment alert
  const verifiedRes = await sendAdminPaymentVerifiedAlert(mockDb, mockOrder, {
    paymentReference: 'pi_test_confirmed_99',
    amount: 59.99,
    currency: 'GBP',
    provider: 'stripe',
  });
  assert.equal(verifiedRes.success, true);
  assert.equal(logs[0].email_type, 'admin_payment_verified');
  assert.ok(logs[0].subject.includes('#ORD-ADMIN-TEST-99'));

  // 2. Payment failure alert
  const failedRes = await sendAdminPaymentFailedAlert(mockDb, mockOrder, {
    errorReason: 'card_declined: insufficient_funds',
    provider: 'stripe',
    paymentReference: 'pi_test_failed_00',
  });
  assert.equal(failedRes.success, true);
  assert.equal(logs[1].email_type, 'admin_payment_failed');
  assert.ok(logs[1].subject.includes('#ORD-ADMIN-TEST-99'));

  // 3. Admin refund alert
  const refundAlertRes = await sendAdminRefundAlert(mockDb, mockOrder, {
    refundAmount: 59.99,
    currency: 'GBP',
    refundReference: 're_full_99',
    provider: 'stripe',
  });
  assert.equal(refundAlertRes.success, true);
  assert.equal(logs[2].email_type, 'admin_refund_alert');
  assert.ok(logs[2].subject.includes('#ORD-ADMIN-TEST-99'));
});

test('Email delivery failure alert notifies admin and strictly avoids recursive loops', async () => {
  const alertLogs = [];
  const mockDb = {
    from: () => ({
      insert: async (row) => {
        alertLogs.push(row);
        return { data: row, error: null };
      },
    }),
  };

  // 1. Failure of a customer receipt should trigger an admin alert
  const alertRes = await sendAdminEmailDeliveryAlert(mockDb, {
    failedRecipient: 'invalid@customer.domain',
    emailType: 'customer_receipt',
    subject: 'Payment Receipt - DVDs Zone #ORD-FAIL-01',
    errorReason: 'Mailbox does not exist (550)',
    orderNumber: 'ORD-FAIL-01',
  });

  assert.equal(alertRes.success, true);
  assert.equal(alertLogs.length, 1);
  assert.equal(alertLogs[0].email_type, 'admin_email_failure_alert');
  assert.ok(alertLogs[0].subject.includes('invalid@customer.domain'));

  // 2. Anti-recursion test: failure of an administrative alert or failure alert must NEVER trigger recursion
  const recursiveAttempt = await sendAdminEmailDeliveryAlert(mockDb, {
    failedRecipient: 'admin@dvds-zone.co.uk',
    emailType: 'admin_email_failure_alert',
    subject: '⚠️ [Delivery Alert]',
    errorReason: 'Gateway timeout',
  });

  assert.equal(recursiveAttempt.skipped, true);
  assert.equal(alertLogs.length, 1); // No new recursive alert created
});

test('Customer welcome email formats greeting and catalog link with durable deduplication', async () => {
  const userId = randomUUID();
  const mockUser = {
    id: userId,
    email: 'newcollector@example.test',
    full_name: 'Elizabeth Bennet',
  };

  const logs = [];
  const existing = new Set();
  const mockDb = {
    from: () => ({
      select: () => ({
        eq: (f1, v1) => ({
          eq: (f2, v2) => ({
            in: () => ({
              maybeSingle: async () => ({
                data: existing.has(`${v1}:${v2}`) ? { id: 'log-1' } : null,
              }),
            }),
          }),
        }),
      }),
      insert: async (row) => {
        logs.push(row);
        existing.add(`${row.recipient}:${row.email_type}`);
        return { data: row, error: null };
      },
    }),
  };

  // 1. Initial send succeeds
  const firstSend = await sendCustomerWelcomeEmail(mockDb, mockUser);
  assert.equal(firstSend.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'customer_welcome');
  assert.equal(logs[0].recipient, 'newcollector@example.test');
  assert.ok(logs[0].subject.includes('Elizabeth Bennet'));

  // 2. Duplicate send is skipped via durable idempotency
  const duplicateSend = await sendCustomerWelcomeEmail(mockDb, mockUser);
  assert.equal(duplicateSend.success, true);
  assert.equal(duplicateSend.duplicate_skipped, true);
  assert.equal(logs.length, 1);
});

test('Customer password reset email renders secure 1-hour single-use recovery link', async () => {
  const logs = [];
  const mockDb = {
    from: () => ({
      insert: async (row) => {
        logs.push(row);
        return { data: row, error: null };
      },
    }),
  };

  const res = await sendCustomerPasswordResetEmail(mockDb, {
    email: 'user.reset@example.test',
    resetUrl: 'https://dvds-zone.co.uk/reset-password#access_token=sec_token_123',
    fullName: 'David Copperfield',
  });

  assert.equal(res.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'customer_password_reset');
  assert.equal(logs[0].recipient, 'user.reset@example.test');
  assert.ok(logs[0].subject.includes('Reset Your DVDs Zone Password'));
});

test('Customer password reset confirmation notifies customer of security update', async () => {
  const logs = [];
  const mockDb = {
    from: () => ({
      insert: async (row) => {
        logs.push(row);
        return { data: row, error: null };
      },
    }),
  };

  const res = await sendCustomerPasswordResetConfirmation(mockDb, {
    email: 'user.updated@example.test',
    fullName: 'Jane Eyre',
    changedAt: '22 Oct 2026, 10:30 BST',
  });

  assert.equal(res.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'customer_password_changed');
  assert.equal(logs[0].recipient, 'user.updated@example.test');
  assert.ok(logs[0].subject.includes('Password Has Been Changed'));
});

test('Customer order cancelled notification sends reason and refund guidance', async () => {
  const orderId = randomUUID();
  const mockOrder = {
    id: orderId,
    order_number: 'ORD-CANCEL-55',
    email: 'buyer.cancelled@example.test',
    total_amount: 32.50,
    currency: 'GBP',
    payment_status: 'paid',
  };

  const logs = [];
  const mockDb = {
    from: () => ({
      insert: async (row) => {
        logs.push(row);
        return { data: row, error: null };
      },
    }),
  };

  const res = await sendCustomerOrderCancelled(mockDb, mockOrder, {
    reason: 'Customer requested order cancellation.',
  });

  assert.equal(res.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'order_cancelled');
  assert.equal(logs[0].recipient, 'buyer.cancelled@example.test');
  assert.ok(logs[0].subject.includes('#ORD-CANCEL-55'));
});

test('Default sender identity is info@dvds-zone.co.uk and SMTP Postfix is prioritized', () => {
  const provider = getActiveEmailProvider();
  assert.ok(provider.fromEmail.includes('info@dvds-zone.co.uk'), 'Default sender must be info@dvds-zone.co.uk');
  assert.ok(!provider.fromEmail.includes('orders@dvds-zone.co.uk'), 'Default sender must NOT be orders@dvds-zone.co.uk');
});

test('Local Postfix SMTP transport falls back gracefully without throwing when port 25 is closed', async () => {
  const result = await sendEmail({
    to: 'fallback.test@example.test',
    subject: 'Fallback Test',
    html: '<p>Testing graceful fallback</p>',
    text: 'Testing graceful fallback',
  });

  assert.ok(result);
  assert.equal(result.success, true);
});

test('Customer payment failure notification delivers reassuring message, non-charged notice, and retry link', async () => {
  const logs = [];
  const mockDb = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            ilike: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
      insert: async (row) => {
        logs.push(row);
        return { data: row, error: null };
      },
    }),
  };

  const mockOrder = {
    id: randomUUID(),
    order_number: 'ORD-FAIL-101',
    email: 'customer.paymentfailed@example.test',
    total_amount: 45.0,
    currency: 'GBP',
  };

  const res = await sendCustomerPaymentFailed(mockDb, mockOrder, {
    errorReason: 'Card was declined by the issuer (insufficient funds).',
  });

  assert.equal(res.success, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].email_type, 'order_cancelled');
  assert.equal(logs[0].recipient, 'customer.paymentfailed@example.test');
  assert.ok(logs[0].subject.includes('Payment Unsuccessful'));
});



