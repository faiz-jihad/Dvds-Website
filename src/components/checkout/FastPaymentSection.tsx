import React, { useEffect, useRef, useState } from "react";
import { loadStripe, Stripe, StripeElements, StripeExpressCheckoutElement } from "@stripe/stripe-js";
import { Lock, ShieldCheck, Zap } from "lucide-react";
import { Address } from "../../types";
import { checkoutApi } from "../../lib/checkoutApi";
import { countryCode } from "../../../shared/commerce.js";

interface AvailableWallets {
  applePay?: boolean;
  googlePay?: boolean;
  link?: boolean;
  amazonPay?: boolean;
  paypal?: boolean;
}

interface FastPaymentSectionProps {
  items: { product_id: string; quantity: number }[];
  email: string;
  address: Address;
  tier: "standard" | "express";
  promo: string;
  currency: string;
  totalAmount: number;
  isReady: boolean;
  stripePublishableKey?: string | null;
  isDark: boolean;
  disabled?: boolean;
  onPaymentStart?: () => void;
  onPaymentComplete?: (orderId: string) => void;
  onError?: (message: string) => void;
  onMethodsChange?: (methods: AvailableWallets) => void;
}

export const FastPaymentSection: React.FC<FastPaymentSectionProps> = ({
  items,
  email,
  address,
  tier,
  promo,
  currency,
  totalAmount,
  isReady,
  stripePublishableKey,
  isDark,
  disabled = false,
  onPaymentStart,
  onPaymentComplete,
  onError,
  onMethodsChange,
}) => {
  const stripeContainerRef = useRef<HTMLDivElement>(null);

  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [elementsInstance, setElementsInstance] = useState<StripeElements | null>(null);
  const [expressCheckout, setExpressCheckout] = useState<StripeExpressCheckoutElement | null>(null);

  const [hasStripeWallets, setHasStripeWallets] = useState<boolean>(false);
  const [stripeChecked, setStripeChecked] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Keep latest props in refs for event handlers to avoid stale closures
  const stateRef = useRef({
    items,
    email,
    address,
    tier,
    promo,
    currency,
    totalAmount,
    disabled,
    isProcessing,
  });

  useEffect(() => {
    stateRef.current = {
      items,
      email,
      address,
      tier,
      promo,
      currency,
      totalAmount,
      disabled,
      isProcessing,
    };
  }, [items, email, address, tier, promo, currency, totalAmount, disabled, isProcessing]);

  // 1. Initialize Stripe and mount official Express Checkout Element
  useEffect(() => {
    let isMounted = true;
    let element: StripeExpressCheckoutElement | null = null;

    const pubKey =
      stripePublishableKey ||
      (typeof import.meta !== "undefined" ? import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY : null);

    if (!pubKey || !isReady || totalAmount <= 0) {
      setStripeChecked(true);
      return;
    }

    loadStripe(pubKey)
      .then((stripe) => {
        if (!isMounted || !stripe || !stripeContainerRef.current) return;
        setStripeInstance(stripe);

        // Convert amount to minor currency units (e.g. pence for GBP)
        const minorUnit = Math.max(50, Math.round(totalAmount * 100));
        const curr = (currency || "GBP").toLowerCase();

        const elements = stripe.elements({
          mode: "payment",
          amount: minorUnit,
          currency: curr,
          appearance: {
            theme: isDark ? "night" : "stripe",
            variables: {
              colorPrimary: "#0052cc",
              borderRadius: "12px",
            },
          },
        });
        setElementsInstance(elements);

        element = elements.create("expressCheckout", {
          buttonHeight: 46,
          layout: {
            maxColumns: 1,
            overflow: "auto",
          },
          buttonTheme: {
            applePay: isDark ? "white" : "black",
            googlePay: isDark ? "white" : "black",
          },
        });

        element.on("availablepaymentmethodschange", (event) => {
          if (!isMounted) return;
          const pm = event.paymentMethods;
          const wallets: AvailableWallets = {
            applePay: Boolean(pm?.applePay?.available),
            googlePay: Boolean(pm?.googlePay?.available),
            link: Boolean(pm?.link?.available),
            paypal: Boolean(pm?.paypal?.available),
            amazonPay: Boolean(pm?.amazonPay?.available),
          };
          const hasAny = Object.values(wallets).some(Boolean);
          setHasStripeWallets(hasAny);
          setStripeChecked(true);
          onMethodsChange?.(wallets);
        });

        element.on("ready", (event) => {
          if (!isMounted) return;
          setStripeChecked(true);
          // Fallback for Stripe SDKs that emit payment method data on "ready"
          const raw = event as unknown as {
            availablePaymentMethods?: Record<string, boolean>;
            paymentMethods?: Record<string, { available: boolean }>;
          };
          if (raw?.paymentMethods) {
            const pm = raw.paymentMethods;
            const wallets: AvailableWallets = {
              applePay: Boolean(pm?.applePay?.available),
              googlePay: Boolean(pm?.googlePay?.available),
              link: Boolean(pm?.link?.available),
              paypal: Boolean(pm?.paypal?.available),
              amazonPay: Boolean(pm?.amazonPay?.available),
            };
            const hasAny = Object.values(wallets).some(Boolean);
            setHasStripeWallets(hasAny);
            onMethodsChange?.(wallets);
          } else if (raw?.availablePaymentMethods) {
            const methods = raw.availablePaymentMethods;
            const hasAny = Object.values(methods).some(Boolean);
            setHasStripeWallets(hasAny);
            onMethodsChange?.(methods);
          }
        });

        element.on("confirm", async (event) => {
          const current = stateRef.current;
          if (current.disabled || current.isProcessing) return;

          setIsProcessing(true);
          onPaymentStart?.();

          try {
            const { error: submitError } = await elements.submit();
            if (submitError) {
              onError?.(submitError.message || "Please check your checkout details.");
              setIsProcessing(false);
              return;
            }

            // Normalise address from wallet if available, or fall back to form address
            const walletShipping = event.shippingAddress;
            const walletBilling = event.billingDetails;

            const finalAddress: Address = walletShipping?.address
              ? {
                  id: current.address.id || "checkout",
                  full_name:
                    walletShipping.name ||
                    walletBilling?.name ||
                    current.address.full_name ||
                    "Customer",
                  phone: walletBilling?.phone || current.address.phone || "",
                  address_line_1: walletShipping.address.line1 || current.address.address_line_1 || "",
                  address_line_2: walletShipping.address.line2 || current.address.address_line_2 || "",
                  city: walletShipping.address.city || current.address.city || "",
                  county: walletShipping.address.state || current.address.county || "",
                  postcode: walletShipping.address.postal_code || current.address.postcode || "",
                  country: countryCode(walletShipping.address.country) || current.address.country || "GB",
                }
              : current.address;

            const finalEmail = walletBilling?.email || current.email;

            // Zero-trust server payment intent creation (validates stock, calculates server total, enforces £150 limit)
            const intentResult = await checkoutApi.createPaymentIntent({
              items: current.items,
              customerEmail: finalEmail,
              shippingAddress: finalAddress,
              deliveryTier: current.tier,
              promoCode: current.promo,
              expectedTotal: current.totalAmount,
              currency: current.currency || "GBP",
              internationalAcknowledged:
                countryCode(finalAddress.country) !== "GB" ? true : undefined,
            });

            if (intentResult.completed) {
              onPaymentComplete?.(intentResult.orderId);
              window.location.assign(`/order-success/${intentResult.orderId}`);
              return;
            }

            const { error: confirmError } = await stripe.confirmPayment({
              elements,
              clientSecret: intentResult.clientSecret,
              confirmParams: {
                return_url: `${window.location.origin}/order-success/${intentResult.orderId}?session_id=${intentResult.paymentIntentId}`,
              },
            });

            if (confirmError) {
              onError?.(confirmError.message || "Payment could not be completed.");
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Payment processing error.";
            onError?.(message);
          } finally {
            setIsProcessing(false);
          }
        });

        if (stripeContainerRef.current) {
          stripeContainerRef.current.innerHTML = "";
        }
        element.mount(stripeContainerRef.current);
        setExpressCheckout(element);
      })
      .catch((err) => {
        console.warn("[FastPaymentSection] Stripe load warning:", err);
        if (isMounted) setStripeChecked(true);
      });

    return () => {
      isMounted = false;
      if (element) {
        try {
          element.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
      if (stripeContainerRef.current) {
        stripeContainerRef.current.innerHTML = "";
      }
    };
  }, [stripePublishableKey, isReady, isDark]);

  // 2. Update Stripe Elements amount when total changes
  useEffect(() => {
    if (!elementsInstance || totalAmount <= 0) return;
    try {
      const minorUnit = Math.max(50, Math.round(totalAmount * 100));
      elementsInstance.update({
        amount: minorUnit,
        currency: (currency || "GBP").toLowerCase(),
      });
    } catch {
      // Element may be updating or unmounting
    }
  }, [elementsInstance, totalAmount, currency]);

  // Do NOT render anything if Stripe has confirmed no wallet methods are available on this device/browser
  if (stripeChecked && !hasStripeWallets) {
    return null;
  }

  return (
    <div aria-label="Express checkout options" className="w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue/10 dark:bg-blue-400/10 text-brand-blue dark:text-blue-400">
            <Zap size={12} className="fill-current" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-dark dark:text-white">
            Express Checkout
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
          <ShieldCheck size={13} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span><span className="hidden sm:inline">Official </span>Wallet Protected</span>
        </span>
      </div>

      {/* Official Stripe Express Checkout (Apple Pay, Google Pay, Link, Amazon Pay) */}
      <div
        ref={stripeContainerRef}
        id="stripe-express-checkout-element"
        className="w-full overflow-hidden rounded-xl"
      />

      {/* Trust hint */}
      <p className="text-[11px] text-center text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-1.5 px-1">
        <Lock size={11} className="text-gray-400 dark:text-gray-500 shrink-0" />
        <span className="leading-tight">Pay instantly using your saved card via Apple Pay, Google Pay, or Link.</span>
      </p>
    </div>
  );
};
