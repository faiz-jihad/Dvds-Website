import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Truck, CreditCard, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { publicApi } from '../lib/publicApi';
import { formatGBP } from '../lib/formatters';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useUiStore } from '../stores/useUiStore';
import { StoreDataState } from '../components/common/StoreDataState';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, getSubtotal, getDiscountAmount, appliedPromoCode } = useCartStore();
  const addToast = useUiStore((state) => state.addToast);
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => publicApi.getStoreSettings() });

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();

  // Delivery tier state
  const [deliveryTier, setDeliveryTier] = useState<'standard' | 'express'>('standard');
  const settings = settingsQuery.data;
  const isFreeDeliveryQualified = settings ? subtotal >= settings.free_shipping_threshold : false;
  const shippingCost = settings ? (deliveryTier === 'express' ? settings.express_shipping_fee : isFreeDeliveryQualified ? 0 : settings.standard_shipping_fee) : 0;
  const totalAmount = Math.max(0, subtotal - discount + shippingCost);

  // Form states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postcode, setPostcode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email || !email.includes('@')) errs.email = 'Valid UK email is required';
    if (!fullName.trim()) errs.fullName = 'Full recipient name is required';
    if (!addressLine1.trim()) errs.addressLine1 = 'UK delivery address is required';
    if (!city.trim()) errs.city = 'Town or city is required';
    if (!postcode.trim() || postcode.trim().length < 5) errs.postcode = 'Valid UK postcode is required (e.g. SW1A 1AA)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Please complete all required UK delivery fields', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await publicApi.createCheckoutSession({
        items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        customerEmail: email,
        deliveryTier,
        promoCode: appliedPromoCode,
        shippingAddress: {
          id: crypto.randomUUID(), full_name: fullName, phone, address_line_1: addressLine1,
          address_line_2: addressLine2, city, county, postcode: postcode.toUpperCase(), country: 'United Kingdom',
        },
      });
      window.location.assign(session.url);
    } catch (checkoutError) {
      addToast(checkoutError instanceof Error ? checkoutError.message : 'Payment failed. Please retry.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (settingsQuery.isLoading || settingsQuery.error || !settings) {
    return <StoreDataState loading={settingsQuery.isLoading} error={settingsQuery.error || (!settings ? new Error('Store settings are unavailable.') : null)} retry={() => settingsQuery.refetch()} />;
  }

  return (
    <div className="bg-gray-50/70 min-h-screen py-6 sm:py-10">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Top Header */}
        <div className="flex flex-col items-start gap-3 pb-5 mb-6 border-b border-gray-200 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:pb-6 sm:mb-8">
          <Link to="/cart" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-dark">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Basket</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit Encrypted UK Checkout</span>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Form: Customer & Delivery Details */}
          <div className="lg:col-span-7 space-y-8">
            {/* Step 1: Contact */}
            <div className="bg-white p-4 sm:p-8 rounded-lg border border-gray-200 shadow-xs space-y-4">
              <h2 className="font-display font-bold text-base text-dark border-b border-gray-100 pb-3">
                1. Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email for Order Tracking"
                  type="email"
                  placeholder="e.g. oliver.clarke@example.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  required
                />
                <Input
                  label="Contact Phone"
                  type="tel"
                  placeholder="e.g. 07700 900123"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Step 2: UK Delivery Address */}
            <div className="bg-white p-4 sm:p-8 rounded-lg border border-gray-200 shadow-xs space-y-4">
              <h2 className="font-display font-bold text-base text-dark border-b border-gray-100 pb-3">
                2. UK Delivery Address
              </h2>
              <div className="space-y-4">
                <Input
                  label="Full Recipient Name"
                  placeholder="e.g. Oliver Clarke"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={errors.fullName}
                  required
                />
                <Input
                  label="Address Line 1"
                  placeholder="e.g. 42 Baker Street"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  error={errors.addressLine1}
                  required
                />
                <Input
                  label="Address Line 2 (Optional)"
                  placeholder="e.g. Flat 3B"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Town / City"
                    placeholder="e.g. London"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    error={errors.city}
                    required
                  />
                  <Input
                    label="County"
                    placeholder="e.g. Greater London"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                  />
                  <Input
                    label="UK Postcode"
                    placeholder="e.g. NW1 6XE"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    error={errors.postcode}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Delivery Method */}
            <div className="bg-white p-4 sm:p-8 rounded-lg border border-gray-200 shadow-xs space-y-4">
              <h2 className="font-display font-bold text-base text-dark border-b border-gray-100 pb-3">
                3. Delivery Method
              </h2>
              <div className="space-y-3">
                <label
                  onClick={() => setDeliveryTier('standard')}
                  className={`flex min-h-16 items-start justify-between gap-3 p-4 border rounded-md cursor-pointer transition-colors ${
                    deliveryTier === 'standard' ? 'border-brand-blue bg-brand-blue-soft/30' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={deliveryTier === 'standard'}
                      onChange={() => setDeliveryTier('standard')}
                      className="accent-brand-blue"
                    />
                    <div>
                      <div className="text-xs font-bold text-dark">{settings.standard_shipping_name}</div>
                      <div className="text-[11px] text-gray-500">{settings.standard_shipping_eta}</div>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-dark">
                    {isFreeDeliveryQualified ? <span className="text-emerald-700">FREE</span> : formatGBP(settings.standard_shipping_fee)}
                  </span>
                </label>

                <label
                  onClick={() => setDeliveryTier('express')}
                  className={`flex min-h-16 items-start justify-between gap-3 p-4 border rounded-md cursor-pointer transition-colors ${
                    deliveryTier === 'express' ? 'border-brand-blue bg-brand-blue-soft/30' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={deliveryTier === 'express'}
                      onChange={() => setDeliveryTier('express')}
                      className="accent-brand-blue"
                    />
                    <div>
                      <div className="text-xs font-bold text-dark">{settings.express_shipping_name}</div>
                      <div className="text-[11px] text-gray-500">{settings.express_shipping_eta}</div>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-dark">{formatGBP(settings.express_shipping_fee)}</span>
                </label>
              </div>
            </div>

            {/* Step 4: Secure Stripe redirect */}
            <div className="bg-white p-4 sm:p-8 rounded-lg border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col gap-2 border-b border-gray-100 pb-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <h2 className="font-display font-bold text-base text-dark">
                  4. Secure Payment (Stripe UK)
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CreditCard className="w-4 h-4 text-brand-blue" />
                  <span>Debit / Credit Card</span>
                </div>
              </div>

              <div className="rounded-md border border-blue-100 bg-brand-blue-soft/40 p-4 text-sm leading-relaxed text-gray-600">
                Card details are collected on Stripe's hosted payment page. Prices, stock, shipping, and promotion eligibility are verified again by the server before payment.
              </div>
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <div className="lg:col-span-5">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm lg:sticky lg:top-24 space-y-5">
              <h3 className="font-display font-bold text-base text-dark border-b border-gray-100 pb-3">
                Order Review ({items.length} titles)
              </h3>

              {/* Items overview */}
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 pr-1 text-xs">
                {items.map((i) => (
                  <div key={i.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <img
                        src={i.product.cover_image_url}
                        alt={i.product.title}
                        className="w-8 aspect-dvd object-cover rounded-xs border border-gray-200"
                      />
                      <div className="truncate">
                        <span className="font-semibold text-dark truncate block">{i.product.title}</span>
                        <span className="text-gray-400 font-mono text-[10px]">{i.product.format} • Qty {i.quantity}</span>
                      </div>
                    </div>
                    <span className="font-bold text-dark font-mono shrink-0">
                      {formatGBP(i.unit_price * i.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-xs pt-3 border-t border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium text-dark">{formatGBP(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-brand-red font-medium">
                    <span>Promotional Discount</span>
                    <span className="font-mono">- {formatGBP(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>UK Tracked Shipping</span>
                  <span className="font-mono font-medium text-dark">
                    {shippingCost === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase text-[11px]">FREE</span>
                    ) : (
                      formatGBP(shippingCost)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-extrabold text-dark pt-3 border-t border-gray-200">
                  <span>Total (GBP)</span>
                  <span className="font-mono">{formatGBP(totalAmount)}</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full text-sm font-semibold tracking-wide"
              >
                Place Order & Pay {formatGBP(totalAmount)}
              </Button>

              <div className="pt-2 flex items-start justify-center gap-2 text-center text-[11px] text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                <span>UK Consumer Rights & 30-Day Returns Policy Protected</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
