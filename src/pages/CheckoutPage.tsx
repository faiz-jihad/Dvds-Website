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
  Building2,
  Truck,
  CreditCard,
} from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { publicApi } from '../lib/publicApi';
import { formatGBP } from '../lib/formatters';
import { useUiStore } from '../stores/useUiStore';
import { StoreDataState } from '../components/common/StoreDataState';
import { PaymentMethodType } from '../types';

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

// Official PayPal Wordmark SVG
const PayPalWordmark = () => (
  <svg viewBox="0 0 80 20" className="h-4 w-auto" fill="none">
    <path
      d="M7.4 2.5h-4.3c-.4 0-.8.3-.9.7l-2.2 13.9c-.1.4.2.8.6.8h2.3c.4 0 .7-.3.8-.7l.6-3.8c.1-.4.4-.7.8-.7h1.4c2.8 0 4.9-1.1 5.5-4.3.3-1.4.1-2.6-.5-3.5-.8-1.1-2.2-1.7-4.1-1.7zm.6 4.4c-.3 2.1-1.7 2.1-3.2 2.1h-.8l.6-3.8c0-.2.2-.4.4-.4h.5c1 0 2 .1 2.3.8.2.3.2.8.2 1.3z"
      fill="#003087"
    />
    <path
      d="M19.7 7.7h-2.3c-.4 0-.7.3-.8.7l-.1.6-.2-.3c-.6-.9-1.9-1.2-3.1-1.2-2.9 0-5.4 2.2-5.9 5.3-.3 1.6 0 3.2 1 4.3 1 .9 2.2 1.4 3.7 1.4 2.1 0 3.2-1.3 3.2-1.3l-.1.6c-.1.4.2.8.6.8h2.2c.4 0 .7-.3.8-.7l1.5-9.6c.1-.4-.2-.9-.6-.9zm-3.2 4.9c-.3 1.6-1.5 2.7-3.1 2.7-.8 0-1.5-.3-1.9-.8-.4-.5-.6-1.2-.4-2 .3-1.6 1.6-2.7 3.1-2.7.8 0 1.4.3 1.9.8.4.6.5 1.3.4 2z"
      fill="#0079C1"
    />
    <path
      d="M32.2 7.7h-2.3c-.3 0-.6.2-.7.5l-3.2 7.3-1.4-7c-.1-.4-.4-.8-.8-.8h-2.3c-.4 0-.8.4-.7.8l2.6 12.3c-.1.4-.4.7-.8.7h-1.8c-.4 0-.7.3-.8.7l-.4 2.3c-.1.4.2.8.6.8h3c1.7 0 3-.8 3.6-2.3l6.5-14.5c.2-.4-.1-.8-.6-.8z"
      fill="#00457C"
    />
    <path
      d="M39.6 2.5h-4.3c-.4 0-.8.3-.9.7l-2.2 13.9c-.1.4.2.8.6.8h2.4c.4 0 .7-.3.8-.7l.6-3.8c.1-.4.4-.7.8-.7h1.4c2.8 0 4.9-1.1 5.5-4.3.3-1.4.1-2.6-.5-3.5-.8-1.1-2.2-1.7-4.1-1.7zm.6 4.4c-.3 2.1-1.7 2.1-3.2 2.1h-.8l.6-3.8c0-.2.2-.4.4-.4h.5c1 0 2 .1 2.3.8.2.3.2.8.2 1.3z"
      fill="#003087"
    />
    <path
      d="M51.9 7.7h-2.3c-.4 0-.7.3-.8.7l-.1.6-.2-.3c-.6-.9-1.9-1.2-3.1-1.2-2.9 0-5.4 2.2-5.9 5.3-.3 1.6 0 3.2 1 4.3 1 .9 2.2 1.4 3.7 1.4 2.1 0 3.2-1.3 3.2-1.3l-.1.6c-.1.4.2.8.6.8h2.2c.4 0 .7-.3.8-.7l1.5-9.6c.1-.4-.2-.9-.6-.9zm-3.2 4.9c-.3 1.6-1.5 2.7-3.1 2.7-.8 0-1.5-.3-1.9-.8-.4-.5-.6-1.2-.4-2 .3-1.6 1.6-2.7 3.1-2.7.8 0 1.4.3 1.9.8.4.6.5 1.3.4 2z"
      fill="#0079C1"
    />
    <path
      d="M57.6 2.5h-2.3c-.4 0-.7.3-.8.7l-2.2 13.9c-.1.4.2.8.6.8h2.2c.4 0 .7-.3.8-.7l2.2-13.9c.1-.4-.2-.8-.7-.8z"
      fill="#00457C"
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const settings = settingsQuery.data;
  const isFreeDeliveryQualified = true;
  const shippingCost = settings
    ? deliveryTier === 'express'
      ? (settings.express_shipping_fee || 4.99)
      : 0
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
      const shippingAddress = {
        id: crypto.randomUUID(),
        full_name: fullName,
        phone,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city,
        county,
        postcode: postcode.toUpperCase(),
        country: 'United Kingdom',
      };

      if (paymentMethod === 'card') {
        const session = await publicApi.createCheckoutSession({
          items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
          customerEmail: email,
          deliveryTier,
          promoCode: appliedPromoCode,
          totalAmount,
          paymentMethod: 'stripe_hosted',
          shippingAddress,
        });

        if (session?.url && (session.url.startsWith('http://') || session.url.startsWith('https://'))) {
          window.location.assign(session.url);
        } else if (session?.url) {
          clearCart();
          navigate(session.url);
        }
      } else if (paymentMethod === 'paypal') {
        const res = await publicApi.createPayPalOrder({
          items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
          customerEmail: email,
          deliveryTier,
          promoCode: appliedPromoCode,
          totalAmount,
          shippingAddress,
        });

        if (res?.url && (res.url.startsWith('http://') || res.url.startsWith('https://'))) {
          window.location.assign(res.url);
        } else if (res?.url) {
          clearCart();
          navigate(res.url);
        } else {
          throw new Error('PayPal checkout could not be initialized.');
        }
      } else if (paymentMethod === 'bank_transfer') {
        const res = await publicApi.createBankTransferOrder({
          items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
          customerEmail: email,
          deliveryTier,
          promoCode: appliedPromoCode,
          totalAmount,
          shippingAddress,
        });

        if (res?.orderId) {
          clearCart();
          navigate(`/order-success/${res.orderId}`);
        } else {
          throw new Error('Bank transfer order could not be created.');
        }
      }
    } catch (checkoutError) {
      addToast(checkoutError instanceof Error ? checkoutError.message : 'Checkout initialization failed.', 'error');
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

            {/* Section 4: Payment Methods */}
            <section className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Payment Method</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select your preferred payment method. All transactions are encrypted and authenticated.
                  </p>
                </div>
                <span className="text-xs text-gray-500">Step 3 of 3</span>
              </div>

              <div className="space-y-3">
                {/* Method 1: Credit / Debit Card (Stripe) */}
                <div
                  onClick={() => setPaymentMethod('card')}
                  className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === 'card'
                      ? 'border-gray-900 bg-white shadow-sm ring-1 ring-gray-900'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex items-start gap-3.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="mt-1 h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-800" />
                          <span className="text-sm font-semibold text-gray-900">Credit or Debit Card</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-black text-white text-[9px] font-bold tracking-tight">
                            Pay
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white text-gray-800 border border-gray-200 text-[9px] font-bold tracking-tight">
                            GPay
                          </span>
                          <VisaBadge />
                          <MastercardBadge />
                          <AmexBadge />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Pay securely with Visa, Mastercard, Apple Pay, or Google Pay via Stripe direct hosted checkout.
                      </p>
                    </div>
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="bg-gray-50/80 px-4 sm:px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <StripeWordmark />
                        <span className="text-[11px] text-gray-500">Authorized directly via Stripe UK infrastructure</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <Lock className="w-3 h-3" />
                        <span>256-Bit Encrypted</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Method 2: PayPal */}
                <div
                  onClick={() => setPaymentMethod('paypal')}
                  className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === 'paypal'
                      ? 'border-[#0079C1] bg-white shadow-sm ring-1 ring-[#0079C1]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex items-start gap-3.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                      className="mt-1 h-4 w-4 text-[#0079C1] border-gray-300 focus:ring-[#0079C1]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <PayPalWordmark />
                        </div>
                        <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          Pay in 3 available
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Fast and protected checkout with your PayPal balance, linked bank, or debit/credit card.
                      </p>
                    </div>
                  </div>

                  {paymentMethod === 'paypal' && (
                    <div className="bg-[#0079C1]/5 px-4 sm:px-5 py-3 border-t border-[#0079C1]/10 flex items-center gap-2 text-xs text-[#00457C]">
                      <Lock className="w-3.5 h-3.5 shrink-0 text-[#0079C1]" />
                      <span>You will be redirected securely to PayPal to authorize and confirm your payment.</span>
                    </div>
                  )}
                </div>

                {/* Method 3: Company Bank Transfer */}
                <div
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-gray-900 bg-white shadow-sm ring-1 ring-gray-900'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex items-start gap-3.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="mt-1 h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-800" />
                          <span className="text-sm font-semibold text-gray-900">Company Bank Transfer</span>
                        </div>
                        <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          Barclays Bank UK
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Direct BACS / Faster Payments transfer to AZ Rayan Ltd business account.
                      </p>
                    </div>
                  </div>

                  {paymentMethod === 'bank_transfer' && (
                    <div className="bg-amber-50/70 px-4 sm:px-5 py-3.5 border-t border-amber-100 text-xs text-amber-900 space-y-2">
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-950">
                            Bank Account Details (AZ Rayan Ltd)
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/80 p-2.5 rounded border border-amber-200/60">
                            <div>
                              <span className="text-gray-500 block text-[10px] uppercase font-sans">Bank</span>
                              <span className="font-medium text-gray-900">Barclays Bank UK</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px] uppercase font-sans">Account Name</span>
                              <span className="font-medium text-gray-900">AZ Rayan Ltd</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px] uppercase font-sans">Sort Code</span>
                              <span className="font-semibold text-gray-900">20-00-00</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px] uppercase font-sans">Account Number</span>
                              <span className="font-semibold text-gray-900">13894195</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-amber-800 pt-1">
                            Your order will be created with status <span className="font-semibold text-amber-950">Awaiting Payment</span>. Official bank details and your unique payment reference will be displayed on the confirmation page.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary Sidebar */}
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

              {/* Free UK Delivery Badge Banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-medium">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Free delivery across the UK on all orders</span>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100 text-xs">
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
                  <span>Delivery (UK)</span>
                  <span className="font-mono text-gray-900">
                    {shippingCost === 0 ? (
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                        FREE
                      </span>
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

              {/* Dynamic Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-lg text-white text-sm font-semibold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer group ${
                  paymentMethod === 'paypal'
                    ? 'bg-[#0079C1] hover:bg-[#00457C]'
                    : paymentMethod === 'bank_transfer'
                    ? 'bg-[#111827] hover:bg-[#1f2937]'
                    : 'bg-[#635BFF] hover:bg-[#5349e0]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {paymentMethod === 'paypal'
                        ? 'Connecting to PayPal...'
                        : paymentMethod === 'bank_transfer'
                        ? 'Creating Order...'
                        : 'Connecting to Stripe...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      {paymentMethod === 'paypal'
                        ? `Pay with PayPal (${formatGBP(totalAmount)})`
                        : paymentMethod === 'bank_transfer'
                        ? `Place Order & View Bank Details (${formatGBP(totalAmount)})`
                        : `Proceed to Stripe (${formatGBP(totalAmount)})`}
                    </span>
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
