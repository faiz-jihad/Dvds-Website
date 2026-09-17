import { endpoint } from './_checkout.js';
import { verifyTurnstileToken } from './_turnstile.js';

export default endpoint(async (req) => {
  const token = req.body?.token || req.body?.['cf-turnstile-response'];
  const result = await verifyTurnstileToken(token, req);
  if (!result.success) {
    return { verified: false, error: result.error };
  }
  return { verified: true };
}, 'POST', { max: 30, windowMs: 60000 });
