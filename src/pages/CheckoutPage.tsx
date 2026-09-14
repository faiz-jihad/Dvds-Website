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
  Wifi,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { publicApi } from '../lib/publicApi';
import { formatGBP } from '../lib/formatters';
import { useUiStore } from '../stores/useUiStore';
import { StoreDataState } from '../components/common/StoreDataState';

// Official Stripe Wordmark SVG
const StripeWordmark = () => (
  <svg viewBox="0 0 60 25" className="h-5 w-auto" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M59.64 14.28c0-4.49-2.22-7.85-6.52-7.85-4.32 0-6.9 3.36-6.9 7.82 0 5.28 3.12 7.78 7.49 7.78 2.14 0 3.75-.48 4.97-1.16v-3.41c-1.22.61-2.58.96-4.22.96-1.74 0-3.29-.65-3.52-2.65h8.65c.03-.43.05-.98.05-1.49zm-8.68-1.57c.1-1.83 1.25-2.6 2.37-2.6 1.1 0 2.21.77 2.21 2.6h-4.58zM41.38 6.43h-4.59v15.22h4.59V6.43zm-2.31-5.61a2.66 2.66 0 00-2.66 2.66c0 1.47 1.19 2.66 2.66 2.66 1.47 0 2.66-1.19 2.66-2.66 0-1.47-1.19-2.66-2.66-2.66zm-5.77 8.75c-.88-.5-2.12-.86-3.41-.86-2.45 0-4.04 1.29-4.04 3.44 0 3.74 5.14 3.14 5.14 4.76 0 .58-.5.78-1.23.78-1.6 0-3.63-.67-4.71-1.32v3.74c1.23.53 2.92.83 4.47.83 2.58 0 4.25-1.27 4.25-3.48-.01-4.03-5.17-3.29-5.17-4.83 0-.5.44-.73 1.11-.73 1.34 0 2.97.47 3.59.85V9.57zm-14.88-3.14h-4.3v2.85h-.06c-.73-1.89-2.48-3.22-4.5-3.22-3.64 0-6.15 3.08-6.15 7.79 0 5.12 2.76 7.78 6.37 7.78 1.95 0 3.45-1.07 4.27-2.73h.06v2.36h4.31V6.43zm-7.61 11.53c-1.85 0-3.15-1.55-3.15-4.14 0-2.54 1.28-4.12 3.15-4.12 1.83 0 3.15 1.58 3.15 4.12 0 2.59-1.32 4.14-3.15 4.14zM3.48 10.36C2.26 9.87 1.47 9.53 1.47 8.9c0-.52.53-.88 1.43-.88 1.45 0 3.3.49 4.39 1.13V5.55C6.08 5.04 4.54 4.8 2.87 4.8.44 4.8-1.4 6.13-1.4 8.7c0 4.19 5.38 3.48 5.38 5.27 0 .67-.6 1.01-1.57 1.01-1.74 0-3.95-.73-5.28-1.5v3.83c1.47.64 3.32 1.01 5.02 1.01 2.54 0 4.54-1.27 4.54-3.91 0-4.32-5.21-3.56-5.21-5.05z"
      fill="#635BFF"
    />
  </svg>
);

// High-fidelity card brand badges
const VisaBadge = () => (
  <svg viewBox="0 0 36 24" className="h-5 w-8 rounded shadow-2xs shrink-0" fill="none">
    <rect width="36" height="24" rx="3" fill="#1434CB" />
    <path
      d="M14.6 15.6l1.6-9.2h2.5l-1.6 9.2h-2.5zm7.3-9c-.5-.2-1.3-.4-2.3-.4-2.5 0-4.3 1.3-4.3 3.1 0 1.4 1.3 2.1 2.3 2.6 1 .5 1.4.8 1.4 1.2 0 .7-.8 1-1.6 1-.9 0-1.5-.1-2.2-.4l-.3-.1-.3 1.9c.5.2 1.5.4 2.5.4 2.7 0 4.4-1.3 4.4-3.2 0-1.1-.7-2-2.2-2.7-.9-.4-1.4-.7-1.4-1.1 0-.4.4-.8 1.4-.8.8 0 1.4.2 1.8.3l.2.1.3-1.9zm5.3 5.9c.2-.5 1-2.5 1-2.5.0-.1.2-.4.3-.7l.2.8s.4 2 .5 2.4h-2zm3.1-6.1h-2c-.6 0-1.1.2-1.3.8l-3.8 8.4h2.6l.5-1.4h3.2l.3 1.4h2.3l-1.8-9.2zm-17.6 0l-2.4 6.3-.3-1.3c-.5-1.6-2-3.4-3.7-4.3l2.4 8.2h2.7l4-9.2h-2.7z"
      fill="#FFFFFF"
    />
  </svg>
);

