import { CURRENCIES, minorAmount } from '../shared/commerce.js';
import { CheckoutError } from './_checkout.js';
const cache = new Map();
const FALLBACK_RATES = {
  EUR: 1.17,
  USD: 1.31,
  CAD: 1.77,
  AUD: 1.96,
  NZD: 2.12,
  CHF: 1.11,
  SGD: 1.70,
  HKD: 10.20,
  JPY: 188,
  IDR: 20200,
};

export async function exchangeRate(currency) {
  if (!CURRENCIES.includes(currency)) throw new CheckoutError('Choose a supported checkout currency.');
  if (currency === 'GBP') return { rate: 1, date: new Date().toISOString().slice(0,10) };
  const cached = cache.get(currency);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const response = await fetch(`https://api.frankfurter.dev/v2/rate/GBP/${currency}`, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw Error('Rate unavailable');
    const data = await response.json();
    const age = Date.now() - Date.parse(data.date);
    if (!Number.isFinite(data.rate) || data.rate <= 0 || data.base !== 'GBP' || data.quote !== currency || !Number.isFinite(age) || age < -86400000 || age > 7 * 86400000) throw Error('Invalid or stale rate');
    const value = { rate: data.rate, date: data.date };
    cache.set(currency, { value, expires: Date.now() + 10 * 60_000 });
    return value;
  } catch {
    if (FALLBACK_RATES[currency]) {
      const fallbackValue = { rate: FALLBACK_RATES[currency], date: new Date().toISOString().slice(0,10) };
      cache.set(currency, { value: fallbackValue, expires: Date.now() + 5 * 60_000 });
      return fallbackValue;
    }
    throw new CheckoutError('This currency is temporarily unavailable. Choose GBP or try again later.', 503, 'FX_UNAVAILABLE');
  }
}
export function convertQuote(quote, currency, fx) {
  const scale = currency === 'JPY' ? 1 : 100;
  const convert = (value) => minorAmount(Number(value) * fx.rate, currency) / scale;
  const items = quote.items.map((item) => ({ ...item, unit_price: convert(item.unit_price), total_price: minorAmount(convert(item.unit_price) * item.quantity, currency) / scale }));
  const subtotal = items.reduce((sum, item) => sum + minorAmount(item.total_price, currency), 0);
  const discount = Math.min(subtotal, minorAmount(convert(quote.discount_amount), currency));
  const delivery = Object.fromEntries(Object.entries(quote.delivery).map(([tier, service]) => [tier, service ? { ...service, amount: convert(service.amount) } : null]));
  const shipping = minorAmount(delivery[quote.delivery_tier].amount, currency);
  return { ...quote, items, currency, subtotal: subtotal / scale, discount_amount: discount / scale,
    shipping_amount: shipping / scale, total_amount: (subtotal - discount + shipping) / scale, delivery,
    exchange_rate: fx.rate, exchange_rate_date: fx.date, base_total_amount: quote.total_amount,
    methods: { ...quote.methods, bank_transfer: Boolean(quote.methods.bank_transfer),
      paypal: currency !== 'IDR' && quote.methods.paypal } };
}
