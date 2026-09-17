import { getClientIp } from './_rate-limit.js';

/**
 * Validates a Cloudflare Turnstile response token.
 * If CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured in the environment,
 * verification passes automatically (allowing local development and staging).
 *
 * @param {string} token - The turnstile response token from the client.
 * @param {object} req - The incoming HTTP request.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function verifyTurnstileToken(token, req) {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // Turnstile is optional in development/unconfigured environments
    return { success: true };
  }

  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Security challenge verification required.' };
  }

  const clientIp = req ? getClientIp(req) : undefined;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    if (data.success) {
      return { success: true };
    }

    const errorCodes = Array.isArray(data['error-codes']) ? data['error-codes'].join(', ') : 'Verification failed';
    return { success: false, error: `Security check failed: ${errorCodes}` };
  } catch (error) {
    console.error('[turnstile] Verification request failed:', error.message);
    return { success: false, error: 'Security verification service temporarily unreachable.' };
  }
}
