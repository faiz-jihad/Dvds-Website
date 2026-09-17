/**
 * In-memory sliding-window rate limiter & input sanitization for API endpoints.
 * Protects against brute-force attacks, resource exhaustion, and prototype pollution.
 */

const hitMap = new Map();
const CLEANUP_INTERVAL_MS = 60000;
let lastCleanup = Date.now();

function cleanupStaleEntries(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of hitMap.entries()) {
    if (now > record.resetTime) {
      hitMap.delete(key);
    }
  }
}

/**
 * Extracts a sanitized client IP from request headers or socket.
 * Handles proxies and load balancers (Vercel, Cloudflare, etc.).
 */
export function getClientIp(req) {
  // Cloudflare provides the verified visitor IP in CF-Connecting-IP
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && /^[0-9a-f.:]{3,45}$/i.test(cfIp.trim())) {
    return cfIp.trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0].trim();
    // Validate basic IP format (IPv4 or IPv6)
    if (/^[0-9a-f.:]{3,45}$/i.test(first)) {
      return first;
    }
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && /^[0-9a-f.:]{3,45}$/i.test(realIp.trim())) {
    return realIp.trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Sliding-window rate limit checker.
 * @param {string} identifier - Unique identifier (e.g., `ip:route`)
 * @param {object} options - { max: number, windowMs: number }
 * @returns {{ allowed: boolean, remaining: number, resetMs: number, limit: number }}
 */
export function checkRateLimit(identifier, { max = 60, windowMs = 60000 } = {}) {
  const now = Date.now();
  cleanupStaleEntries(now);

  let record = hitMap.get(identifier);
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    hitMap.set(identifier, record);
    return {
      allowed: true,
      remaining: max - 1,
      resetMs: windowMs,
      limit: max,
    };
  }

  record.count += 1;
  const remaining = Math.max(0, max - record.count);
  const resetMs = Math.max(0, record.resetTime - now);

  if (record.count > max) {
    return {
      allowed: false,
      remaining: 0,
      resetMs,
      limit: max,
    };
  }

  return {
    allowed: true,
    remaining,
    resetMs,
    limit: max,
  };
}

/**
 * Recursively sanitizes input objects to prevent prototype pollution attacks.
 * Rejects or strips __proto__, constructor, and prototype properties.
 */
export function sanitizeInputObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 10) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeInputObject(item, depth + 1));
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // Drop dangerous prototype keys
    }
    clean[key] = sanitizeInputObject(obj[key], depth + 1);
  }
  return clean;
}
