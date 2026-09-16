import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Check, CreditCard, Lock, Truck, Wallet } from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { checkoutApi, currentCheckoutAttempt } from '../lib/checkoutApi';
import { COUNTRIES, addressRules, countryCode, countryName, formatMoney, normalizeAddress } from '../../shared/commerce.js';
import { Address, PaymentMethodType } from '../types';
import { useCustomerAuth } from '../auth/CustomerAuth';

const fieldClass = 'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50';
const methods = [
  { id: 'card' as const, name: 'Credit or debit card', icon: CreditCard, description: 'Complete your payment securely with Stripe.', detail: 'Card details are entered on Stripe. You will return here after payment.', badge: 'Powered by Stripe' },
  { id: 'paypal' as const, name: 'PayPal', icon: Wallet, description: 'Pay with your PayPal account or the options available at PayPal.', detail: 'Continue to PayPal to approve your payment, then return to your order.', badge: 'PayPal checkout' },
  { id: 'bank_transfer' as const, name: 'Company bank transfer', icon: Building2, description: 'Transfer directly to our company bank account.', detail: 'Place your order to receive bank details and a unique reference. Dispatch starts after payment is confirmed.', badge: 'Manual confirmation' },
];

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const items = useCartStore((state) => state.items);
  const appliedPromo = useCartStore((state) => state.appliedPromoCode);
  const [email, setEmail] = useState(customer?.email || '');
  const [address, setAddress] = useState<Address>({ id: 'checkout', full_name: customer?.full_name || '', address_line_1: '', address_line_2: '', city: '', county: '', postcode: '', country: 'GB', phone: customer?.phone || '' });
  const [currency, setCurrency] = useState('GBP');
  const [internationalAcknowledged, setInternationalAcknowledged] = useState(false);
  const rules = addressRules(address.country);
  const international = countryCode(address.country) !== 'GB';
  const configQuery = useQuery({ queryKey: ['checkout-config'], queryFn: checkoutApi.configuration, staleTime: 30_000 });
  const currencies = configQuery.data?.currencies || ['GBP'];
  const [tier, setTier] = useState<'standard' | 'express'>('standard');
  const [method, setMethod] = useState<PaymentMethodType>('card');
  const [promo, setPromo] = useState(appliedPromo || '');
  const [promoDraft, setPromoDraft] = useState(appliedPromo || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(currentCheckoutAttempt);
  const basket = items.map((item) => ({ product_id: item.product_id, quantity: item.quantity }));
  const quoteQuery = useQuery({
    queryKey: ['checkout-quote', basket, tier, promo, address.country, currency],
    queryFn: () => checkoutApi.quote({ items: basket, deliveryTier: tier, promoCode: promo, country: address.country, currency }),
    enabled: items.length > 0 && !attempt,
    retry: false, staleTime: 0, refetchOnWindowFocus: true,
  });
  const quote = quoteQuery.data;
  const displayPrice = (amount: number) => formatMoney(amount, quote?.currency || currency);
  useEffect(() => {
    if (quote && !quote.methods[method]) {
      const available = methods.find((option) => quote.methods[option.id]);
      if (available) setMethod(available.id);
    }
  }, [quote, method]);
  useEffect(() => {
    if (customer) {
      setEmail((value) => value || customer.email);
      setAddress((value) => ({ ...value, full_name: value.full_name || customer.full_name || '', phone: value.phone || customer.phone || '' }));
    }
  }, [customer]);
  const updateAddress = (key: keyof Address, value: string) => {
    if (key === 'country') { setTier('standard'); setInternationalAcknowledged(false); setError(''); }
    setAddress((previous) => ({ ...previous, [key]: value }));
  };
  const retryAttempt = async () => {
    if (!attempt?.input) return;
    setBusy(true); setError('');
    try {
      const result = await checkoutApi.create(attempt.method, attempt.input);
      if (result.completed || attempt.method === 'bank_transfer') navigate(`/order-success/${result.orderId}`);
      else if (result.url) window.location.assign(result.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please retry.'); }
    finally { setAttempt(currentCheckoutAttempt()); setBusy(false); }
  };
  const cancelAttempt = async () => {
    if (!attempt?.orderId) return;
    setBusy(true); setError('');
    try { await checkoutApi.cancel(attempt.orderId); setAttempt(null); await quoteQuery.refetch(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to cancel this payment. Please retry.'); }
    finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !quote || quoteQuery.isFetching || quoteQuery.isError || !quote.methods[method] || attempt) return;
    let validatedAddress;
    try { validatedAddress = normalizeAddress({ ...address }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Check your address.'); return; }
    if (international && !internationalAcknowledged) { setError('Acknowledge the international delivery notice to continue.'); return; }
    setBusy(true); setError('');
    try {
      const result = await checkoutApi.create(method, { items: basket, customerEmail: email, shippingAddress: { ...address, ...validatedAddress }, deliveryTier: tier, promoCode: promo, expectedTotal: quote.total_amount, currency, internationalAcknowledged });
      setAttempt(currentCheckoutAttempt());
      if (method === 'bank_transfer' || result.completed) navigate(`/order-success/${result.orderId}`);
      else if (result.url && new URL(result.url).protocol === 'https:') window.location.assign(result.url);
      else throw new Error('The payment link is unavailable. Your order is saved; please retry from its status page.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment could not be started. Please retry.');
      setAttempt(currentCheckoutAttempt());
      await quoteQuery.refetch();
    } finally { setBusy(false); }
  };
  if (!items.length && !attempt && !busy) return <Navigate to="/cart" replace />;

  return (
    <div className="bg-gray-50/70 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-blue"><ArrowLeft size={16} /> Back to basket</Link>
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 mb-8">
          <div><p className="text-xs uppercase tracking-widest text-brand-blue font-semibold">Almost yours</p><h1 className="font-display text-3xl sm:text-4xl font-bold mt-2">Checkout</h1><p className="text-gray-500 text-sm mt-2">Your details, delivery, and a payment method that suits you.</p></div>
          <span className="inline-flex items-center gap-2 text-xs text-gray-600 rounded-full border border-gray-200 bg-white px-4 py-2"><Lock size={14} /> Secure payment</span>
        </div>
        {attempt && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 mb-6" aria-label="Existing checkout">
          <h2 className="font-semibold">You have an order awaiting payment</h2><p className="text-sm text-gray-600 mt-1">Continue your existing order, or cancel it to release the reserved items and change your checkout.</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm font-semibold">
            {attempt.orderId && <Link className="text-brand-blue underline" to={`/order-success/${attempt.orderId}`}>View order status</Link>}
            {attempt.url && <a className="text-brand-blue underline" href={attempt.url}>Resume payment</a>}
            {!attempt.url && <button type="button" disabled={busy} onClick={retryAttempt} className="text-brand-blue underline disabled:opacity-50">Retry saved checkout</button>}
            {attempt.orderId && <button type="button" disabled={busy} onClick={cancelAttempt} className="text-gray-700 underline disabled:opacity-50">{busy ? 'Please wait...' : 'Cancel this order and edit checkout'}</button>}
          </div>
        </section>}
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 mb-6 text-sm">{error}</div>}
        <form onSubmit={submit} className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8 items-start">
          <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-8 space-y-8">
            <fieldset disabled={busy || Boolean(attempt)}>
              <legend className="text-lg font-semibold mb-5"><span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-brand-blue rounded-full text-xs mr-3">1</span>Contact & delivery details</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm sm:col-span-2">Email address<input className={fieldClass} type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                <label className="text-sm">Delivery country<select className={fieldClass} autoComplete="shipping country" value={address.country} onChange={(event) => updateAddress('country', event.target.value)}>{COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
                <label className="text-sm">Pay in<select className={fieldClass} value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
                <label className="text-sm sm:col-span-2">Full name<input className={fieldClass} autoComplete="shipping name" required maxLength={200} value={address.full_name} onChange={(e) => updateAddress('full_name', e.target.value)} /></label>
                <label className="text-sm sm:col-span-2">Address line 1<input className={fieldClass} autoComplete="shipping address-line1" required maxLength={200} value={address.address_line_1} onChange={(e) => updateAddress('address_line_1', e.target.value)} /></label>
                <label className="text-sm sm:col-span-2">Address line 2 <span className="text-gray-400">(optional)</span><input className={fieldClass} autoComplete="shipping address-line2" maxLength={200} value={address.address_line_2 || ''} onChange={(e) => updateAddress('address_line_2', e.target.value)} /></label>
                <label className="text-sm">Town / city<input className={fieldClass} autoComplete="shipping address-level2" required maxLength={200} value={address.city} onChange={(e) => updateAddress('city', e.target.value)} /></label>
                <label className="text-sm">{rules.postalLabel}{!rules.postalRequired && <span className="text-gray-400"> (optional)</span>}<input className={fieldClass} autoComplete="shipping postal-code" required={rules.postalRequired} maxLength={32} value={address.postcode} onChange={(e) => updateAddress('postcode', e.target.value)} /></label>
                <label className="text-sm">Phone <span className="text-gray-400">(optional)</span><input className={fieldClass} type="tel" autoComplete="tel" maxLength={30} value={address.phone || ''} onChange={(e) => updateAddress('phone', e.target.value)} /></label>
                <label className="text-sm">{rules.stateLabel}{!rules.stateRequired && <span className="text-gray-400"> (optional)</span>}<input className={fieldClass} autoComplete="shipping address-level1" required={rules.stateRequired} maxLength={120} value={address.county || ''} onChange={(event) => updateAddress('county', event.target.value)} /></label>
              </div>
            </fieldset>
            <fieldset disabled={busy || Boolean(attempt)} className="border-t border-gray-100 pt-7">
              <legend className="text-lg font-semibold float-left w-full mb-5"><span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-brand-blue rounded-full text-xs mr-3">2</span>Delivery method</legend>
              <div className="clear-both space-y-3">
                {(['standard', 'express'] as const).filter((option) => !quote || Boolean(quote.delivery[option])).map((option) => <label key={option} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer focus-within:ring-2 focus-within:ring-blue-200 ${tier === option ? 'border-brand-blue bg-blue-50/40' : 'border-gray-200'}`}>
                  <input type="radio" name="delivery" checked={tier === option} onChange={() => setTier(option)} className="accent-blue-600 w-4 h-4 shrink-0" />
                  <span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{quote?.delivery[option]?.name || (option === 'standard' ? 'Standard delivery' : 'Express delivery')}</span><span className="block text-xs text-gray-500 mt-1">{quote?.delivery[option]?.eta || 'Delivery estimate shown with your total'}</span></span>
                  <span className={`text-sm font-semibold shrink-0 ${quote?.delivery[option]?.amount === 0 ? 'text-emerald-700' : ''}`}>{quote ? quote.delivery[option]!.amount === 0 ? 'FREE' : displayPrice(quote.delivery[option]!.amount) : '--'}</span>
                </label>)}
              </div>
            </fieldset>
            <fieldset disabled={busy || Boolean(attempt)} className="border-t border-gray-100 pt-7">
              <legend className="text-lg font-semibold float-left w-full mb-2"><span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-brand-blue rounded-full text-xs mr-3">3</span>Payment method</legend>
              <p className="clear-both text-sm text-gray-500 mb-5">Choose how you would like to pay.</p>
              <div className="space-y-3">
                {methods.map((option) => {
                  const available = Boolean(quote?.methods[option.id]); const selected = available && method === option.id; const Icon = option.icon;
                  return <label key={option.id} className={`block rounded-xl border overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-blue-200 ${!available ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : selected ? 'border-brand-blue ring-1 ring-brand-blue cursor-pointer' : 'border-gray-200 hover:border-blue-300 cursor-pointer'}`}>
                    <div className="flex items-start gap-3 p-4 sm:p-5">
                      <input type="radio" name="payment" value={option.id} checked={selected} disabled={!available} onChange={() => setMethod(option.id)} className="accent-blue-600 w-4 h-4 shrink-0 mt-1" />
                      <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><Icon size={18} /><span className={`font-semibold ${option.id === 'paypal' && available ? 'text-blue-900 italic' : ''}`}>{option.name}</span></div>
                        <p className="text-sm leading-relaxed mt-2 text-gray-500">{option.description}</p>
                        <span className="inline-block mt-3 text-[11px] font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">{available ? option.id === 'bank_transfer' ? quote?.bank_name : option.badge : 'Temporarily unavailable'}</span>
                      </div>
                      {selected && <Check size={17} className="text-brand-blue shrink-0 mt-1" />}
                    </div>
                    {selected && <div className="flex items-start gap-2 bg-blue-50 px-4 sm:px-5 py-3 border-t border-blue-100 text-xs leading-relaxed text-blue-800"><Lock size={14} className="shrink-0 mt-0.5" />{option.detail}</div>}
                  </label>;
                })}
              </div>
            </fieldset>
          </div>
          <aside className="lg:sticky lg:top-28 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Order summary <span className="text-sm font-normal text-gray-400">({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span></h2>
            <div className="my-5 divide-y divide-gray-100 max-h-72 overflow-auto">
              {items.map((item) => <div key={item.product_id} className="flex gap-3 py-3"><img src={item.product.cover_image_url} alt="" className="w-11 h-16 rounded object-cover bg-gray-100" /><div className="flex-1 min-w-0"><p className="text-sm font-medium leading-snug">{item.product.title}</p><p className="text-xs text-gray-500 mt-1">Qty {item.quantity}</p></div><span className="text-sm whitespace-nowrap">{quote ? displayPrice(quote.items.find((line) => line.product_id === item.product_id)?.total_price || 0) : '--'}</span></div>)}
            </div>
            <label htmlFor="checkout-promo" className="text-xs font-medium text-gray-600">Promotion code</label>
            <div className="flex gap-2 mt-2 mb-3"><input id="checkout-promo" className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-blue-500" value={promoDraft} disabled={busy || Boolean(attempt)} onChange={(e) => setPromoDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setPromo(promoDraft.trim().toUpperCase()); } }} /><button type="button" disabled={busy || Boolean(attempt)} onClick={() => setPromo(promoDraft.trim().toUpperCase())} className="text-sm font-medium border border-gray-200 rounded-lg px-3 disabled:opacity-50">Apply</button></div>
            {promo && <button type="button" disabled={busy || Boolean(attempt)} onClick={() => { setPromo(''); setPromoDraft(''); }} className="text-xs text-brand-blue underline mb-3">Remove {promo}</button>}
            {quoteQuery.isError && <div role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg p-3 mb-4">{quoteQuery.error.message}<button type="button" onClick={() => quoteQuery.refetch()} className="block underline mt-2">Refresh basket total</button></div>}
            <dl className="space-y-3 text-sm border-t border-gray-100 pt-5" aria-live="polite" aria-busy={quoteQuery.isFetching}>
              <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd>{quote ? displayPrice(quote.subtotal) : '--'}</dd></div>
              {Boolean(quote?.discount_amount) && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>-{displayPrice(quote!.discount_amount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-gray-500">Delivery</dt><dd>{quote ? quote.shipping_amount === 0 ? 'FREE' : displayPrice(quote.shipping_amount) : '--'}</dd></div>
              <div className="flex justify-between border-t border-gray-100 pt-4 text-xl font-bold"><dt>Total <span className="text-xs text-gray-400 font-normal">{quote?.currency || currency}</span></dt><dd>{quote ? displayPrice(quote.total_amount) : '--'}</dd></div>
            </dl>
            {quote?.duties_notice && <label className="flex items-start gap-2 text-xs text-gray-600 mt-5 leading-relaxed"><input type="checkbox" className="mt-0.5" checked={internationalAcknowledged} disabled={busy || Boolean(attempt)} onChange={(event) => setInternationalAcknowledged(event.target.checked)} required /><span>{quote.duties_notice} I understand that these charges may be payable on arrival.</span></label>}
            {quote && quote.currency !== 'GBP' && <p className="text-xs text-gray-500 mt-4">Charged in {quote.currency}. Exchange rate dated {quote.exchange_rate_date}; your provider may apply separate account conversion fees.</p>}
            <button type="submit" disabled={busy || quoteQuery.isFetching || quoteQuery.isError || !quote?.methods[method] || Boolean(attempt)} className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-blue text-white px-4 py-4 mt-6 text-sm font-semibold hover:brightness-95 disabled:opacity-45 disabled:cursor-not-allowed">{busy ? 'Please wait...' : quoteQuery.isFetching ? 'Updating total...' : method === 'bank_transfer' ? 'Place order - pay by bank transfer' : method === 'paypal' ? 'Continue with PayPal' : 'Continue to secure payment'}<ArrowRight size={16} className="shrink-0" /></button>
            <p className="text-xs leading-relaxed text-gray-500 mt-4 text-center">{method === 'bank_transfer' ? 'Your order will await payment confirmation before dispatch.' : 'You will review and complete payment with your selected provider.'}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-5 pt-5 border-t border-gray-100"><Truck size={15} /> Delivery to {countryName(address.country)}</div>
          </aside>
        </form>
      </div>
    </div>
  );
};
