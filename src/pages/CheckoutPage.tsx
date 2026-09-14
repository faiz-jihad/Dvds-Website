import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Tag,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { publicApi } from '../lib/publicApi';
import { formatGBP } from '../lib/formatters';
import { useUiStore } from '../stores/useUiStore';
import { StoreDataState } from '../components/common/StoreDataState';

// Crisp, authentic card brand SVGs
const VisaBadge = () => (
  <svg viewBox="0 0 36 24" className="h-5 w-8 rounded shadow-2xs" fill="none">
    <rect width="36" height="24" rx="3" fill="#1434CB" />
    <path
      d="M14.6 15.6l1.6-9.2h2.5l-1.6 9.2h-2.5zm7.3-9c-.5-.2-1.3-.4-2.3-.4-2.5 0-4.3 1.3-4.3 3.1 0 1.4 1.3 2.1 2.3 2.6 1 .5 1.4.8 1.4 1.2 0 .7-.8 1-1.6 1-.9 0-1.5-.1-2.2-.4l-.3-.1-.3 1.9c.5.2 1.5.4 2.5.4 2.7 0 4.4-1.3 4.4-3.2 0-1.1-.7-2-2.2-2.7-.9-.4-1.4-.7-1.4-1.1 0-.4.4-.8 1.4-.8.8 0 1.4.2 1.8.3l.2.1.3-1.9zm5.3 5.9c.2-.5 1-2.5 1-2.5.0-.1.2-.4.3-.7l.2.8s.4 2 .5 2.4h-2zm3.1-6.1h-2c-.6 0-1.1.2-1.3.8l-3.8 8.4h2.6l.5-1.4h3.2l.3 1.4h2.3l-1.8-9.2zm-17.6 0l-2.4 6.3-.3-1.3c-.5-1.6-2-3.4-3.7-4.3l2.4 8.2h2.7l4-9.2h-2.7z"
      fill="#FFFFFF"
    />
  </svg>
);

const MastercardBadge = () => (
  <svg viewBox="0 0 36 24" className="h-5 w-8 rounded shadow-2xs" fill="none">
    <rect width="36" height="24" rx="3" fill="#0A0A0A" />
    <circle cx="14" cy="12" r="6.5" fill="#EB001B" />
    <circle cx="22" cy="12" r="6.5" fill="#F79E1B" />
    <path
      d="M18 7.8a6.4 6.4 0 012.5 4.2A6.4 6.4 0 0118 16.2a6.4 6.4 0 01-2.5-4.2A6.4 6.4 0 0118 7.8z"
      fill="#FF5F00"
    />
  </svg>
);

