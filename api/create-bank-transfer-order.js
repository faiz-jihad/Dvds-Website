import { endpoint, CheckoutError } from './_checkout.js';
export default endpoint(async () => {
  throw new CheckoutError('Direct bank transfer is disabled. Please checkout using Card (Stripe) or PayPal.', 400, 'METHOD_DISABLED');
}, 'POST', { max: 15, windowMs: 60000 });
