import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Truck,
  Wallet,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useCartStore } from "../stores/useCartStore";
import { useThemeStore } from "../stores/useThemeStore";
import {
  checkoutApi,
  currentCheckoutAttempt,
  forgetCheckoutAttempt,
} from "../lib/checkoutApi";
import { publicApi } from "../lib/publicApi";
import { cn } from "../lib/formatters";
import {
  COUNTRIES,
  addressRules,
  countryCode,
  countryName,
  formatMoney,
  normalizeAddress,
} from "../../shared/commerce.js";
import { Address, PaymentMethodType, UiPaymentMethod } from "../types";
import { useCustomerAuth } from "../auth/CustomerAuth";
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from "../lib/checkoutDraft";
import { FastPaymentSection } from "../components/checkout/FastPaymentSection";
import { Seo } from "../components/common/Seo";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] px-3.5 py-3 text-sm text-dark dark:text-white outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:bg-gray-50 dark:disabled:bg-white/5 transition-colors";

const isAppleDevice =
  typeof navigator !== "undefined" &&
  (/Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const VisaCardIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <div className="flex items-center gap-1.5 shrink-0">
    <CreditCard size={18} className="text-gray-700 dark:text-gray-200" />
    <span className="font-extrabold italic text-[11px] tracking-tight text-[#1A1F71] dark:text-[#5B7FFF] bg-blue-50 dark:bg-blue-900/40 px-1 py-0.2 rounded border border-blue-200/60 dark:border-blue-700/50">
      VISA
    </span>
  </div>
);

const ApplePayIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.56.64-.97 1.7-0.85 2.73 1 .08 1.94-.48 2.56-1.23z" />
  </svg>
);

const GooglePayIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
  </svg>
);

const AmazonPayIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path fill="#FF9900" d="M14.7 15.8c-2.3 1.6-5.6 2.5-8.5 2.5-4 0-7.6-1.5-10.3-4.1-.3-.3-.3-.5 0-.8.5-.4 1.1-.8 1.8-1.2.3-.2.5-.1.7.1 2.2 2 5.2 3.3 8.4 3.3 2.3 0 4.9-.7 7-2.1.4-.3.8 0 .9.4.2.5.2 1.1-.1 1.9h.1zm2.7-1.7c-.3-.4-.6-.5-1-.5-.4 0-.9.3-1.1.5-2.2 2-5.1 3.2-8.3 3.2-3.6 0-6.8-1.4-9.2-3.7-.3-.3-.6-.3-.9 0l-1 1c-.3.3-.3.6 0 .9 2.9 2.8 6.8 4.5 11.1 4.5 3.7 0 7.2-1.4 9.7-3.8.4-.3.4-.8 0-1.1l-.5-.5 1.2-1v.5zm9.6 6.1c-.4-.5-2.4-.3-3.3-.1-.3 0-.4-.3-.3-.4.8-1.1 2.4-4.3 2.2-4.7-.3-.3-3.3 1.3-4.6 1.9-.3.1-.4 0-.5-.1-.3-.6-1-2.3-1.5-2.8-.1-.3 0-.4.3-.5 3.4-1.1 7.9-1.5 8.3-1 .4.5-.1 5.7-.5 7.7 0 .3-.3.4-.5.2 0-.2.2-.1.4-.2z"/>
  </svg>
);

const PaypalIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path fill="#003087" d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.665h6.634c3.15 0 5.485 1.34 5.992 4.238.455 2.603-.96 4.846-3.456 5.768-.13.048-.2.185-.164.321.41 1.547.012 3.018-1.127 3.821-1.18.831-2.98.831-4.872.831H7.81a.789.789 0 0 0-.734.723z"/>
    <path fill="#0079C1" d="M9.13 18.064l1.107-7.016a.789.789 0 0 1 .778-.665h4.372c2.923 0 4.965 1.258 5.345 3.424.49 2.788-1.272 5.088-4.225 5.088h-2.825a.789.789 0 0 0-.777.665l-.777 4.93a.586.586 0 0 1-.578.497H8.56a.48.48 0 0 1-.473-.556l1.043-6.367z"/>
  </svg>
);