const AmexBadge = () => (
  <svg viewBox="0 0 36 24" className="h-5 w-8 rounded shadow-2xs" fill="none">
    <rect width="36" height="24" rx="3" fill="#006FCF" />
    <path
      d="M6 15l2.5-6h2.5l-2.5 6H6zm4.5-6l1.2 3.2 1.2-3.2h2l-2.2 5.8 2.2 5.8h-2l-1.2-3.2-1.2 3.2H8l2.5-6zm7.5 0h5.5v2h-3.5v1.8h3.5v2h-3.5v1.8h3.5v2H18V9z"
      fill="#FFFFFF"
    />
  </svg>
);

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    getSubtotal,
    getDiscountAmount,
    appliedPromoCode,
    applyPromo,
    removePromo,
    clearCart,
  } = useCartStore();
  const addToast = useUiStore((state) => state.addToast);
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => publicApi.getStoreSettings() });

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();

  // Delivery tier state
  const [deliveryTier, setDeliveryTier] = useState<'standard' | 'express'>('standard');
  const settings = settingsQuery.data;
  const isFreeDeliveryQualified = settings ? subtotal >= settings.free_shipping_threshold : false;
  const shippingCost = settings
    ? deliveryTier === 'express'
      ? settings.express_shipping_fee
      : isFreeDeliveryQualified
      ? 0
      : settings.standard_shipping_fee
    : 0;
  const totalAmount = Math.max(0, subtotal - discount + shippingCost);

  // Form states
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postcode, setPostcode] = useState('');

  // Promo Code input state
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  // Handle promo code apply
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    if (!promoInput.trim()) return;

    const result = applyPromo(promoInput.trim());
    if (result.success) {
      setPromoInput('');
      addToast(result.message, 'success');
    } else {
      setPromoError(result.message);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email || !email.includes('@')) errs.email = 'Enter a valid email address';
    if (!fullName.trim()) errs.fullName = 'Enter your full recipient name';
    if (!addressLine1.trim()) errs.addressLine1 = 'Enter your delivery address';
    if (!city.trim()) errs.city = 'Enter your city or town';
    if (!postcode.trim() || postcode.trim().length < 4) errs.postcode = 'Enter a valid postal code';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Please complete all required shipping fields.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await publicApi.createCheckoutSession({
        items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        customerEmail: email,
        deliveryTier,
        promoCode: appliedPromoCode,
        totalAmount,
        paymentMethod: 'stripe_hosted',
        shippingAddress: {
          id: crypto.randomUUID(),
          full_name: fullName,
          phone,
          address_line_1: addressLine1,
          address_line_2: addressLine2,
          city,
          county,
          postcode: postcode.toUpperCase(),
          country: 'United Kingdom',
        },
      });

      if (session?.url && (session.url.startsWith('http://') || session.url.startsWith('https://'))) {
        // Direct redirect to real official Stripe Checkout page
        window.location.assign(session.url);
      } else if (session?.url) {
        clearCart();
        navigate(session.url);
      }
    } catch (checkoutError) {
      addToast(checkoutError instanceof Error ? checkoutError.message : 'Stripe checkout initialization failed.', 'error');
      setIsSubmitting(false);
    }
  };

  if (settingsQuery.isLoading || settingsQuery.error || !settings) {
    return (
      <StoreDataState
        loading={settingsQuery.isLoading}
        error={settingsQuery.error || (!settings ? new Error('Store settings are unavailable.') : null)}
        retry={() => settingsQuery.refetch()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-[#111827] font-sans antialiased">
      {/* High-End Minimal Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="font-display font-black tracking-tight text-lg text-black group-hover:opacity-80 transition-opacity">
              AZ RAYAN
            </span>
            <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase hidden sm:inline">
              ARCHIVE VAULT
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-gray-700" />
            <span>Secure 256-Bit SSL Checkout</span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8 font-medium">
          <Link to="/cart" className="hover:text-black flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Basket</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <span className="text-gray-900 font-semibold">Information & Payment</span>
        </nav>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column: Form Details */}
          <div className="lg:col-span-7 space-y-10">
            {/* Section 1: Contact */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 tracking-tight">
                  Contact Information
                </h2>
                <span className="text-xs text-gray-500">Step 1 of 3</span>
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email address for order confirmation"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  className={`w-full rounded-md border px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all ${
                    errors.email
                      ? 'border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 bg-white focus:border-gray-900 focus:ring-gray-900'
                  }`}
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-4 w-4"
                />
                <span>Keep me updated on rare pressing arrivals and archival restocks</span>
              </label>
            </section>

            {/* Section 2: Delivery Address */}
            <section className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 tracking-tight">
                  Shipping Address
                </h2>
                <span className="text-xs text-gray-500">Step 2 of 3</span>
              </div>

              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Full recipient name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    className={`w-full rounded-md border px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all ${
                      errors.fullName
                        ? 'border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 bg-white focus:border-gray-900 focus:ring-gray-900'
                    }`}
                  />
                  {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Address Line 1 (House number & street)"
                    value={addressLine1}
                    onChange={(e) => {
                      setAddressLine1(e.target.value);
                      if (errors.addressLine1) setErrors((prev) => ({ ...prev, addressLine1: '' }));
                    }}
                    className={`w-full rounded-md border px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all ${
                      errors.addressLine1
                        ? 'border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 bg-white focus:border-gray-900 focus:ring-gray-900'
                    }`}
                  />
                  {errors.addressLine1 && <p className="text-xs text-red-600 mt-1">{errors.addressLine1}</p>}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Apartment, suite, unit (optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="City / Town"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                      }}
                      className={`w-full rounded-md border px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all ${
                        errors.city
                          ? 'border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 bg-white focus:border-gray-900 focus:ring-gray-900'
                      }`}
                    />
                    {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="County / State"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Postal code"
                      value={postcode}
                      onChange={(e) => {
                        setPostcode(e.target.value);
                        if (errors.postcode) setErrors((prev) => ({ ...prev, postcode: '' }));
                      }}
                      className={`w-full rounded-md border px-3.5 py-2.5 text-sm uppercase placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all ${
                        errors.postcode
                          ? 'border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 bg-white focus:border-gray-900 focus:ring-gray-900'
                      }`}
                    />
                    {errors.postcode && <p className="text-xs text-red-600 mt-1">{errors.postcode}</p>}
                  </div>
                </div>

                <div>
                  <input
                    type="tel"
                    placeholder="Phone number for parcel tracking updates"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Shipping Method */}
            <section className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 tracking-tight">
                Shipping Method
              </h2>

              <div className="rounded-lg border border-gray-200 divide-y divide-gray-200 bg-white overflow-hidden shadow-2xs">
                <label
                  onClick={() => setDeliveryTier('standard')}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    deliveryTier === 'standard' ? 'bg-gray-50/80' : 'hover:bg-gray-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="deliveryTier"
                      checked={deliveryTier === 'standard'}
                      onChange={() => setDeliveryTier('standard')}
                      className="h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {settings.standard_shipping_name}
                      </div>
                      <div className="text-xs text-gray-500">{settings.standard_shipping_eta}</div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {isFreeDeliveryQualified ? (
                      <span className="text-emerald-700 font-semibold">FREE</span>
                    ) : (
                      formatGBP(settings.standard_shipping_fee)
                    )}
                  </span>
                </label>

                <label
                  onClick={() => setDeliveryTier('express')}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    deliveryTier === 'express' ? 'bg-gray-50/80' : 'hover:bg-gray-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="deliveryTier"
                      checked={deliveryTier === 'express'}
                      onChange={() => setDeliveryTier('express')}
                      className="h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {settings.express_shipping_name}
                      </div>
                      <div className="text-xs text-gray-500">{settings.express_shipping_eta}</div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {formatGBP(settings.express_shipping_fee)}
                  </span>
                </label>
              </div>
            </section>

            {/* Section 4: Payment (Real Official Stripe Gateway) */}
            <section className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Payment Gateway</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-gray-900 text-white tracking-wider">
                      STRIPE OFFICIAL
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Payments are processed directly on Stripe&apos;s PCI-DSS certified servers.
                  </p>
                </div>
                <span className="text-xs text-gray-500">Step 3 of 3</span>
              </div>

              {/* Official Stripe Gateway Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#635BFF] flex items-center justify-center text-white font-black text-sm shadow-xs">
                      S
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">Stripe Checkout</div>
                      <div className="text-[11px] text-gray-500">Credit / Debit Card, Apple Pay, Google Pay</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <VisaBadge />
                    <MastercardBadge />
                    <AmexBadge />
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  When you click the button below, you will be redirected to the official Stripe payment page (<strong>checkout.stripe.com</strong>) to complete your transaction with 256-bit encryption. All test payments made with card <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono">4242</code> will be logged directly into your Stripe Dashboard.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-[11px] text-gray-500 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Real Stripe API & Dashboard logging</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>PCI Service Provider Level 1 Certified</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary Sidebar (Shopify Aesthetic) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs lg:sticky lg:top-24 space-y-6">
              <h3 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100">
                Order Summary ({items.length})
              </h3>

              {/* Items List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-3">
                {items.map((i) => (
                  <div key={i.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={i.product.cover_image_url}
                          alt={i.product.title}
                          className="w-12 h-16 object-cover rounded-md border border-gray-200 bg-gray-50 shadow-2xs"
                        />
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                          {i.quantity}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {i.product.title}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {i.product.format} • {formatGBP(i.unit_price)} each
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-semibold text-gray-900 shrink-0">
                      {formatGBP(i.unit_price * i.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo Code Input */}
              <div className="pt-4 border-t border-gray-100">
                {appliedPromoCode ? (
                  <div className="flex items-center justify-between p-2.5 rounded-md bg-gray-50 border border-gray-200 text-xs">
                    <div className="flex items-center gap-2 text-gray-900 font-mono font-medium">
                      <Tag className="w-3.5 h-3.5 text-gray-500" />
                      <span>{appliedPromoCode}</span>
                      <span className="text-emerald-700">(-{formatGBP(discount)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePromo()}
                      className="text-gray-400 hover:text-gray-700 transition-colors p-1 cursor-pointer"
                      title="Remove promo code"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Discount code (e.g. RAYAN10)"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          if (promoError) setPromoError('');
                        }}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs uppercase font-mono placeholder:text-gray-400 placeholder:normal-case focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="shrink-0 px-3.5 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && <p className="text-[11px] text-red-600 mt-1">{promoError}</p>}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-4 border-t border-gray-100 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono text-gray-900">{formatGBP(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span className="font-mono">- {formatGBP(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="font-mono text-gray-900">
                    {shippingCost === 0 ? (
                      <span className="text-emerald-700 font-semibold">FREE</span>
                    ) : (
                      formatGBP(shippingCost)
                    )}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-3 border-t border-gray-200 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <div className="text-right">
                    <span className="text-[11px] text-gray-400 font-normal mr-1.5 uppercase font-mono">GBP</span>
                    <span className="font-mono text-lg">{formatGBP(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Primary Action Button -> DIRECT TO STRIPE */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-lg bg-[#635BFF] hover:bg-[#5349e0] text-white text-sm font-semibold tracking-wide transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Stripe...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Proceed to Stripe ({formatGBP(totalAmount)})</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </>
                )}
              </button>

              {/* Guarantees */}
              <div className="pt-2 text-center text-[11px] text-gray-500 space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-700" />
                  <span>30-Day Money Back Guarantee • Royal Mail Tracked</span>
                </div>
                <div className="text-[10px] text-gray-400">
                  AZ Rayan Ltd (UK Company No. 13894195)
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};