const MastercardBadge = () => (
  <svg viewBox="0 0 36 24" className="h-5 w-8 rounded shadow-2xs shrink-0" fill="none">
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
  <svg viewBox="0 0 36 24" className="h-5 w-8 rounded shadow-2xs shrink-0" fill="none">
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
  const isFreeDeliveryQualified = settings
    ? settings.free_shipping_threshold <= 0 || settings.standard_shipping_fee === 0 || subtotal >= settings.free_shipping_threshold
    : true;
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
                  placeholder="Email address for order tracking & receipt"
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
                    placeholder="Phone number for Royal Mail dispatch alerts"
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
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <span>{settings.standard_shipping_name}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Free across UK
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{settings.standard_shipping_eta}</div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700 font-mono">
                    {isFreeDeliveryQualified ? 'FREE' : formatGBP(settings.standard_shipping_fee)}
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

            {/* Section 4: Luxury Stripe Payment Card Component */}
            <section className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Payment Method</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Encrypted and authorized directly via Stripe UK infrastructure.
                  </p>
                </div>
                <span className="text-xs text-gray-500">Step 3 of 3</span>
              </div>

              {/* Luxury Virtual Collector Card & Gateway Panel */}
              <div className="rounded-2xl border border-gray-200/90 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Header Strip with Stripe Wordmark and Accepted Badges */}
                <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <StripeWordmark />
                    <span className="h-3.5 w-px bg-gray-300" />
                    <span className="text-xs font-semibold text-gray-700">Official Checkout</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold tracking-tight font-sans">
                      Pay
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white text-gray-800 border border-gray-200 text-[10px] font-bold tracking-tight font-sans">
                      GPay
                    </span>
                    <VisaBadge />
                    <MastercardBadge />
                    <AmexBadge />
                  </div>
                </div>

                {/* Tactile Virtual Card Visual Graphic */}
                <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-gray-50/50">
                  <div className="relative mx-auto max-w-sm rounded-xl bg-gradient-to-br from-[#1A1D24] via-[#12141A] to-[#0A0C10] p-6 text-white shadow-xl border border-white/10 overflow-hidden">
                    {/* Radial Disc Watermark Effect */}
                    <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full border border-white/10 bg-radial from-white/[0.08] to-transparent pointer-events-none" />
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full border border-white/5 pointer-events-none" />

                    {/* Card Top Row: Brand & Wireless Wave */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-xs tracking-wider uppercase text-white">
                          AZ RAYAN
                        </span>
                        <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">
                          ARCHIVE
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/50">
                        <Wifi className="w-4 h-4 rotate-90" />
                      </div>
                    </div>

                    {/* EMV Chip Visual */}
                    <div className="w-10 h-7 rounded-sm bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 border border-amber-300/40 mb-5 relative overflow-hidden shadow-xs">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-amber-600/40" />
                      <div className="absolute inset-y-0 left-1/3 w-px bg-amber-600/40" />
                      <div className="absolute inset-y-0 right-1/3 w-px bg-amber-600/40" />
                    </div>

                    {/* Card Number Mask */}
                    <div className="font-mono text-sm sm:text-base tracking-[0.25em] text-white/90 mb-4 select-none">
                      ••••  ••••  ••••  4242
                    </div>

                    {/* Cardholder & Expiry Row */}
                    <div className="flex items-end justify-between pt-1 border-t border-white/10 text-[10px]">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-white/40 font-medium">
                          Cardholder
                        </div>
                        <div className="font-semibold text-white tracking-wide truncate max-w-[170px] uppercase mt-0.5">
                          {fullName.trim() ? fullName : 'VALUED COLLECTOR'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-white/40 font-medium">
                          Expires
                        </div>
                        <div className="font-mono font-medium text-white tracking-wider mt-0.5">
                          12 / 28
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Assurance Strip */}
                <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5 font-medium text-gray-700">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>256-Bit Bank-Grade Direct Encryption</span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Test Mode Active • Card 4242 Accepted
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
                className="w-full py-3.5 px-4 rounded-lg bg-[#635BFF] hover:bg-[#5349e0] active:scale-[0.99] text-white text-sm font-semibold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer group"
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
                    <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
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
