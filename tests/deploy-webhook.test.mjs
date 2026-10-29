import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import handler from '../api/deploy-webhook.js';

const TEST_SECRET = 'test_deploy_secret_abc1234567890';
process.env.DEPLOY_DRY_RUN = '1';

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
  };
  return res;
}

test('deploy-webhook: rejects request with missing or invalid token/signature with HTTP 401', async () => {
  process.env.DEPLOY_WEBHOOK_SECRET = TEST_SECRET;

  const req = {
    method: 'POST',
    headers: {},
    body: {},
  };
  const res = mockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 401, 'Should return 401 Unauthorized');
  assert.ok(res.body.error.includes('Unauthorized'));
});

test('deploy-webhook: accepts valid token in x-deploy-token header', async () => {
  process.env.DEPLOY_WEBHOOK_SECRET = TEST_SECRET;

  const req = {
    method: 'POST',
    headers: {
      'x-deploy-token': TEST_SECRET,
    },
    body: {
      ref: 'refs/heads/main',
      head_commit: { id: 'test-commit-sha-123' },
    },
  };
  const res = mockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.ok);
});

test('deploy-webhook: handles GitHub ping event with HTTP 200 and pong', async () => {
  process.env.DEPLOY_WEBHOOK_SECRET = TEST_SECRET;

  const req = {
    method: 'POST',
    headers: {
      'x-deploy-token': TEST_SECRET,
      'x-github-event': 'ping',
    },
    body: {
      zen: 'Design for failure.',
    },
  };
  const res = mockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pong, true);
});

test('deploy-webhook: verifies GitHub HMAC SHA-256 signature', async () => {
  process.env.DEPLOY_WEBHOOK_SECRET = TEST_SECRET;

  const payload = JSON.stringify({ ref: 'refs/heads/main' });
  const rawBody = Buffer.from(payload, 'utf8');
  const hmac = crypto.createHmac('sha256', TEST_SECRET).update(rawBody).digest('hex');

  const req = {
    method: 'POST',
    headers: {
      'x-hub-signature-256': `sha256=${hmac}`,
    },
    rawBody,
    body: JSON.parse(payload),
  };
  const res = mockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.ok);
});

test('deploy-webhook: skips non-main branches', async () => {
  process.env.DEPLOY_WEBHOOK_SECRET = TEST_SECRET;

  const req = {
    method: 'POST',
    headers: {
      'x-deploy-token': TEST_SECRET,
    },
    body: {
      ref: 'refs/heads/feature-test',
    },
  };
  const res = mockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.skipped, true);
});