const methods = [
  {
    id: "card" as const,
    name: "Visa debit or credit card",
    icon: VisaCardIcon,
    description:
      "Pay securely with any Visa, Mastercard, or debit/credit card.",
    detail:
      "You will be redirected to Stripe's secure 256-bit bank-grade checkout to complete payment with your card.",
    badge: "Powered by Stripe",
    provider: "stripe" as const,
  },
  {
    id: "apple_pay" as const,
    name: "Apple Pay",
    icon: ApplePayIcon,
    description:
      "Fast 1-touch secure payment with Apple Wallet on supported devices.",
    detail:
      "Pay instantly with Apple Wallet via Stripe's encrypted secure checkout.",
    badge: "Apple Wallet",
    provider: "stripe" as const,
  },
  {
    id: "google_pay" as const,
    name: "Google Pay",
    icon: GooglePayIcon,
    description:
      "Quick and frictionless checkout with cards saved to your Google account.",
    detail:
      "Pay securely with Google Pay via Stripe's encrypted secure checkout.",
    badge: "Google Wallet",
    provider: "stripe" as const,
  },
  {
    id: "amazon_pay" as const,
    name: "Amazon Pay",
    icon: AmazonPayIcon,
    description:
      "Use your Amazon account payment credentials for a fast, trusted checkout.",
    detail:
      "Pay with Amazon Pay via Stripe's encrypted secure checkout.",
    badge: "Amazon checkout",
    provider: "stripe" as const,
  },
  {
    id: "paypal" as const,
    name: "PayPal",
    icon: PaypalIcon,
    description:
      "Pay with your PayPal balance, linked bank account, or PayPal credit.",
    detail:
      "Continue to PayPal to approve your payment securely, then return to your order confirmation.",
    badge: "PayPal checkout",
    provider: "paypal" as const,
  },
];

