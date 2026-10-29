import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let isDeploying = false;
let lastDeployTime = null;
let lastDeployStatus = 'idle';

function verifyGitHubSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  try {
    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') return false;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const digest = Buffer.from(hmac.digest('hex'), 'utf8');
    const signature = Buffer.from(parts[1], 'utf8');
    if (digest.length !== signature.length) return false;
    return crypto.timingSafeEqual(digest, signature);
  } catch (err) {
    console.error('[DeployWebhook] Signature check error:', err);
    return false;
  }
}

function verifyToken(tokenProvided, secret) {
  if (!tokenProvided || !secret) return false;
  try {
    const a = Buffer.from(String(tokenProvided), 'utf8');
    const b = Buffer.from(String(secret), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[DeployWebhook] DEPLOY_WEBHOOK_SECRET is not configured in .env');
    return res.status(500).json({ error: 'Deploy webhook is not configured on this server' });
  }

  // Support GET request to check deployment status & logs
  if (req.method === 'GET') {
    const authHeader = req.headers['authorization'] || '';
    const tokenHeader = req.headers['x-deploy-token'] || '';
    const queryToken = req.query?.token || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const provided = tokenHeader || bearerToken || queryToken;

    if (!verifyToken(provided, secret)) {
      return res.status(401).json({ error: 'Unauthorized: valid deploy token required' });
    }

    const logPath = resolve(process.cwd(), 'deploy.log');
    let recentLogs = 'No deployment logs yet.';
    if (existsSync(logPath)) {
      try {
        const fullLog = readFileSync(logPath, 'utf8');
        const lines = fullLog.trim().split('\n');
        recentLogs = lines.slice(-40).join('\n');
      } catch (e) {
        recentLogs = `Error reading logs: ${e.message}`;
      }
    }

    return res.status(200).json({
      isDeploying,
      lastDeployTime,
      lastDeployStatus,
      recentLogs,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Authenticate Request
  const signatureHeader = req.headers['x-hub-signature-256'];
  const tokenHeader = req.headers['x-deploy-token'];
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const queryToken = req.query?.token;

  let isAuthenticated = false;

  if (signatureHeader && req.rawBody) {
    isAuthenticated = verifyGitHubSignature(req.rawBody, signatureHeader, secret);
  }

  if (!isAuthenticated && (tokenHeader || bearerToken || queryToken)) {
    const candidate = tokenHeader || bearerToken || queryToken;
    isAuthenticated = verifyToken(candidate, secret);
  }

  if (!isAuthenticated) {
    console.warn('[DeployWebhook] Rejected unauthorized request from IP:', req.ip || req.headers['x-forwarded-for']);
    return res.status(401).json({ error: 'Unauthorized: invalid signature or deploy token' });
  }

  // 2. Handle GitHub ping event
  const githubEvent = req.headers['x-github-event'];
  if (githubEvent === 'ping') {
    return res.status(200).json({
      ok: true,
      pong: true,
      message: 'DVD zone UK deploy webhook successfully connected to GitHub',
    });
  }

  // 3. Check branch (if payload is a GitHub push)
  const ref = req.body?.ref;
  if (ref && ref !== 'refs/heads/main' && ref !== 'refs/heads/master') {
    return res.status(200).json({
      ok: true,
      skipped: true,
      message: `Ignored push to branch ${ref}. Only main/master triggers auto-deployment.`,
    });
  }

  // 4. Concurrency Guard
  if (isDeploying) {
    return res.status(200).json({
      ok: true,
      status: 'already_deploying',
      message: 'A deployment is currently in progress. Please wait for it to complete.',
      startedAt: lastDeployTime,
    });
  }

  // 5. Trigger deployment asynchronously
  isDeploying = true;
  lastDeployTime = new Date().toISOString();
  lastDeployStatus = 'in_progress';

  // In test mode or dry-run, simulate deployment without spawning child process
  if (process.env.NODE_ENV === 'test' || process.env.DEPLOY_DRY_RUN === '1') {
    isDeploying = false;
    lastDeployStatus = 'completed';
    return res.status(200).json({
      ok: true,
      status: 'deploy_simulated',
      message: 'Dry-run: deployment simulated successfully',
      triggeredAt: lastDeployTime,
    });
  }

  const scriptPath = resolve(process.cwd(), 'scripts/deploy.sh');
  console.log(`[DeployWebhook] Launching deploy script: ${scriptPath} at ${lastDeployTime}`);

  const deployProcess = spawn('/bin/bash', [scriptPath], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
  });

  deployProcess.on('error', (err) => {
    console.error('[DeployWebhook] Failed to launch deploy script:', err);
    isDeploying = false;
    lastDeployStatus = `failed: ${err.message}`;
  });

  deployProcess.unref();

  // Reset the deploying flag after reasonable time or let the script finish
  setTimeout(() => {
    isDeploying = false;
    lastDeployStatus = 'completed';
  }, 45_000);

  return res.status(200).json({
    ok: true,
    status: 'deploy_started',
    message: 'Auto-deployment started. Changes will be compiled and live in ~15-20 seconds.',
    triggeredAt: lastDeployTime,
    commit: req.body?.head_commit?.id || null,
    commitMessage: req.body?.head_commit?.message || null,
  });
}
