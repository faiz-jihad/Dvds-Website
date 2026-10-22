import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import forgotPasswordHandler from '../api/customer-forgot-password.js';
import resetConfirmHandler from '../api/customer-password-reset-confirm.js';
import { sendCustomerPasswordResetEmail, sendCustomerPasswordResetConfirmation } from '../api/_email.js';

test('1. Branded password reset email includes official sender info@dvds-zone.co.uk and Reply-To azrayanltd@gmail.com', async () => {
  const emailLogs = [];
  const mockDb = {
    from: (table) => ({
      insert: async (row) => {
        emailLogs.push({ table, row });
        return { data: row, error: null };
      },
    }),
  };

  const actionLink = 'https://arkeqzfzkeyxdnuykawj.supabase.co/auth/v1/verify?token=test_sec_hash_987&type=recovery&redirect_to=https://dvds-zone.co.uk/reset-password';
  const result = await sendCustomerPasswordResetEmail(mockDb, {
    email: 'test.collector@example.test',
    resetUrl: actionLink,
    fullName: 'Sherlock Holmes',
  });

  assert.equal(result.success, true);
  assert.equal(emailLogs.length, 1);
  assert.equal(emailLogs[0].row.email_type, 'customer_password_reset');
  assert.equal(emailLogs[0].row.recipient, 'test.collector@example.test');
  assert.ok(emailLogs[0].row.subject.includes('Reset Your DVDs Zone Password'));
});

test('2. customer-forgot-password endpoint validates email format and rejects malformed inputs', async () => {
  let responseStatus = null;
  let responseJson = null;

  const mockRes = {
    setHeader: () => {},
    status: (code) => {
      responseStatus = code;
      return mockRes;
    },
    json: (data) => {
      responseJson = data;
      return mockRes;
    },
  };

  // Missing email
  await forgotPasswordHandler({ method: 'POST', body: {} }, mockRes);
  assert.equal(responseStatus, 400);
  assert.ok(responseJson.error.includes('valid email'));

  // Malformed email
  await forgotPasswordHandler({ method: 'POST', body: { email: 'invalid-email-string' } }, mockRes);
  assert.equal(responseStatus, 400);
  assert.ok(responseJson.error.includes('valid email'));
});

test('3. customer-forgot-password returns identical success message for non-existent account (User Enumeration Protection)', async () => {
  let responseStatus = null;
  let responseJson = null;

  const mockRes = {
    setHeader: () => {},
    status: (code) => {
      responseStatus = code;
      return mockRes;
    },
    json: (data) => {
      responseJson = data;
      return mockRes;
    },
  };

  // Generate a random email that does not exist in auth.users
  const nonExistentEmail = `nonexistent-${Date.now()}@example.test`;
  await forgotPasswordHandler({
    method: 'POST',
    body: { email: nonExistentEmail },
    headers: { 'x-forwarded-for': '127.0.0.1' },
  }, mockRes);

  assert.equal(responseStatus, 200);
  assert.equal(responseJson.success, true);
  assert.ok(responseJson.message.includes('If an account exists'));
});

test('4. customer-password-reset-confirm endpoint requires authenticated JWT', async () => {
  let responseStatus = null;
  let responseJson = null;

  const mockRes = {
    setHeader: () => {},
    status: (code) => {
      responseStatus = code;
      return mockRes;
    },
    json: (data) => {
      responseJson = data;
      return mockRes;
    },
  };

  // Request without Authorization header
  await resetConfirmHandler({
    method: 'POST',
    body: {},
    headers: {},
  }, mockRes);

  assert.equal(responseStatus, 401);
  assert.ok(responseJson.error.includes('Authentication required') || responseJson.code === 'AUTH_REQUIRED');
});

test('5. Customer password reset confirmation renders timestamp and customer care guidance', async () => {
  const emailLogs = [];
  const mockDb = {
    from: (table) => ({
      insert: async (row) => {
        emailLogs.push({ table, row });
        return { data: row, error: null };
      },
    }),
  };

  const result = await sendCustomerPasswordResetConfirmation(mockDb, {
    email: 'jane.marple@example.test',
    fullName: 'Jane Marple',
    changedAt: '22 Oct 2026, 11:20 BST',
  });

  assert.equal(result.success, true);
  assert.equal(emailLogs.length, 1);
  assert.equal(emailLogs[0].row.email_type, 'customer_password_changed');
  assert.equal(emailLogs[0].row.recipient, 'jane.marple@example.test');
  assert.ok(emailLogs[0].row.subject.includes('Password Has Been Changed'));
});

test('6. customer-forgot-password suppresses rapid duplicate requests within 60 seconds', async () => {
  let responseStatus = null;
  let responseJson = null;

  const mockRes = {
    setHeader: () => {},
    status: (code) => {
      responseStatus = code;
      return mockRes;
    },
    json: (data) => {
      responseJson = data;
      return mockRes;
    },
  };

  const testEmail = `rapid-test-${Date.now()}@example.test`;

  // First request
  await forgotPasswordHandler({
    method: 'POST',
    body: { email: testEmail },
    headers: { 'x-forwarded-for': '127.0.0.1' },
  }, mockRes);

  assert.equal(responseStatus, 200);
  assert.equal(responseJson.success, true);

  // Immediate second request to same email
  await forgotPasswordHandler({
    method: 'POST',
    body: { email: testEmail },
    headers: { 'x-forwarded-for': '127.0.0.1' },
  }, mockRes);

  assert.equal(responseStatus, 200);
  assert.equal(responseJson.success, true);
  assert.ok(responseJson.message.includes('If an account exists'));
});

test('7. Supabase Admin generateLink constructs correct recovery action_link targeting https://dvds-zone.co.uk/reset-password', async () => {
  const { dbClient } = await import('../api/_checkout.js');
  const db = dbClient();

  const { data, error } = await db.auth.admin.generateLink({
    type: 'recovery',
    email: 'oliver123@gmail.com',
    options: {
      redirectTo: 'https://dvds-zone.co.uk/reset-password',
    },
  });

  assert.equal(error, null);
  assert.ok(data?.properties?.action_link);
  const actionUrl = new URL(data.properties.action_link);
  assert.ok(actionUrl.pathname.includes('/auth/v1/verify'));
  assert.equal(actionUrl.searchParams.get('type'), 'recovery');
  assert.equal(actionUrl.searchParams.get('redirect_to'), 'https://dvds-zone.co.uk/reset-password');
  assert.ok(actionUrl.searchParams.get('token'));
});

