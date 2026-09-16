import { supabase } from './supabase';
import { Address, Order, PaymentMethodType } from '../types';

export interface CheckoutQuote {
  items: { product_id: string; product_title: string; product_sku: string; cover_image_url: string; quantity: number; unit_price: number; total_price: number }[];
  subtotal: number; discount_amount: number; shipping_amount: number; total_amount: number; currency: string;
  delivery: { standard: { name: string; eta: string; amount: number }; express: { name: string; eta: string; amount: number } | null };
  country: string; duties_notice?: string; exchange_rate: number; exchange_rate_date: string;
  methods: Record<PaymentMethodType, boolean>; bank_name?: string;
}
export interface CheckoutInput {
  items: { product_id: string; quantity: number }[];
  customerEmail: string; shippingAddress: Address; deliveryTier: 'standard' | 'express'; promoCode?: string | null; expectedTotal: number;
  currency?: string; internationalAcknowledged?: boolean;
}
interface Attempt { input?: CheckoutInput; fingerprint: string; requestId: string; accessToken: string; items: CheckoutInput['items']; orderId?: string; url?: string; method: PaymentMethodType; consumed?: boolean }
const ATTEMPT_KEY = 'az_checkout_attempt_v2';
const RECEIPTS_KEY = 'az_checkout_receipts_v2';
export class CheckoutApiError extends Error {
  constructor(message: string, public code: string, public status = 0, public orderId?: string) { super(message); }
}
function readReceipts(): Record<string, Attempt> {
  try { return JSON.parse(sessionStorage.getItem(RECEIPTS_KEY) || '{}'); } catch { return {}; }
}
export function currentCheckoutAttempt(): Attempt | null {
  try { return JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) || 'null'); } catch { return null; }
}
export function forgetCheckoutAttempt() { sessionStorage.removeItem(ATTEMPT_KEY); }
export function consumeCheckoutReceipt(orderId: string): CheckoutInput['items'] | null {
  const receipts = readReceipts(); const receipt = receipts[orderId];
  if (!receipt || receipt.consumed) return null;
  receipt.consumed = true;
  sessionStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  if (currentCheckoutAttempt()?.orderId === orderId) forgetCheckoutAttempt();
  return receipt.items;
}
async function post<T>(path: string, body: unknown, orderId?: string, accessToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new CheckoutApiError('Your session could not be verified. Please sign in again.', 'AUTH_ERROR');
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  if (orderId && readReceipts()[orderId]) headers['X-Order-Token'] = readReceipts()[orderId].accessToken;
  if (accessToken) headers['X-Order-Token'] = accessToken;
  const response = await fetch(`/api/${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({ error: 'Checkout is temporarily unavailable. Please try again.' }));
  if (!response.ok) throw new CheckoutApiError(data.error || 'The request could not be completed.', data.code || 'CHECKOUT_ERROR', response.status, data.orderId);
  return data;
}
export const checkoutApi = {
  configuration() { return post<{ currencies: string[]; countries: string[] }>('checkout-quote', { configuration: true }); },
  quote(input: Pick<CheckoutInput, 'items' | 'deliveryTier' | 'promoCode' | 'currency'> & { country?: string }) { return post<CheckoutQuote>('checkout-quote', input); },
  async create(method: PaymentMethodType, input: CheckoutInput) {
    const fingerprint = JSON.stringify({ method, ...input });
    let attempt = currentCheckoutAttempt();
    if (attempt && attempt.fingerprint !== fingerprint) throw new CheckoutApiError('Resume or cancel the previous checkout before starting another order.', 'ATTEMPT_PENDING');
    if (!attempt) {
      attempt = { fingerprint, requestId: crypto.randomUUID(), accessToken: crypto.randomUUID(), items: input.items, input, method };
      sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    }
    const route = { card: 'create-checkout-session', paypal: 'create-paypal-order', bank_transfer: 'create-bank-transfer-order' }[method];
    try {
      const result = await post<{ orderId: string; orderNumber: string; url?: string; completed?: boolean }>(route, { ...input, requestId: attempt.requestId, accessToken: attempt.accessToken });
      if (!result.orderId) throw new CheckoutApiError('The order could not be created. Please retry.', 'INVALID_RESPONSE');
      const receipt = { ...attempt, orderId: result.orderId, url: result.url };
      sessionStorage.setItem(RECEIPTS_KEY, JSON.stringify({ ...readReceipts(), [result.orderId]: receipt }));
      sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(receipt));
      return result;
    } catch (error) {
      let savedOrderId = error instanceof CheckoutApiError ? error.orderId : undefined;
      // A lost provider response must not strand a reserved order or create a duplicate.
      if (!savedOrderId) {
        try {
          const recovered = await post<{ order: Order }>('order-status', { requestId: attempt.requestId }, undefined, attempt.accessToken);
          savedOrderId = recovered.order.id;
        } catch { /* Keep the same request and access token for a safe retry. */ }
      }
      if (savedOrderId) {
        const receipt = { ...attempt, orderId: savedOrderId };
        sessionStorage.setItem(RECEIPTS_KEY, JSON.stringify({ ...readReceipts(), [savedOrderId]: receipt }));
        sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(receipt));
      } else if (error instanceof CheckoutApiError && (error.status === 400 || error.status === 409 || error.code === 'METHOD_UNAVAILABLE' || error.code === 'CHECKOUT_UNAVAILABLE')) forgetCheckoutAttempt();
      throw error;
    }
  },
  async orderStatus(orderId: string, sessionId?: string, paypalOrderId?: string): Promise<Order> {
    const response = await post<{ order: Order }>('order-status', { orderId, sessionId, paypalOrderId }, orderId);
    return response.order;
  },
  async cancel(orderId: string) {
    await post('cancel-checkout', { orderId }, orderId);
    if (currentCheckoutAttempt()?.orderId === orderId) forgetCheckoutAttempt();
  },
};
