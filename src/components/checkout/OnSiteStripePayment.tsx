import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import {
  loadStripe,
  Stripe,
  StripeCardElement,
  StripeElements,
  PaymentRequest,
} from "@stripe/stripe-js";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { Address, UiPaymentMethod } from "../../types";
import { checkoutApi } from "../../lib/checkoutApi";
import { countryCode, formatMoney } from "../../../shared/commerce.js";

export interface OnSiteStripePaymentHandle {
  submitPayment: () => void;
}

export interface OnSiteStripePaymentProps {
  method: UiPaymentMethod;
  items: { product_id: string; quantity: number }[];
  totalAmount: number;
  currency: string;
  email: string;
  address: Address;
  tier: "standard" | "express";
  promo: string;
  internationalAcknowledged?: boolean;
  stripePublishableKey?: string | null;
  isDark: boolean;
  disabled?: boolean;
  onPaymentStart?: () => void;
  onPaymentComplete: (orderId: string) => void;
  onError: (message: string) => void;
  onSwitchMethod: (target: UiPaymentMethod) => void;
}

export const OnSiteStripePayment = forwardRef<
  OnSiteStripePaymentHandle,
  OnSiteStripePaymentProps
>(
  (
    {
      method,
      items,
      totalAmount,
      currency,
      email,
      address,
      tier,
      promo,
      internationalAcknowledged,
      stripePublishableKey,
      isDark,
      disabled = false,
      onPaymentStart,
      onPaymentComplete,
      onError,
      onSwitchMethod,
    },
    ref
  ) => {
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const prButtonRef = useRef<HTMLDivElement>(null);

  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null);
  const [cardComplete, setCardComplete] = useState<boolean>(false);
  const [cardBrand, setCardBrand] = useState<string>("unknown");

  // Wallet payment request state
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canPayWallet, setCanPayWallet] = useState<{
    applePay?: boolean;
    googlePay?: boolean;
    link?: boolean;
  } | null>(null);
  const [walletChecking, setWalletChecking] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [stripeInitError, setStripeInitError] = useState<string>("");

  const pubKey =
    stripePublishableKey ||
    (typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY
      : null);

  // 1. Initialize Stripe JS SDK once
  useEffect(() => {
    let active = true;
    if (!pubKey) {
      setStripeInitError("Stripe public key is not configured.");
      setWalletChecking(false);
      return;
    }

    loadStripe(pubKey)
      .then((stripeObj) => {
        if (!active || !stripeObj) return;
        setStripe(stripeObj);
        const els = stripeObj.elements();
        setElements(els);
      })
      .catch((err) => {
        console.error("[Stripe] SDK init error:", err);
        if (active) {
          setStripeInitError("Unable to connect to Stripe secure payment service.");
          setWalletChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [pubKey]);

  // 2. Mount Card Element when method === 'card'
  useEffect(() => {
    if (method !== "card" || !stripe || !elements || !cardContainerRef.current) {
      return;
    }

    cardContainerRef.current.innerHTML = "";

    const card = elements.create("card", {
      hidePostalCode: true, // We already collect postcode in the shipping address
      style: {
        base: {
          color: isDark ? "#FFFFFF" : "#1A202C",
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSmoothing: "antialiased",
          fontSize: "15px",
          "::placeholder": {
            color: isDark ? "#64748B" : "#94A3B8",
          },
          iconColor: isDark ? "#60A5FA" : "#0052CC",
        },
        invalid: {
          color: "#EF4444",
          iconColor: "#EF4444",
        },
      },
    });

    card.mount(cardContainerRef.current);
    setCardElement(card);

    card.on("change", (event) => {
      setCardComplete(event.complete);
      setCardBrand(event.brand || "unknown");
      if (event.error) {
        onError(event.error.message);
      }
    });

    return () => {
      try {
        card.destroy();
      } catch {
        // ignore unmount errors
      }
      setCardElement(null);
      setCardComplete(false);
    };
  }, [method, stripe, elements, isDark]);

  // 3. Setup Payment Request for Google Pay / Apple Pay
  useEffect(() => {
    if (!stripe || totalAmount <= 0) {
      setWalletChecking(false);
      return;
    }

    let active = true;
    setWalletChecking(true);

    const minorUnit = Math.max(50, Math.round(totalAmount * 100));
    const curr = (currency || "GBP").toLowerCase();

    try {
      const pr = stripe.paymentRequest({
        country: "GB",
        currency: curr,
        total: {
          label: "DVD ZONE Order",
          amount: minorUnit,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      pr.canMakePayment().then((result) => {
        if (!active) return;
        setWalletChecking(false);
        if (result) {
          setCanPayWallet({
            applePay: Boolean(result.applePay),
            googlePay: Boolean(result.googlePay),
            link: Boolean(result.link),
          });
          setPaymentRequest(pr);
        } else {
          setCanPayWallet(null);
          setPaymentRequest(null);
        }
      });

      // Handle payment approval event from Google Pay / Apple Pay sheet
      pr.on("paymentmethod", async (event) => {
        setIsSubmitting(true);
        onPaymentStart?.();

        try {
          // Normalise address from wallet if available
          const finalAddress: Address = {
            id: address.id || "checkout",
            full_name: event.payerName || address.full_name || "Customer",
            phone: event.payerPhone || address.phone || "",
            address_line_1: address.address_line_1,
            address_line_2: address.address_line_2 || "",
            city: address.city,
            county: address.county || "",
            postcode: address.postcode,
            country: countryCode(address.country) || "GB",
          };

          const finalEmail = event.payerEmail || email;

          // 1. Create PaymentIntent on server
          const intentResult = await checkoutApi.createPaymentIntent({
            items,
            customerEmail: finalEmail,
            shippingAddress: finalAddress,
            deliveryTier: tier,
            promoCode: promo,
            expectedTotal: totalAmount,
            currency: currency || "GBP",
            internationalAcknowledged,
          });

          // 2. Confirm card payment with wallet payment method
          const { error: confirmErr } = await stripe.confirmCardPayment(
            intentResult.clientSecret,
            { payment_method: event.paymentMethod.id },
            { handleActions: false }
          );

          if (confirmErr) {
            event.complete("fail");
            onError(confirmErr.message || "Wallet payment could not be processed.");
            setIsSubmitting(false);
            return;
          }

          event.complete("success");
          onPaymentComplete(intentResult.orderId);
        } catch (err: unknown) {
          event.complete("fail");
          const msg = err instanceof Error ? err.message : "Payment failed. Please retry.";
          onError(msg);
          setIsSubmitting(false);
        }
      });
    } catch (err) {
      console.warn("[Stripe] Payment request setup warning:", err);
      if (active) setWalletChecking(false);
    }

    return () => {
      active = false;
    };
  }, [stripe, totalAmount, currency, address, email, tier, promo, internationalAcknowledged]);

  // Handler for Direct On-Site Card Submit
  const handleCardSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stripe || !cardElement || isSubmitting || disabled) return;

    if (!cardComplete) {
      onError("Please enter your complete card details (number, expiry, and CVC).");
      const el = document.getElementById("stripe-on-site-card-element");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    onPaymentStart?.();

    try {
      // 1. Create on-site PaymentIntent on backend
      const intentResult = await checkoutApi.createPaymentIntent({
        items,
        customerEmail: email,
        shippingAddress: address,
        deliveryTier: tier,
        promoCode: promo,
        expectedTotal: totalAmount,
        currency: currency || "GBP",
        internationalAcknowledged,
      });

      if (intentResult.completed) {
        onPaymentComplete(intentResult.orderId);
        return;
      }

      // 2. Confirm card payment on-site with zero redirects to checkout.stripe.com
      const { paymentIntent, error: confirmErr } = await stripe.confirmCardPayment(
        intentResult.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: address.full_name || undefined,
              email: email || undefined,
              address: {
                line1: address.address_line_1,
                line2: address.address_line_2 || undefined,
                city: address.city,
                state: address.county || undefined,
                postal_code: address.postcode,
                country: countryCode(address.country) || "GB",
              },
            },
          },
        }
      );

      if (confirmErr) {
        onError(confirmErr.message || "Payment card declined. Please check details or try another card.");
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        onPaymentComplete(intentResult.orderId);
      } else {
        onError("Payment could not be completed. Please retry.");
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment processing error.";
      onError(msg);
      setIsSubmitting(false);
    }
  };

  // Handler to trigger native Google Pay / Apple Pay sheet on-site
  const handleTriggerWallet = () => {
    const isGoogle = method === "google_pay";
    const isApple = method === "apple_pay";

    if (isGoogle && canPayWallet?.googlePay && paymentRequest) {
      paymentRequest.show();
    } else if (isApple && canPayWallet?.applePay && paymentRequest) {
      paymentRequest.show();
    } else {
      onError(
        isGoogle
          ? "Google Wallet is not configured on this browser. We have switched you to Card payment below."
          : "Apple Pay is exclusive to Safari on Apple devices. We have switched you to Card payment below."
      );
      onSwitchMethod("card");
    }
  };

  // Expose imperative trigger to parent checkout page
  useImperativeHandle(ref, () => ({
    submitPayment() {
      if (method === "card") {
        handleCardSubmit();
      } else if (method === "google_pay" || method === "apple_pay") {
        handleTriggerWallet();
      } else {
        onSwitchMethod("card");
      }
    },
  }));

  // RENDER: Card Option (On-site Card input)
  if (method === "card") {
    return (
      <div className="space-y-4 pt-1">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <CreditCard size={14} className="text-brand-blue" />
              <span>Enter card credentials securely</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-[#1A1F71] dark:text-[#5B7FFF] bg-blue-50 dark:bg-blue-900/40 border border-blue-200/60 dark:border-blue-700/50 px-1.5 py-0.5 rounded">
                VISA
              </span>
              <span className="text-[10px] font-bold text-[#EB001B] bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 px-1.5 py-0.5 rounded">
                MC
              </span>
            </div>
          </div>

          {/* Stripe Card Element Mount Target */}
          <div
            ref={cardContainerRef}
            id="stripe-on-site-card-element"
            className="p-3.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-black/20 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition-all"
          />

          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-2 px-0.5">
            <span className="flex items-center gap-1">
              <Lock size={11} className="text-emerald-500" />
              <span>Direct on-site 256-bit encryption (No redirects)</span>
            </span>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
              Powered by Stripe
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCardSubmit}
          disabled={!cardComplete || isSubmitting || disabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              <span>Processing secure payment...</span>
            </>
          ) : (
            <>
              <span>Pay Now • {formatMoney(totalAmount, currency)}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    );
  }

  // RENDER: Google Pay Option
  if (method === "google_pay") {
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={handleTriggerWallet}
          disabled={isSubmitting || disabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl bg-black hover:bg-gray-900 text-white font-bold text-xs shadow-md border border-white/10 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Processing Google Pay...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-sans font-semibold">
                <span>Pay with</span>
                <span className="font-extrabold text-white tracking-tight flex items-center gap-0.5">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                  <span className="text-white ml-0.5">Pay</span>
                </span>
              </div>
              <span className="text-gray-400">•</span>
              <span>{formatMoney(totalAmount, currency)}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // RENDER: Apple Pay Option
  if (method === "apple_pay") {
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={handleTriggerWallet}
          disabled={isSubmitting || disabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-black hover:bg-gray-900 text-white font-bold text-xs shadow-md border border-white/10 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Processing Apple Pay...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.56.64-.97 1.7-0.85 2.73 1 .08 1.94-.48 2.56-1.23z" />
              </svg>
              <span>Pay with Apple Pay • {formatMoney(totalAmount, currency)}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // RENDER: Amazon Pay Option
  if (method === "amazon_pay") {
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={handleTriggerWallet}
          disabled={isSubmitting || disabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#FF9900] hover:bg-[#E88B00] text-dark font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <span>Pay with Amazon Pay • {formatMoney(totalAmount, currency)}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return null;
});