const CURRENCY_DISPLAY: Record<string, string> = {
  GBP: "GBP (£) — British Pound",
  EUR: "EUR (€) — Euro",
  USD: "USD ($) — US Dollar",
  CAD: "CAD ($) — Canadian Dollar",
  AUD: "AUD ($) — Australian Dollar",
  JPY: "JPY (¥) — Japanese Yen",
  IDR: "IDR (Rp) — Indonesian Rupiah",
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customer, isLoading: authLoading } = useCustomerAuth();
  const items = useCartStore((state) => state.items);
  const appliedPromo = useCartStore((state) => state.appliedPromoCode);
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  // Restore previous checkout draft if user navigated away or reloaded
  const savedDraft = React.useMemo(
    () => loadCheckoutDraft(customer?.id),
    [customer?.id],
  );

  const [email, setEmail] = useState<string>(
    () => savedDraft?.email || customer?.email || "",
  );
  const [address, setAddress] = useState<Address>(() => {
    if (savedDraft?.address) return savedDraft.address;
    return {
      id: "checkout",
      full_name: customer?.full_name || "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      county: "",
      postcode: "",
      country: "GB",
      phone: customer?.phone || "",
    };
  });
  const [currency, setCurrency] = useState<string>(
    () => savedDraft?.currency || "GBP",
  );
  const [internationalAcknowledged, setInternationalAcknowledged] =
    useState<boolean>(() => savedDraft?.internationalAcknowledged ?? false);
  const rules = addressRules(address.country);
  const international = countryCode(address.country) !== "GB";
  const configQuery = useQuery({
    queryKey: ["checkout-config"],
    queryFn: checkoutApi.configuration,
    staleTime: 30_000,
  });
  const currencies = configQuery.data?.currencies?.length
    ? configQuery.data.currencies
    : ["GBP", "EUR", "USD"];
  const [tier, setTier] = useState<"standard" | "express">(
    () => savedDraft?.tier || "standard",
  );
  const [method, setMethod] = useState<UiPaymentMethod>(
    () => ((savedDraft?.method as UiPaymentMethod) || "card"),
  );
  const backendMethod: PaymentMethodType = method === "paypal" ? "paypal" : "card";
  const [promo, setPromo] = useState<string>(
    () => savedDraft?.promo ?? (appliedPromo || ""),
  );
  const [promoDraft, setPromoDraft] = useState<string>(
    () => savedDraft?.promoDraft ?? (appliedPromo || ""),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(currentCheckoutAttempt);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    () => savedDraft?.selectedAddressId || "initial",
  );
  const [saveNewAddress, setSaveNewAddress] = useState<boolean>(
    () => savedDraft?.saveNewAddress ?? true,
  );
  // Wallet methods detected by Stripe Express Checkout Element on this device/browser
  const [fastMethods, setFastMethods] = useState<{
    applePay?: boolean;
    googlePay?: boolean;
    link?: boolean;
    amazonPay?: boolean;
    paypal?: boolean;
  } | null>(null);
  const hasFastMethods = Boolean(
    fastMethods && Object.values(fastMethods).some(Boolean),
  );

  const basket = items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
  }));
  const quoteQuery = useQuery({
    queryKey: [
      "checkout-quote",
      basket,
      tier,
      promo,
      address.country,
      currency,
    ],
    queryFn: () =>
      checkoutApi.quote({
        items: basket,
        deliveryTier: tier,
        promoCode: promo,
        country: address.country,
        currency,
      }),
    enabled: items.length > 0,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const quote = quoteQuery.data;
  const displayPrice = (amount: number) =>
    formatMoney(amount, quote?.currency || currency);

  useEffect(() => {
    if (quote) {
      const isCurrentAvailable =
        method === "paypal" ? Boolean(quote.methods.paypal) : Boolean(quote.methods.card);
      if (!isCurrentAvailable) {
        if (quote.methods.card) setMethod("card");
        else if (quote.methods.paypal) setMethod("paypal");
      }
    }
  }, [quote, method]);

  const savedAddressesQuery = useQuery({
    queryKey: ["account", "addresses"],
    queryFn: publicApi.getMyAddresses,
    enabled: Boolean(customer),
    staleTime: 30_000,
  });
  const savedAddresses = savedAddressesQuery.data || [];

  const applySavedAddress = (saved: Address) => {
    const code = countryCode(saved.country) || "GB";
    setAddress({
      id: saved.id,
      full_name: saved.full_name || customer?.full_name || "",
      phone: saved.phone || customer?.phone || "",
      address_line_1: saved.address_line_1 || "",
      address_line_2: saved.address_line_2 || "",
      city: saved.city || "",
      county: saved.county || "",
      postcode: saved.postcode || "",
      country: code,
    });
    setTier("standard");
    setInternationalAcknowledged(false);
    setError("");
    if (code === "US" && currencies.includes("USD")) {
      setCurrency("USD");
    } else if (
      [
        "AT",
        "BE",
        "CY",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "IE",
        "IT",
        "LV",
        "LT",
        "LU",
        "MT",
        "NL",
        "PT",
        "SK",
        "SI",
        "ES",
      ].includes(code) &&
      currencies.includes("EUR")
    ) {
      setCurrency("EUR");
    } else if (code === "ID" && currencies.includes("IDR")) {
      setCurrency("IDR");
    } else if (code === "GB") {
      setCurrency("GBP");
    }
  };

  // Sync customer details when customer auth loads
  useEffect(() => {
    if (customer) {
      setEmail((value) => value || customer.email);
      setAddress((prev) => ({
        ...prev,
        full_name: prev.full_name || customer.full_name || "",
        phone: prev.phone || customer.phone || "",
      }));
    }
  }, [customer]);

  // Handle saved addresses initialization when no draft was already present
  useEffect(() => {
    if (savedAddresses.length > 0) {
      if (selectedAddressId === "initial") {
        const defaultAddr =
          savedAddresses.find((a) => a.is_default) || savedAddresses[0];
        setSelectedAddressId(defaultAddr.id);
        applySavedAddress(defaultAddr);
      }
    } else if (selectedAddressId === "initial") {
      setSelectedAddressId("custom");
    }
  }, [savedAddresses, selectedAddressId]);

  // Automatically persist all user input to localStorage draft so leaving or going back never loses fields
  useEffect(() => {
    if (authLoading) return;
    saveCheckoutDraft({
      customerId: customer?.id,
      email,
      address,
      currency,
      tier,
      method,
      promo,
      promoDraft,
      selectedAddressId,
      saveNewAddress,
      internationalAcknowledged,
    });
  }, [
    authLoading,
    customer?.id,
    email,
    address,
    currency,
    tier,
    method,
    promo,
    promoDraft,
    selectedAddressId,
    saveNewAddress,
    internationalAcknowledged,
  ]);
  const updateAddress = (key: keyof Address, value: string) => {
    if (key === "country") {
      setTier("standard");
      setInternationalAcknowledged(false);
      setError("");
      const code = countryCode(value);
      if (code === "US" && currencies.includes("USD")) {
        setCurrency("USD");
      } else if (
        [
          "AT",
          "BE",
          "CY",
          "EE",
          "FI",
          "FR",
          "DE",
          "GR",
          "IE",
          "IT",
          "LV",
          "LT",
          "LU",
          "MT",
          "NL",
          "PT",
          "SK",
          "SI",
          "ES",
        ].includes(code) &&
        currencies.includes("EUR")
      ) {
        setCurrency("EUR");
      } else if (code === "ID" && currencies.includes("IDR")) {
        setCurrency("IDR");
      } else if (code === "GB") {
        setCurrency("GBP");
      }
    }
    setAddress((previous) => ({ ...previous, [key]: value }));
  };
  const retryAttempt = async () => {
    if (!attempt?.input) return;
    setBusy(true);
    setError("");
    try {
      const result = await checkoutApi.create(attempt.method, attempt.input);
      if (result.completed) {
        clearCheckoutDraft();
        navigate(`/order-success/${result.orderId}`);
      } else if (result.url) {
        window.location.assign(result.url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please retry.");
    } finally {
      setAttempt(currentCheckoutAttempt());
      setBusy(false);
    }
  };
  const cancelAttempt = async () => {
    if (!attempt?.orderId) return;
    setBusy(true);
    setError("");
    try {
      await checkoutApi.cancel(attempt.orderId);
      setAttempt(null);
      await quoteQuery.refetch();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to cancel this payment. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      busy ||
      !quote ||
      quoteQuery.isFetching ||
      quoteQuery.isError ||
      !quote.methods[backendMethod]
    )
      return;
    let validatedAddress;
    try {
      validatedAddress = normalizeAddress({ ...address });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check your address.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (international && !internationalAcknowledged) {
      setError("Acknowledge the international delivery notice to continue.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // 1. IF PAYPAL: proceed with PayPal flow
    if (method === "paypal") {
      setBusy(true);
      setError("");

      if (attempt?.orderId) {
        try {
          await checkoutApi.cancel(attempt.orderId);
        } catch {
          // ignore cancellation error
        }
      }
      forgetCheckoutAttempt();
      setAttempt(null);

      try {
        const result = await checkoutApi.create("paypal", {
          items: basket,
          customerEmail: email,
          shippingAddress: { ...address, ...validatedAddress },
          deliveryTier: tier,
          promoCode: promo,
          expectedTotal: quote.total_amount,
          currency: quote.currency || currency,
          internationalAcknowledged,
        });
        setAttempt(currentCheckoutAttempt());
        if (result.completed) {
          clearCheckoutDraft();
          navigate(`/order-success/${result.orderId}`);
        } else if (result.url && new URL(result.url).protocol === "https:") {
          window.location.assign(result.url);
        } else {
          throw new Error("Unable to open PayPal payment. Please retry.");
        }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "PayPal payment could not be started. Please retry.",
        );
        setAttempt(currentCheckoutAttempt());
        await quoteQuery.refetch();
      } finally {
        setBusy(false);
      }
      return;
    }

    // 2. STRIPE PAYMENT METHODS (card, google_pay, apple_pay, amazon_pay):
    // Redirect securely to Stripe's official 256-bit encrypted checkout (checkout.stripe.com) with English locale!
    setBusy(true);
    setError("");

    if (attempt?.orderId) {
      try {
        await checkoutApi.cancel(attempt.orderId);
      } catch {
        // ignore cancellation error
      }
    }
    forgetCheckoutAttempt();
    setAttempt(null);

    try {
      const result = await checkoutApi.create("card", {
        items: basket,
        customerEmail: email,
        shippingAddress: { ...address, ...validatedAddress },
        deliveryTier: tier,
        promoCode: promo,
        expectedTotal: quote.total_amount,
        currency: quote.currency || currency,
        internationalAcknowledged,
      });
      setAttempt(currentCheckoutAttempt());
      if (result.completed) {
        clearCheckoutDraft();
        navigate(`/order-success/${result.orderId}`);
      } else if (result.url) {
        window.location.assign(result.url);
      } else {
        throw new Error("Unable to open secure Stripe checkout. Please retry.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Payment checkout could not be started. Please retry.",
      );
      setAttempt(currentCheckoutAttempt());
      await quoteQuery.refetch();
    } finally {
      setBusy(false);
    }
  };
  if (authLoading) {
    return (
      <div className="bg-gray-50/70 dark:bg-[#07090E] min-h-screen flex flex-col items-center justify-center p-6 text-center text-dark dark:text-white transition-colors">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Verifying customer account...
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Please wait a moment while we load your secure checkout.
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <Navigate
        to="/login?redirect=/checkout"
        state={{ from: "/checkout" }}
        replace
      />
    );
  }

  if (!items.length && !attempt && !busy)
    return <Navigate to="/cart" replace />;

  return (
    <div className="bg-gray-50/70 dark:bg-[#07090E] min-h-screen text-dark dark:text-white transition-colors">
      <Seo
        title="Secure Checkout — DVDs Zone UK"
        description="Complete your order securely with SSL 256-bit encryption. Fast 2-day delivery via Royal Mail across the United Kingdom."
        canonicalPath="/checkout"
        noIndex
      />
      {/* Dedicated Clean Checkout Header Bar with Logo & Theme Switcher */}
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#07090E]/95 backdrop-blur-md sticky top-0 z-30 transition-colors shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group py-1" title="DVDs Zone - Return to shop">
            <img
              src={isDark ? "/brand/logo-dark-theme.png" : "/brand/logo-transparent.png"}
              alt="DVDs Zone"
              className="h-8 sm:h-10 w-auto max-w-[130px] sm:max-w-[170px] object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Direct Theme Switcher Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all cursor-pointer shadow-2xs",
                isDark
                  ? "bg-white/5 hover:bg-white/10 border-white/10 text-brand-blue hover:text-blue-300"
                  : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 hover:text-gray-900"
              )}
              title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
              aria-label="Toggle color theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <Link
              to="/cart"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-2xs"
            >
              <ArrowLeft size={13} />
              <span>Back to basket</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {(searchParams.get("cancelled") === "1" || searchParams.get("cancelled") === "true") && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>
                <strong>Checkout cancelled:</strong> No payment was taken. Your basket items are saved and ready.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("cancelled");
                window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
              }}
              className="text-xs font-semibold underline text-amber-700 dark:text-amber-300 hover:text-amber-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-blue font-semibold">
              Almost yours
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1 text-dark dark:text-white">
              Checkout
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Your details, delivery, and a payment method that suits you.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] px-4 py-2 shadow-2xs">
            <Lock size={14} className="text-brand-blue" /> Secure payment
          </span>
        </div>
        {attempt && (
          <section
            className="rounded-2xl border border-blue-200/90 dark:border-blue-800/40 bg-blue-50/70 dark:bg-blue-950/30 p-5 sm:p-6 mb-6 shadow-xs"
            aria-label="Existing checkout"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800/50 text-brand-blue dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Clock size={19} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base text-dark dark:text-white">
                  You have an order awaiting payment
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  Continue your existing order, or cancel it to release the reserved
                  items and change your checkout.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 mt-4">
                  {attempt.url && (
                    <a
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-hover text-white border border-brand-blue shadow-xs transition-all cursor-pointer"
                      href={attempt.url}
                    >
                      <span>Resume Payment</span>
                      <ExternalLink size={13} />
                    </a>
                  )}
                  {attempt.orderId && (
                    <Link
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#141A26] text-dark dark:text-white border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 shadow-2xs transition-all cursor-pointer"
                      to={`/order-success/${attempt.orderId}`}
                    >
                      <FileText size={13} className="text-gray-500 dark:text-gray-400" />
                      <span>View Order Status</span>
                    </Link>
                  )}
                  {!attempt.url && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={retryAttempt}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-hover text-white border border-brand-blue shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
                      <span>Retry Saved Checkout</span>
                    </button>
                  )}
                  {attempt.orderId && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={cancelAttempt}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#141A26] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/30 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <X size={14} />
                      <span>{busy ? "Please wait..." : "Cancel Order & Edit"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 p-4 mb-6 text-sm"
          >
            {error}
          </div>
        )}
        <form
          onSubmit={submit}
          className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8 items-start"
        >
          <div className="rounded-2xl bg-white dark:bg-[#0E131F] border border-gray-200 dark:border-white/10 p-5 sm:p-8 space-y-8 shadow-xs">

            <fieldset id="checkout-step-1" disabled={busy}>
              <legend className="text-lg font-semibold mb-4 text-dark dark:text-white">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-300 rounded-full text-xs mr-3 font-bold">
                  1
                </span>
                Contact &amp; delivery details
              </legend>

              {customer && savedAddresses.length > 0 && (
                <div className="mb-6 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/20 dark:to-transparent p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <MapPin size={14} className="text-brand-blue" />
                      Select saved address ({savedAddresses.length})
                    </span>
                    <Link
                      to="/account/addresses"
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-blue bg-white dark:bg-[#141A26] border border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shadow-2xs"
                    >
                      <span>Manage addresses</span>
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddressId(addr.id);
                            applySavedAddress(addr);
                          }}
                          className={`text-left p-3.5 rounded-xl border transition-all text-xs relative ${
                            isSelected
                              ? "border-brand-blue bg-white dark:bg-[#141A26] ring-2 ring-blue-200 dark:ring-blue-900/40 shadow-sm"
                              : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26]/60 hover:border-blue-300 dark:hover:border-blue-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                              {isSelected && (
                                <CheckCircle2
                                  size={15}
                                  className="text-brand-blue shrink-0"
                                />
                              )}
                              {addr.full_name}
                            </span>
                            {addr.is_default && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold px-1.5 py-0.5 rounded shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mt-1.5 truncate">
                            {addr.address_line_1}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 truncate">
                            {[addr.city, addr.county, addr.postcode]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                            {countryName(addr.country)}
                          </p>
                          {addr.phone && (
                            <p className="text-gray-400 dark:text-gray-500 mt-1">{addr.phone}</p>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId("custom");
                        setAddress({
                          id: "checkout",
                          full_name: customer?.full_name || "",
                          phone: customer?.phone || "",
                          address_line_1: "",
                          address_line_2: "",
                          city: "",
                          county: "",
                          postcode: "",
                          country: "GB",
                        });
                      }}
                      className={`text-left p-3.5 rounded-xl border-2 border-dashed transition-all text-xs flex flex-col items-center justify-center min-h-[95px] ${
                        selectedAddressId === "custom"
                          ? "border-brand-blue bg-white dark:bg-[#141A26] text-brand-blue font-semibold ring-2 ring-blue-100 dark:ring-blue-900/30"
                          : "border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#141A26]/40 hover:bg-white dark:hover:bg-[#141A26] text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <Plus size={17} className="mb-1 text-brand-blue" />
                      <span className="font-medium">Enter a new address</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        Input custom delivery address
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-6 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-blue ring-4 ring-blue-100 dark:ring-blue-900/40" />
                  <span>
                    Logged in as{" "}
                    <strong className="font-semibold text-blue-950 dark:text-white">
                      {customer?.full_name
                        ? `${customer.full_name} (${customer.email})`
                        : customer?.email}
                    </strong>
                  </span>
                </span>
                <Link
                  to="/login?redirect=/checkout"
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-blue bg-white dark:bg-[#141A26] border border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shadow-2xs"
                >
                  Switch account
                </Link>
              </div>

              {customer && selectedAddressId !== "custom" && (
                <div className="mb-4 flex items-center justify-between bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl px-3.5 py-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <span>
                    Using saved account address. You can adjust details below
                    for this delivery if needed.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = savedAddresses.find(
                        (a) => a.id === selectedAddressId,
                      );
                      if (current) applySavedAddress(current);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-blue bg-white dark:bg-[#141A26] border border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors ml-2 shrink-0 shadow-2xs cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm sm:col-span-2">
                  Email address
                  <input
                    className={fieldClass}
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Delivery country
                  <select
                    className={fieldClass}
                    autoComplete="shipping country"
                    value={address.country}
                    onChange={(event) =>
                      updateAddress("country", event.target.value)
                    }
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Pay in
                  <select
                    className={fieldClass}
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                  >
                    {currencies.map((code) => (
                      <option key={code} value={code}>
                        {CURRENCY_DISPLAY[code] || code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm sm:col-span-2">
                  Full name
                  <input
                    className={fieldClass}
                    autoComplete="shipping name"
                    required
                    maxLength={200}
                    value={address.full_name}
                    onChange={(e) => updateAddress("full_name", e.target.value)}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  Address line 1
                  <input
                    className={fieldClass}
                    autoComplete="shipping address-line1"
                    required
                    maxLength={200}
                    value={address.address_line_1}
                    onChange={(e) =>
                      updateAddress("address_line_1", e.target.value)
                    }
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  Address line 2{" "}
                  <span className="text-gray-400">(optional)</span>
                  <input
                    className={fieldClass}
                    autoComplete="shipping address-line2"
                    maxLength={200}
                    value={address.address_line_2 || ""}
                    onChange={(e) =>
                      updateAddress("address_line_2", e.target.value)
                    }
                  />
                </label>
                <label className="text-sm">
                  Town / city
                  <input
                    className={fieldClass}
                    autoComplete="shipping address-level2"
                    required
                    maxLength={200}
                    value={address.city}
                    onChange={(e) => updateAddress("city", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  {rules.postalLabel}
                  {!rules.postalRequired && (
                    <span className="text-gray-400"> (optional)</span>
                  )}
                  <input
                    className={fieldClass}
                    autoComplete="shipping postal-code"
                    required={rules.postalRequired}
                    maxLength={32}
                    placeholder={
                      address.country === "GB"
                        ? "e.g. SW1A 1AA"
                        : address.country === "US"
                          ? "e.g. 90210"
                          : address.country === "ID"
                            ? "e.g. 10110"
                            : "Enter postal code"
                    }
                    value={address.postcode}
                    onChange={(e) => updateAddress("postcode", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Phone <span className="text-gray-400">(optional)</span>
                  <input
                    className={fieldClass}
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={address.phone || ""}
                    onChange={(e) => updateAddress("phone", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  {rules.stateLabel}
                  {!rules.stateRequired && (
                    <span className="text-gray-400"> (optional)</span>
                  )}
                  <input
                    className={fieldClass}
                    autoComplete="shipping address-level1"
                    required={rules.stateRequired}
                    maxLength={120}
                    value={address.county || ""}
                    onChange={(event) =>
                      updateAddress("county", event.target.value)
                    }
                  />
                </label>

                {selectedAddressId === "custom" && customer && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 sm:col-span-2 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                      className="accent-blue-600 w-4 h-4 rounded"
                    />
                    <span>
                      Save this address to my account for future orders
                    </span>
                  </label>
                )}
              </div>
            </fieldset>
            <fieldset
              disabled={busy}
              className="border-t border-gray-100 dark:border-white/10 pt-7"
            >
              <legend className="text-lg font-semibold float-left w-full mb-5 text-dark dark:text-white">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-300 rounded-full text-xs mr-3 font-bold">
                  2
                </span>
                Delivery method
              </legend>
              <div className="clear-both space-y-3">
                {(["standard", "express"] as const)
                  .filter((option) => !quote || Boolean(quote.delivery[option]))
                  .map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-900/40 transition-colors ${
                        tier === option
                          ? "border-brand-blue bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-brand-blue"
                          : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26]/50 hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        checked={tier === option}
                        onChange={() => setTier(option)}
                        className="accent-blue-600 w-4 h-4 shrink-0"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-dark dark:text-white">
                          {quote?.delivery[option]?.name ||
                            (option === "standard"
                              ? "Standard delivery"
                              : "Express delivery")}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {quote?.delivery[option]?.eta ||
                            "Delivery estimate shown with your total"}
                        </span>
                      </span>
                      <span
                        className={`text-sm font-semibold shrink-0 ${quote?.delivery[option]?.amount === 0 ? "text-brand-blue dark:text-blue-400 font-bold" : "text-dark dark:text-white"}`}
                      >
                        {quote
                          ? quote.delivery[option]!.amount === 0
                            ? "FREE"
                            : displayPrice(quote.delivery[option]!.amount)
                          : "--"}
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>
            <fieldset
              disabled={busy}
              className="border-t border-gray-100 dark:border-white/10 pt-7"
            >
              <legend className="text-lg font-semibold float-left w-full mb-1 text-dark dark:text-white">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-300 rounded-full text-xs mr-3 font-bold">
                  3
                </span>
                Payment method
              </legend>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 clear-both">
                Choose how you would like to pay.
              </p>

              {/* Express Checkout Element for 1-click wallets (only mounted if device supports them) */}
              <div className="clear-both">
                <FastPaymentSection
                  items={basket}
                  email={email}
                  address={address}
                  tier={tier}
                  promo={promo}
                  currency={quote?.currency || currency}
                  totalAmount={quote?.total_amount || 0}
                  isReady={Boolean(quote && !quoteQuery.isFetching && !quoteQuery.isError)}
                  stripePublishableKey={configQuery.data?.stripePublishableKey}
                  isDark={isDark}
                  disabled={busy || Boolean(attempt)}
                  onPaymentStart={() => {
                    setBusy(true);
                    setError("");
                  }}
                  onPaymentComplete={(orderId) => {
                    clearCheckoutDraft();
                    navigate(`/order-success/${orderId}`);
                  }}
                  onError={(err) => {
                    setError(err);
                    setBusy(false);
                    setAttempt(currentCheckoutAttempt());
                  }}
                  onMethodsChange={(detected) => {
                    setFastMethods(detected);
                  }}
                />

                {hasFastMethods && (
                  <div className="relative my-4 text-center" aria-hidden="true">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-white/10" />
                    </div>
                    <div className="relative inline-flex items-center gap-2 px-4 bg-white dark:bg-[#0E131F] text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      <span>OR CHOOSE PAYMENT METHOD</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment method card choices */}
              <div
                role="radiogroup"
                aria-label="Payment method"
                className="space-y-3 clear-both mt-1"
              >
                {methods.map((option) => {
                  const isAvailable =
                    option.provider === "paypal"
                      ? (quote ? Boolean(quote.methods.paypal) : true)
                      : (quote ? Boolean(quote.methods.card) : true);
                  const selected = method === option.id;
                  const Icon = option.icon;

                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "rounded-xl border transition-all overflow-hidden text-left",
                        selected
                          ? "border-brand-blue bg-blue-50/30 dark:bg-blue-950/25 ring-2 ring-brand-blue/40 shadow-xs"
                          : isAvailable
                            ? "border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26]/60 hover:border-blue-300 dark:hover:border-blue-700/60"
                            : "border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 opacity-50 cursor-not-allowed"
                      )}
                    >
                      {/* Clickable Header Row */}
                      <div
                        onClick={() => {
                          if (isAvailable && !busy) {
                            setMethod(option.id);
                          }
                        }}
                        className="p-4 flex items-start gap-3.5 cursor-pointer select-none"
                      >
                        {/* Native Radio Button */}
                        <div className="pt-0.5 shrink-0">
                          <input
                            id={`payment-opt-${option.id}`}
                            type="radio"
                            name="payment_method_choice"
                            value={option.id}
                            checked={selected}
                            disabled={!isAvailable || busy}
                            onChange={() => setMethod(option.id)}
                            className="w-4 h-4 text-brand-blue accent-blue-600 cursor-pointer"
                          />
                        </div>

                        {/* Title, Badges & Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="h-5 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-dark dark:text-white" />
                              </div>
                              <label
                                htmlFor={`payment-opt-${option.id}`}
                                className="text-sm font-bold text-dark dark:text-white cursor-pointer"
                              >
                                {option.name}
                              </label>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">
                                {option.badge}
                              </span>
                              {isAvailable && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                      </div>

                      {/* Selected Detail Strip */}
                      {selected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="bg-blue-50/70 dark:bg-blue-950/40 p-4 border-t border-blue-100 dark:border-blue-900/40 text-xs leading-relaxed text-blue-900 dark:text-blue-300"
                        >
                          <div className="flex items-start gap-2.5">
                            <Lock size={13} className="shrink-0 mt-0.5 text-brand-blue dark:text-blue-400" />
                            <div className="space-y-1">
                              <span>{option.detail}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>
          <aside className="lg:sticky lg:top-28 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 sm:p-6 shadow-xs text-dark dark:text-white">
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              Order summary{" "}
              <span className="text-sm font-normal text-gray-400 dark:text-gray-400">
                ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
              </span>
            </h2>
            <div className="my-5 divide-y divide-gray-100 dark:divide-white/10 max-h-72 overflow-auto">
              {items.map((item) => (
                <div key={item.product_id} className="flex gap-3 py-3">
                  <img
                    src={item.product.cover_image_url}
                    alt=""
                    className="w-11 h-16 rounded object-cover bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug text-dark dark:text-white">
                      {item.product.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-dark dark:text-white whitespace-nowrap">
                    {quote
                      ? displayPrice(
                          quote.items.find(
                            (line) => line.product_id === item.product_id,
                          )?.total_price || 0,
                        )
                      : "--"}
                  </span>
                </div>
              ))}
            </div>
            <label
              htmlFor="checkout-promo"
              className="text-xs font-medium text-gray-600 dark:text-gray-300"
            >
              Promotion code
            </label>
            <div className="flex gap-2 mt-2 mb-3">
              <input
                id="checkout-promo"
                className="w-full min-w-0 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] px-3 py-2 text-sm text-dark dark:text-white uppercase focus:outline-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                value={promoDraft}
                disabled={busy || Boolean(attempt)}
                onChange={(e) => setPromoDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setPromo(promoDraft.trim().toUpperCase());
                  }
                }}
              />
              <button
                type="button"
                disabled={busy || Boolean(attempt)}
                onClick={() => setPromo(promoDraft.trim().toUpperCase())}
                className="text-xs font-bold border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] hover:bg-gray-50 dark:hover:bg-white/10 text-dark dark:text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs shrink-0"
              >
                Apply
              </button>
            </div>
            {promo && (
              <button
                type="button"
                disabled={busy || Boolean(attempt)}
                onClick={() => {
                  setPromo("");
                  setPromoDraft("");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/40 rounded-lg px-2.5 py-1 mb-3 transition-colors cursor-pointer shadow-2xs"
              >
                <X size={12} />
                <span>Remove {promo}</span>
              </button>
            )}
            {quoteQuery.isError && (
              <div
                role="alert"
                className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg p-3 mb-4"
              >
                {quoteQuery.error.message}
                <button
                  type="button"
                  onClick={() => quoteQuery.refetch()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-800 dark:text-red-200 bg-white dark:bg-[#141A26] border border-red-300 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-950/80 rounded-lg px-3 py-1.5 mt-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={12} />
                  <span>Refresh basket total</span>
                </button>
              </div>
            )}
            <dl
              className="space-y-3 text-sm border-t border-gray-100 dark:border-white/10 pt-5"
              aria-live="polite"
              aria-busy={quoteQuery.isFetching}
            >
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Subtotal</dt>
                <dd className="font-medium text-dark dark:text-white">{quote ? displayPrice(quote.subtotal) : "--"}</dd>
              </div>
              {Boolean(quote?.discount_amount) && (
                <div className="flex justify-between text-brand-red dark:text-red-400 font-medium">
                  <dt>Discount</dt>
                  <dd>-{displayPrice(quote!.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Delivery</dt>
                <dd className="font-medium text-dark dark:text-white">
                  {quote
                    ? quote.shipping_amount === 0
                      ? "FREE"
                      : displayPrice(quote.shipping_amount)
                    : "--"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 dark:border-white/10 pt-4 text-xl font-bold text-dark dark:text-white">
                <dt>
                  Total{" "}
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                    {quote?.currency || currency}
                  </span>
                </dt>
                <dd>{quote ? displayPrice(quote.total_amount) : "--"}</dd>
              </div>
            </dl>
            {quote?.duties_notice && (
              <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300 mt-5 leading-relaxed">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={internationalAcknowledged}
                  disabled={busy || Boolean(attempt)}
                  onChange={(event) =>
                    setInternationalAcknowledged(event.target.checked)
                  }
                  required
                />
                <span>
                  {quote.duties_notice} I understand that these charges may be
                  payable on arrival.
                </span>
              </label>
            )}
            {quote && quote.currency !== "GBP" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Charged in {quote.currency}. Exchange rate dated{" "}
                {quote.exchange_rate_date}; your provider may apply separate
                account conversion fees.
              </p>
            )}
            <button
              type="submit"
              disabled={
                busy ||
                quoteQuery.isFetching ||
                quoteQuery.isError ||
                (quote ? !quote.methods[backendMethod] : false)
              }
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white border-2 border-brand-blue hover:border-brand-blue-hover px-5 py-4 mt-6 text-sm font-bold shadow-md transition-all active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>
                {busy
                  ? "Please wait..."
                  : quoteQuery.isFetching
                    ? "Updating total..."
                    : method === "paypal"
                      ? quote
                        ? `Continue with PayPal • ${displayPrice(quote.total_amount)}`
                        : "Continue with PayPal"
                      : method === "apple_pay"
                        ? quote
                          ? `Pay with Apple Pay • ${displayPrice(quote.total_amount)}`
                          : "Pay with Apple Pay"
                        : method === "google_pay"
                          ? quote
                            ? `Pay with Google Pay • ${displayPrice(quote.total_amount)}`
                            : "Pay with Google Pay"
                          : method === "amazon_pay"
                            ? quote
                              ? `Pay with Amazon Pay • ${displayPrice(quote.total_amount)}`
                              : "Pay with Amazon Pay"
                            : quote
                              ? `Pay with Card • ${displayPrice(quote.total_amount)}`
                              : "Continue to Card Payment"}
              </span>
              <ArrowRight size={17} className="shrink-0" />
            </button>
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 mt-3 text-center">
              You will review and complete payment securely {method === "paypal" ? "via PayPal" : "directly on this page"}.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-5 pt-5 border-t border-gray-100 dark:border-white/10">
              <Truck size={15} /> Delivery to {countryName(address.country)}
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};
