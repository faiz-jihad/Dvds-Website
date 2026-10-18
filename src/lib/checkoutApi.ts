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
  const data = await response.json().catch(() => ({ error: response.status === 404 ? `Checkout endpoint not found (404).` : (response.status === 502 || response.status === 504 ? 'Payment service is temporarily unavailable. Please try again in a moment.' : 'Checkout is temporarily unavailable. Please try again.') }));
  if (!response.ok) throw new CheckoutApiError(data.error || 'The request could not be completed.', data.code || 'CHECKOUT_ERROR', response.status, data.orderId);
  return data;
}

async function fallbackClientQuote(input: Pick<CheckoutInput, 'items' | 'deliveryTier' | 'promoCode' | 'currency'> & { country?: string }): Promise<CheckoutQuote> {
  if (!supabase) throw new Error('Live database unavailable');
  const productIds = (input.items || []).map((i) => i.product_id);
  if (!productIds.length) throw new Error('No items in basket');

  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase.from('products').select('id,sku,title,price,status,stock_quantity,cover_image_url').in('id', productIds),
    supabase.from('store_settings').select('*').eq('singleton', true).maybeSingle(),
  ]);

  if (!products || !products.length) throw new Error('Selected titles unavailable');

  let promoData: any = null;
  if (input.promoCode) {
    const cleanCode = input.promoCode.trim().toUpperCase();
    const { data: p } = await supabase.from('promotions').select('*').eq('code', cleanCode).maybeSingle();
    promoData = p;
    if (!promoData && settings?.vip_promo_code && cleanCode === settings.vip_promo_code.trim().toUpperCase()) {
      promoData = {
        code: cleanCode,
        type: 'percentage',
        value: Number(settings.vip_promo_discount ?? 10),
        minimum_order: Number(settings.vip_min_spend ?? 0),
        is_active: true,
      };
    }
  }

  const lines = input.items.map((item) => {
    const p = products.find((prod: any) => prod.id === item.product_id);
    const title = p?.title || 'Product';
    const sku = p?.sku || '';
    const cover = p?.cover_image_url || '';
    const unit = Number(p?.price || 0);
    const total = Number((unit * item.quantity).toFixed(2));
    return {
      product_id: item.product_id,
      product_title: title,
      product_sku: sku,
      cover_image_url: cover,
      quantity: item.quantity,
      unit_price: unit,
      total_price: total,
    };
  });

  const subtotal = Number(lines.reduce((sum, l) => sum + l.total_price, 0).toFixed(2));
  const stdFee = Number(settings?.standard_shipping_fee ?? 0);
  const expFee = Number(settings?.express_shipping_fee ?? 3.00);
  const freeThreshold = settings?.free_shipping_threshold != null ? Number(settings.free_shipping_threshold) : null;
  const isFreeStandard = stdFee === 0 || (freeThreshold != null && subtotal >= freeThreshold);
  const standardFee = isFreeStandard ? 0 : stdFee;

  let discount_amount = 0;
  if (promoData && promoData.is_active) {
    if (promoData.type === 'percentage') {
      discount_amount = Number(((subtotal * Number(promoData.value)) / 100).toFixed(2));
    } else {
      discount_amount = Number(Number(promoData.value).toFixed(2));
    }
    discount_amount = Math.min(subtotal, discount_amount);
  }

  const shipping_amount = input.deliveryTier === 'express' ? expFee : standardFee;
  const total_amount = Number((subtotal - discount_amount + shipping_amount).toFixed(2));

  return {
    items: lines,
    subtotal,
    discount_amount,
    shipping_amount,
    total_amount,
    currency: input.currency || 'GBP',
    delivery: {
      standard: {
        name: settings?.standard_shipping_name || 'Royal Mail Tracked 48',
        eta: settings?.standard_shipping_eta || '2-3 Working Days',
        amount: standardFee,
      },
      express: {
        name: settings?.express_shipping_name || 'Royal Mail Next Day Priority',
        eta: settings?.express_shipping_eta || '1 Working Day (Order by 2PM)',
        amount: expFee,
      },
    },
    country: input.country || 'GB',
    duties_notice: input.country && input.country !== 'GB' ? (settings?.international_duties_notice || 'Import duties and taxes may be payable on arrival.') : '',
    exchange_rate: 1,
    exchange_rate_date: new Date().toISOString().slice(0, 10),
    methods: {
      card: settings?.payment_card_enabled !== false,
      paypal: settings?.payment_paypal_enabled !== false,
      bank_transfer: false,
    },
    bank_name: settings?.bank_name || 'Revolut',
  };
}
export const checkoutApi = {
  async configuration(): Promise<{ currencies: string[]; countries: string[]; stripePublishableKey?: string | null; paypalClientId?: string | null }> {
    try {
      return await post<{ currencies: string[]; countries: string[]; stripePublishableKey?: string | null; paypalClientId?: string | null }>('checkout-quote', { configuration: true });
    } catch (err) {
      if (supabase) {
        try {
          const { data: settings } = await supabase.from('store_settings').select('*').eq('singleton', true).maybeSingle();
          return {
            currencies: Array.isArray(settings?.checkout_currencies) && settings.checkout_currencies.length > 0 ? (settings.checkout_currencies as string[]) : ['GBP', 'EUR', 'USD'],
            countries: ['GB'],
            stripePublishableKey: typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || null) : null,
            paypalClientId: typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_PAYPAL_CLIENT_ID || null) : null,
          };
        } catch {
          // ignore fallback error
        }
      }
      throw err;
    }
  },
  async quote(input: Pick<CheckoutInput, 'items' | 'deliveryTier' | 'promoCode' | 'currency'> & { country?: string }) {
    try {
      return await post<CheckoutQuote>('checkout-quote', input);
    } catch (err) {
      if (supabase) {
        try {
          return await fallbackClientQuote(input);
        } catch {
          // fallback failed, throw original error
        }
      }
      throw err;
    }
  },
  async create(method: PaymentMethodType, input: CheckoutInput) {
    const fingerprint = JSON.stringify({ method, ...input });
    let attempt = currentCheckoutAttempt();
    if (attempt && attempt.fingerprint !== fingerprint) {
      if (attempt.orderId) {
        post('cancel-checkout', { orderId: attempt.orderId }).catch(() => {});
      }
      forgetCheckoutAttempt();
      attempt = null;
    }
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
  async createPaymentIntent(input: CheckoutInput) {
    const fingerprint = JSON.stringify({ method: 'card', ...input });
    let attempt = currentCheckoutAttempt();
    if (attempt && attempt.fingerprint !== fingerprint) {
      if (attempt.orderId) {
        post('cancel-checkout', { orderId: attempt.orderId }).catch(() => {});
      }
      forgetCheckoutAttempt();
      attempt = null;
    }
    if (!attempt) {
      attempt = { fingerprint, requestId: crypto.randomUUID(), accessToken: crypto.randomUUID(), items: input.items, input, method: 'card' };
      sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    }
    try {
      const result = await post<{ clientSecret: string; paymentIntentId: string; orderId: string; orderNumber: string; amount: number; currency: string; completed?: boolean }>('create-payment-intent', { ...input, requestId: attempt.requestId, accessToken: attempt.accessToken });
      if (!result.orderId) throw new CheckoutApiError('The order could not be created. Please retry.', 'INVALID_RESPONSE');
      const receipt = { ...attempt, orderId: result.orderId };
      sessionStorage.setItem(RECEIPTS_KEY, JSON.stringify({ ...readReceipts(), [result.orderId]: receipt }));
      sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(receipt));
      return result;
    } catch (error) {
      let savedOrderId = error instanceof CheckoutApiError ? error.orderId : undefined;
      if (!savedOrderId) {
        try {
          const recovered = await post<{ order: Order }>('order-status', { requestId: attempt.requestId }, undefined, attempt.accessToken);
          savedOrderId = recovered.order.id;
        } catch { /* Keep safe retry state */ }
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
  async verifyStripePayment(orderId: string, sessionId?: string): Promise<{ verified: boolean; orderId: string; payment_status: string }> {
    return post<{ verified: boolean; orderId: string; payment_status: string }>('order-status', { orderId, sessionId }, orderId);
  },
  async cancel(orderId: string) {
    await post('cancel-checkout', { orderId }, orderId);
    if (currentCheckoutAttempt()?.orderId === orderId) forgetCheckoutAttempt();
  },
  async uploadPaymentProof(orderId: string, proof: { fileName: string; fileSize: number; dataUrl: string }) {
    return post<{ success: boolean; uploadedAt: string }>('upload-payment-proof', { orderId, proof }, orderId);
  },
};
