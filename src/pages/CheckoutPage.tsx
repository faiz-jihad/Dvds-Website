import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
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
  ShieldCheck,
  Truck,
  Wallet,
  X,
  Sun,
  Moon,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
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
import { OnSiteStripePayment, OnSiteStripePaymentHandle } from "../components/checkout/OnSiteStripePayment";
import { Seo } from "../components/common/Seo";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] px-3.5 py-2.5 sm:py-3 text-base sm:text-sm text-dark dark:text-white outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:bg-gray-50 dark:disabled:bg-white/5 transition-colors";

const isAppleDevice =
  typeof navigator !== "undefined" &&
  (/Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const PaypalIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path fill="#003087" d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.665h6.634c3.15 0 5.485 1.34 5.992 4.238.455 2.603-.96 4.846-3.456 5.768-.13.048-.2.185-.164.321.41 1.547.012 3.018-1.127 3.821-1.18.831-2.98.831-4.872.831H7.81a.789.789 0 0 0-.734.723z"/>
    <path fill="#0079C1" d="M9.13 18.064l1.107-7.016a.789.789 0 0 1 .778-.665h4.372c2.923 0 4.965 1.258 5.345 3.424.49 2.788-1.272 5.088-4.225 5.088h-2.825a.789.789 0 0 0-.777.665l-.777 4.93a.586.586 0 0 1-.578.497H8.56a.48.48 0 0 1-.473-.556l1.043-6.367z"/>
  </svg>
);

const CardWalletsBadge: React.FC = () => (
  <div className="flex items-center gap-1.5 shrink-0" aria-label="Supported cards: Visa, Mastercard, American Express">
    <span className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-[#1A1F71] text-white font-black italic text-[9px] tracking-wider shadow-2xs">
      VISA
    </span>
    <span className="inline-flex items-center justify-center h-5 px-1 rounded bg-[#252525] border border-white/10 shadow-2xs" title="Mastercard">
      <span className="flex items-center -space-x-1.5">
        <span className="w-3.5 h-3.5 rounded-full bg-[#EB001B] inline-block" />
        <span className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] inline-block opacity-90" />
      </span>
    </span>
    <span className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-[#006FCF] text-white font-black text-[9px] tracking-tight shadow-2xs">
      AMEX
    </span>
  </div>
);

const ApplePayBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 bg-black text-white px-2 py-0.5 rounded-md font-semibold text-[11px] tracking-tight shrink-0 shadow-2xs border border-white/10">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 fill-white" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.56.64-.97 1.7-0.85 2.73 1 .08 1.94-.48 2.56-1.23z" />
    </svg>
    <span>Pay</span>
  </span>
);

const GooglePayBadge: React.FC = () => (
  <span className="inline-flex items-center gap-0.5 bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-md font-bold text-[11px] tracking-tight shrink-0 shadow-2xs">
    <span className="text-[#4285F4]">G</span>
    <span className="text-[#EA4335]">P</span>
    <span className="text-[#FBBC05]">a</span>
    <span className="text-[#34A853]">y</span>
  </span>
);

const AmazonPayBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 bg-[#232F3E] text-white px-2 py-0.5 rounded-md font-bold text-[11px] tracking-tight shrink-0 shadow-2xs border border-white/10">
    <span className="text-white font-extrabold tracking-tight">amazon</span>
    <span className="text-[#FF9900] font-extrabold tracking-tight">pay</span>
  </span>
);

const methods = [
  {
    id: "card" as const,
    backendId: "card" as const,
    name: "Visa, Mastercard & Debit Card",
    description: "Pay securely with any Visa, Mastercard, American Express, or UK debit card.",
    detail: "Enter your card details directly below for instant on-site payment with 256-bit bank-grade encryption (no redirects).",
    tag: "Popular",
    icon: () => (
      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0 text-brand-blue dark:text-blue-400">
        <CreditCard size={20} />
      </div>
    ),
    badges: <CardWalletsBadge />,
  },
  {
    id: "apple_pay" as const,
    backendId: "card" as const,
    name: "Apple Pay",
    description: "Instant checkout with Touch ID or Face ID directly on-site.",
    detail: "Pay instantly using cards stored in your Apple Wallet with biometric authentication (no redirects).",
    tag: isAppleDevice ? "Available on this device" : "1-Tap",
    icon: () => (
      <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-2xs border border-white/10">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 fill-white" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.56.64-.97 1.7-0.85 2.73 1 .08 1.94-.48 2.56-1.23z" />
        </svg>
      </div>
    ),
    badges: <ApplePayBadge />,
  },
  {
    id: "google_pay" as const,
    backendId: "card" as const,
    name: "Google Pay",
    description: "Pay with cards saved to your Google Account.",
    detail: "Instant on-site authentication with Google Pay (no redirects).",
    tag: "Google Wallet",
    icon: () => (
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-2xs">
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
      </div>
    ),
    badges: <GooglePayBadge />,
  },
  {
    id: "amazon_pay" as const,
    backendId: "card" as const,
    name: "Amazon Pay",
    description: "Use your Amazon account payment methods and addresses securely.",
    detail: "Sign in to complete payment securely without re-entering card details (no redirects).",
    tag: "A-to-z Guarantee",
    icon: () => (
      <div className="w-10 h-10 rounded-xl bg-[#232F3E] text-white flex items-center justify-center shrink-0 shadow-2xs border border-white/10">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path fill="#FFFFFF" d="M13.9 14.5c-.3.4-.8.6-1.3.6-.8 0-1.4-.4-1.4-1.2 0-1.1 1-1.6 2.7-1.7v2.3zm2.5 3.2c-.2.2-.5.3-.8.2-.5-.3-1.1-.9-1.3-1.2-.8 1-1.8 1.4-3.1 1.4-1.8 0-3.3-1.1-3.3-3.1 0-1.8 1.3-3.1 3.2-3.3 1.4-.2 3.1-.3 3.1-1.3 0-.8-.7-1.3-1.9-1.3-1.1 0-1.7.4-1.9 1.4 0 .2-.2.4-.4.4l-1.9-.2c-.2 0-.3-.2-.3-.4.4-1.9 2-3 4.5-3 2.4 0 4.1 1.2 4.1 3.5v4.5c0 .9.4 1.3.7 1.8.2.2.2.5 0 .7l-1.6 1.1z"/>
          <path fill="#FF9900" d="M21.8 17.5c-2.4 2.1-5.8 3.2-9.4 3.2-4.5 0-8.6-1.8-11.4-4.8-.2-.2-.2-.5 0-.7.3-.3.6-.3.8-.1 2.6 2.7 6.3 4.3 10.5 4.3 3.3 0 6.5-1 8.7-2.9.3-.3.7-.1.8.2.2.3.2.6 0 .8z"/>
        </svg>
      </div>
    ),
    badges: <AmazonPayBadge />,
  },
  {
    id: "paypal" as const,
    backendId: "paypal" as const,
    name: "PayPal",
    description: "Pay with your PayPal balance, linked bank account, or PayPal credit.",
    detail: "Continue to PayPal to approve your payment securely, then return to your order confirmation.",
    tag: "Pay in 3 Available",
    icon: () => (
      <div className="w-10 h-10 rounded-xl bg-[#003087]/10 dark:bg-[#0079C1]/20 border border-[#003087]/20 dark:border-[#0079C1]/30 flex items-center justify-center shrink-0 shadow-2xs">
        <PaypalIcon className="w-5 h-5" />
      </div>
    ),
    badges: (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003087] dark:text-[#0079C1] bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-700/50">
        <PaypalIcon className="w-3.5 h-3.5" />
        <span>Checkout</span>
      </span>
    ),
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
  const currencies: string[] = configQuery.data?.currencies?.length
    ? configQuery.data.currencies
    : ["GBP", "EUR", "USD"];
  const [tier, setTier] = useState<"standard" | "express">(
    () => savedDraft?.tier || "standard",
  );
  const [method, setMethod] = useState<UiPaymentMethod>(
    () => {
      const saved = savedDraft?.method as UiPaymentMethod;
      if (
        saved === "card" ||
        saved === "apple_pay" ||
        saved === "google_pay" ||
        saved === "amazon_pay" ||
        saved === "paypal"
      ) {
        return saved;
      }
      return "card";
    },
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
  const onSitePaymentRef = useRef<OnSiteStripePaymentHandle>(null);
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
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

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
    placeholderData: (previousData) => previousData,
    enabled: items.length > 0,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const quote = quoteQuery.data;
  const settingsQuery = useQuery({
    queryKey: ["store", "settings"],
    queryFn: publicApi.getStoreSettings,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const storeSettings = settingsQuery.data;
  const displayPrice = (amount: number) =>
    formatMoney(amount, quote?.currency || currency);

  useEffect(() => {
    if (storeSettings) {
      if (storeSettings.payment_card_enabled === false && method !== "paypal") {
        setMethod("paypal");
      } else if (storeSettings.payment_paypal_enabled === false && method === "paypal") {
        setMethod("card");
      }
    }
  }, [storeSettings, method]);

  useEffect(() => {
    if (quote) {
      const isCurrentAvailable = Boolean(quote.methods[backendMethod]);
      if (!isCurrentAvailable) {
        if (quote.methods.card && storeSettings?.payment_card_enabled !== false) setMethod("card");
        else if (quote.methods.paypal && storeSettings?.payment_paypal_enabled !== false) setMethod("paypal");
      }
    }
  }, [quote, backendMethod, storeSettings]);

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
    if (busy) return;

    // 1. Verify basket has items
    if (!basket.length) {
      setError("Your basket is empty. Please add items before checking out.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 2. Validate email
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      const emailEl = document.getElementById("checkout-email");
      if (emailEl) {
        emailEl.focus();
        emailEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // 3. Validate address
    let validatedAddress;
    try {
      validatedAddress = normalizeAddress({ ...address });
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Please check your delivery address.";
      setError(msg);
      if (msg.toLowerCase().includes("name")) {
        const el = document.getElementById("checkout-full-name");
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (msg.toLowerCase().includes("address")) {
        const el = document.getElementById("checkout-address-1");
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (msg.toLowerCase().includes("city")) {
        const el = document.getElementById("checkout-city");
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (msg.toLowerCase().includes("postcode") || msg.toLowerCase().includes("postal") || msg.toLowerCase().includes("zip")) {
        const el = document.getElementById("checkout-postcode");
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 150, behavior: "smooth" });
      }
      return;
    }

    if (international && !internationalAcknowledged) {
      setError("Please acknowledge the international delivery notice to continue.");
      return;
    }

    // 4. Ensure quote is available (or refresh it if missing)
    let currentQuote = quote;
    if (!currentQuote || quoteQuery.isFetching) {
      setBusy(true);
      setError("");
      try {
        const refreshed = await quoteQuery.refetch();
        currentQuote = refreshed.data || undefined;
      } catch {
        // continue with fallback
      }
      setBusy(false);
    }

    const totalToPay = currentQuote?.total_amount || 0;
    const currentCurrency = currentQuote?.currency || currency;

    // 5. IF PAYPAL: proceed with PayPal flow
    if (method === "paypal") {
      setBusy(true);
      setError("");

      if (attempt?.orderId) {
        try {
          await checkoutApi.cancel(attempt.orderId);
        } catch {}
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
          expectedTotal: totalToPay,
          currency: currentCurrency,
          internationalAcknowledged,
        });
        setAttempt(currentCheckoutAttempt());
        if (result.completed) {
          clearCheckoutDraft();
          navigate(`/order-success/${result.orderId}`);
        } else if (result.url) {
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

    // 6. IF CARD: process on-site via Stripe Elements
    if (method === "card" && onSitePaymentRef.current) {
      onSitePaymentRef.current.submitPayment();
      return;
    }

    // 7. STRIPE PAYMENT (Apple Pay, Google Pay, Amazon Pay, or Card fallback):
    // Directly launches Stripe Hosted Checkout Session where buyer can complete payment!
    setBusy(true);
    setError("");

    if (attempt?.orderId) {
      try {
        await checkoutApi.cancel(attempt.orderId);
      } catch {}
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
        expectedTotal: totalToPay,
        currency: currentCurrency,
        internationalAcknowledged,
      });
      setAttempt(currentCheckoutAttempt());
      if (result.completed) {
        clearCheckoutDraft();
        navigate(`/order-success/${result.orderId}`);
      } else if (result.url) {
        window.location.assign(result.url);
      } else {
        throw new Error("Unable to open secure checkout. Please retry.");
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

  if (!items.length && !attempt && !busy)
    return <Navigate to="/cart" replace />;

  return (
    <div className="bg-gray-50/70 dark:bg-[#07090E] min-h-screen text-dark dark:text-white transition-colors">
      <Seo
        title="Secure Checkout — DVDs Zone UK"
        description="Complete your order securely with SSL 256-bit encryption. Fast and reliable delivery across the United Kingdom."
        canonicalPath="/checkout"
        noIndex
      />
      {/* Dedicated Clean Checkout Header Bar with Logo & Theme Switcher */}
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#07090E]/95 backdrop-blur-md sticky top-0 z-30 transition-colors shadow-2xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-[72px] flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 group py-1 shrink-0" title="DVDs Zone - Return to shop">
            <img
              src={isDark ? "/brand/logo-dark-theme.png" : "/brand/logo-transparent.png"}
              alt="DVDs Zone"
              className="h-7 sm:h-10 w-auto max-w-[120px] sm:max-w-[170px] object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-2xs shrink-0"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Back to basket</span>
              <span className="sm:hidden">Basket</span>
            </Link>
          </div>
        </div>
      </header>

      <div
        className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 lg:py-10"
        style={{
          paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {(searchParams.get("cancelled") === "1" || searchParams.get("cancelled") === "true") && (
          <div className="mb-5 p-3.5 sm:p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                <strong>Checkout cancelled:</strong> No payment was taken. Your basket items are saved.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("cancelled");
                window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
              }}
              className="text-xs font-semibold underline text-amber-700 dark:text-amber-300 hover:text-amber-900 cursor-pointer self-end sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-[11px] sm:text-xs uppercase tracking-widest text-brand-blue font-semibold">
              Almost yours
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold mt-0.5 sm:mt-1 text-dark dark:text-white">
              Checkout
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
              Your details, delivery, and secure payment.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs text-gray-600 dark:text-gray-300 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] px-3.5 py-1.5 sm:px-4 sm:py-2 shadow-2xs">
            <Lock size={13} className="text-brand-blue shrink-0" />
            <span className="font-medium">256-bit SSL encrypted</span>
          </span>
        </div>

        {/* Mobile Collapsible Order Summary Accordion (Fast inspection without scrolling) */}
        <div className="lg:hidden mb-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] overflow-hidden shadow-xs transition-colors">
          <button
            type="button"
            onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between text-left cursor-pointer bg-gray-50/80 dark:bg-white/[0.03] hover:bg-gray-100/80 dark:hover:bg-white/[0.06] transition-colors"
            aria-expanded={isMobileSummaryOpen}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-blue dark:text-blue-400">
              <ShoppingBag size={15} />
              <span>{isMobileSummaryOpen ? "Hide order summary" : "Show order summary"}</span>
              <ChevronDown
                size={14}
                className={cn("transition-transform duration-200", isMobileSummaryOpen && "rotate-180")}
              />
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                {quoteQuery.isFetching && (
                  <RefreshCw size={11} className="animate-spin text-brand-blue shrink-0" />
                )}
                <span className="text-sm font-bold text-dark dark:text-white">
                  {quote ? displayPrice(quote.total_amount) : "--"}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                {items.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
          </button>

          {isMobileSummaryOpen && (
            <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-white/10 space-y-3.5">
              <div className="divide-y divide-gray-100 dark:divide-white/10 max-h-56 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-3 py-2.5">
                    <div className="relative shrink-0">
                      <img
                        src={item.product.cover_image_url}
                        alt=""
                        className="w-10 h-14 rounded object-cover bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                      />
                      <span className="absolute -top-1.5 -right-1.5 bg-brand-blue text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-dark dark:text-white truncate">
                        {item.product.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-dark dark:text-white shrink-0">
                      {quote
                        ? displayPrice(
                            quote.items.find((line) => line.product_id === item.product_id)?.total_price || 0
                          )
                        : "--"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo voucher entry in mobile summary */}
              <div>
                <label htmlFor="mobile-checkout-promo" className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">
                  Voucher code
                </label>
                <div className="flex gap-2">
                  <input
                    id="mobile-checkout-promo"
                    className="w-full min-w-0 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] px-3 py-2 text-base sm:text-xs text-dark dark:text-white uppercase focus:outline-blue-500 placeholder:text-gray-400"
                    value={promoDraft}
                    placeholder="ENTER CODE"
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
                    className="text-xs font-bold border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] hover:bg-gray-50 dark:hover:bg-white/10 text-dark dark:text-white rounded-xl px-3.5 py-2 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
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
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg px-2.5 py-1 mt-2 cursor-pointer"
                  >
                    <X size={12} />
                    <span>Remove {promo}</span>
                  </button>
                )}
              </div>

              {quoteQuery.isError && (
                <div
                  role="alert"
                  className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl p-2.5"
                >
                  {quoteQuery.error.message}
                </div>
              )}

              {/* Price Breakdown */}
              <dl
                className={cn(
                  "space-y-1.5 text-xs border-t border-gray-100 dark:border-white/10 pt-2.5 transition-opacity",
                  quoteQuery.isFetching && "opacity-70"
                )}
              >
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Subtotal</dt>
                  <dd className="font-semibold text-dark dark:text-white">{quote ? displayPrice(quote.subtotal) : "--"}</dd>
                </div>
                {Boolean(quote?.discount_amount) && (
                  <div className="flex justify-between text-brand-red dark:text-red-400 font-semibold">
                    <dt>Discount</dt>
                    <dd>-{displayPrice(quote!.discount_amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Delivery</dt>
                  <dd className="font-semibold text-dark dark:text-white">
                    {quote
                      ? quote.shipping_amount === 0
                        ? "FREE"
                        : displayPrice(quote.shipping_amount)
                      : "--"}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-white/10 pt-2 text-sm font-bold text-dark dark:text-white">
                  <dt>Total</dt>
                  <dd className="flex items-center gap-1.5">
                    {quoteQuery.isFetching && (
                      <RefreshCw size={11} className="animate-spin text-brand-blue" />
                    )}
                    <span>{quote ? displayPrice(quote.total_amount) : "--"}</span>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {attempt && (
          <section
            className="rounded-2xl border border-blue-200/90 dark:border-blue-800/40 bg-blue-50/70 dark:bg-blue-950/30 p-4 sm:p-6 mb-6 shadow-xs"
            aria-label="Existing checkout"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800/50 text-brand-blue dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Clock size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm sm:text-base text-dark dark:text-white">
                  You have an order awaiting payment
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  Continue your existing order, or cancel it to edit your details.
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3.5">
                  {attempt.url && (
                    <a
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-hover text-white border border-brand-blue shadow-xs transition-all cursor-pointer w-full sm:w-auto"
                      href={attempt.url}
                    >
                      <span>Resume Payment</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {attempt.orderId && (
                    <Link
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#141A26] text-dark dark:text-white border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 shadow-2xs transition-all cursor-pointer w-full sm:w-auto"
                      to={`/order-success/${attempt.orderId}`}
                    >
                      <FileText size={12} className="text-gray-500 dark:text-gray-400" />
                      <span>View Status</span>
                    </Link>
                  )}
                  {!attempt.url && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={retryAttempt}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-hover text-white border border-brand-blue shadow-xs transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                    >
                      <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
                      <span>Retry Saved Checkout</span>
                    </button>
                  )}
                  {attempt.orderId && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={cancelAttempt}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#141A26] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/30 shadow-2xs transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                    >
                      <X size={13} />
                      <span>{busy ? "Please wait..." : "Cancel & Edit"}</span>
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
            className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 p-3.5 sm:p-4 mb-6 text-xs sm:text-sm"
          >
            {error}
          </div>
        )}
        <form
          id="checkout-form"
          onSubmit={submit}
          className="grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8 items-start"
        >
          <div className="rounded-2xl bg-white dark:bg-[#0E131F] border border-gray-200 dark:border-white/10 p-3.5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 shadow-xs">

            <fieldset id="checkout-step-1" disabled={busy}>
              <legend className="text-base sm:text-lg font-semibold mb-4 text-dark dark:text-white">
                <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-blue-50 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-300 rounded-full text-xs mr-2.5 sm:mr-3 font-bold">
                  1
                </span>
                Contact &amp; delivery details
              </legend>

              {customer && savedAddresses.length > 0 && (
                <div className="mb-6 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-3.5 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-3.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <MapPin size={14} className="text-brand-blue shrink-0" />
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
                  <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
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
                          className={`text-left p-3 sm:p-3.5 rounded-xl border transition-all text-xs relative ${
                            isSelected
                              ? "border-brand-blue bg-white dark:bg-[#141A26] ring-2 ring-blue-200 dark:ring-blue-900/40 shadow-sm"
                              : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26]/60 hover:border-blue-300 dark:hover:border-blue-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-1.5 min-w-0 flex-1">
                              {isSelected && (
                                <CheckCircle2
                                  size={15}
                                  className="text-brand-blue shrink-0"
                                />
                              )}
                              <span className="truncate">{addr.full_name}</span>
                            </span>
                            {addr.is_default && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold px-1.5 py-0.5 rounded shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mt-1.5 line-clamp-2 break-words">
                            {addr.address_line_1}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 line-clamp-1 break-words">
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
                      className={`text-left p-3 sm:p-3.5 rounded-xl border-2 border-dashed transition-all text-xs flex flex-col items-center justify-center min-h-[85px] sm:min-h-[95px] ${
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

              <div className="mb-6 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/30 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-brand-blue ring-4 ring-blue-100 dark:ring-blue-900/40 shrink-0" />
                  <span className="min-w-0 truncate">
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
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-blue bg-white dark:bg-[#141A26] border border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shadow-2xs shrink-0"
                >
                  Switch account
                </Link>
              </div>

              {customer && selectedAddressId !== "custom" && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl px-3 sm:px-3.5 py-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <span className="flex-1 min-w-[200px]">
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
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-blue bg-white dark:bg-[#141A26] border border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shrink-0 shadow-2xs cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
                  Email address
                  <input
                    id="checkout-email"
                    className={fieldClass}
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pay in
                  <select
                    className={fieldClass}
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                  >
                    {currencies.map((code: string) => (
                      <option key={code} value={code}>
                        {CURRENCY_DISPLAY[code] || code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
                  Full name
                  <input
                    id="checkout-full-name"
                    className={fieldClass}
                    autoComplete="shipping name"
                    required
                    maxLength={200}
                    value={address.full_name}
                    onChange={(e) => updateAddress("full_name", e.target.value)}
                  />
                </label>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
                  Address line 1
                  <input
                    id="checkout-address-1"
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
                  Address line 2{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Town / city
                  <input
                    id="checkout-city"
                    className={fieldClass}
                    autoComplete="shipping address-level2"
                    required
                    maxLength={200}
                    value={address.city}
                    onChange={(e) => updateAddress("city", e.target.value)}
                  />
                </label>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  {rules.postalLabel}
                  {!rules.postalRequired && (
                    <span className="text-gray-400 font-normal"> (optional)</span>
                  )}
                  <input
                    id="checkout-postcode"
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                  <input
                    className={fieldClass}
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={address.phone || ""}
                    onChange={(e) => updateAddress("phone", e.target.value)}
                  />
                </label>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  {rules.stateLabel}
                  {!rules.stateRequired && (
                    <span className="text-gray-400 font-normal"> (optional)</span>
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
              className="border-t border-gray-100 dark:border-white/10 pt-6 sm:pt-7"
            >
              <legend className="text-base sm:text-lg font-semibold float-left w-full mb-4 sm:mb-5 text-dark dark:text-white">
                <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-blue-50 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-300 rounded-full text-xs mr-2.5 sm:mr-3 font-bold">
                  2
                </span>
                Delivery method
              </legend>
              <div className="clear-both space-y-2.5 sm:space-y-3">
                {(["standard", "express"] as const)
                  .filter((option) => !quote || Boolean(quote.delivery[option]))
                  .map((option) => (
                    <label
                      key={option}
                      className={`flex items-start sm:items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl border cursor-pointer focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-900/40 transition-colors ${
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
                        className="accent-blue-600 w-4 h-4 mt-0.5 sm:mt-0 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-dark dark:text-white">
                            {quote?.delivery[option]?.name ||
                              (option === "standard"
                                ? storeSettings?.standard_shipping_name || "Standard Delivery"
                                : storeSettings?.express_shipping_name || "Express Priority Delivery")}
                          </span>
                          <span
                            className={`text-xs sm:text-sm font-semibold shrink-0 ${
                              (quote
                                ? quote.delivery[option]?.amount === 0
                                : (option === "standard" ? Number(storeSettings?.standard_shipping_fee ?? 0) === 0 : Number(storeSettings?.express_shipping_fee ?? 0) === 0))
                                ? "text-brand-blue dark:text-blue-400 font-bold"
                                : "text-dark dark:text-white"
                            }`}
                          >
                            {quote
                              ? quote.delivery[option]!.amount === 0
                                ? "FREE"
                                : displayPrice(quote.delivery[option]!.amount)
                              : storeSettings
                                ? (option === "standard" ? Number(storeSettings.standard_shipping_fee ?? 0) : Number(storeSettings.express_shipping_fee ?? 0)) === 0
                                  ? "FREE"
                                  : displayPrice(option === "standard" ? Number(storeSettings.standard_shipping_fee ?? 0) : Number(storeSettings.express_shipping_fee ?? 0))
                                : "--"}
                          </span>
                        </div>
                        <span className="block text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {quote?.delivery[option]?.eta ||
                            (option === "standard"
                              ? storeSettings?.standard_shipping_eta || ""
                              : storeSettings?.express_shipping_eta || "")}
                        </span>
                      </div>
                    </label>
                  ))}

                {quote?.duties_notice && (
                  <div className="mt-3.5 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer leading-relaxed">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-blue-600 w-4 h-4 rounded shrink-0"
                        checked={internationalAcknowledged}
                        disabled={busy || Boolean(attempt)}
                        onChange={(event) =>
                          setInternationalAcknowledged(event.target.checked)
                        }
                      />
                      <span>
                        <strong>Customs Notice:</strong> {quote.duties_notice} I understand that these charges may be payable on arrival.
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </fieldset>
            <fieldset
              disabled={busy}
              className="border-t border-gray-100 dark:border-white/10 pt-6 sm:pt-7"
            >
              <legend className="text-base sm:text-lg font-semibold float-left w-full mb-1 text-dark dark:text-white">
                <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-blue-50 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-300 rounded-full text-xs mr-2.5 sm:mr-3 font-bold">
                  3
                </span>
                Payment method
              </legend>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3.5 sm:mb-4 clear-both">
                Choose how you would like to pay.
              </p>

              {/* Express Checkout Element for 1-click wallets (only mounted if enabled by store and supported by device) */}
              {(storeSettings?.payment_card_enabled !== false && quote?.methods?.card !== false) && (
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
                      <div className="relative inline-flex items-center gap-2 px-3 sm:px-4 bg-white dark:bg-[#0E131F] text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        <span>OR CHOOSE PAYMENT METHOD</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment method card choices */}
              <div
                role="radiogroup"
                aria-label="Payment method"
                className="space-y-3 clear-both mt-1"
              >
                {methods
                  .filter((option) => {
                    if (storeSettings && storeSettings.payment_card_enabled === false && option.backendId === 'card') {
                      return false;
                    }
                    if (storeSettings && storeSettings.payment_paypal_enabled === false && option.backendId === 'paypal') {
                      return false;
                    }
                    return true;
                  })
                  .map((option) => {
                  const isAvailable = Boolean(quote ? quote.methods[option.backendId] : true);
                  const selected = method === option.id;
                  const Icon = option.icon;

                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "group relative rounded-2xl border transition-all duration-200 overflow-hidden text-left",
                        selected
                          ? "border-blue-600 dark:border-blue-500 bg-white dark:bg-[#131A29] shadow-sm ring-1 ring-blue-600/20 dark:ring-blue-500/25"
                          : isAvailable
                            ? "border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:border-gray-300 dark:hover:border-white/20 hover:shadow-2xs"
                            : "border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 opacity-50 cursor-not-allowed"
                      )}
                    >
                      {/* Active Left Focus Bar */}
                      <div
                        className={cn(
                          "absolute left-0 top-0 bottom-0 w-1 transition-all duration-200",
                          selected ? "bg-blue-600 dark:bg-blue-500" : "bg-transparent"
                        )}
                      />

                      {/* Clickable Header Row */}
                      <div
                        onClick={() => {
                          if (isAvailable && !busy) {
                            setMethod(option.id);
                          }
                        }}
                        className="p-3.5 sm:p-4 pl-4 sm:pl-4.5 flex items-center gap-3 sm:gap-3.5 cursor-pointer select-none"
                      >
                        {/* Custom Tactile Radio Button */}
                        <div className="shrink-0 flex items-center justify-center">
                          <input
                            id={`payment-opt-${option.id}`}
                            type="radio"
                            name="payment"
                            value={option.id}
                            checked={selected}
                            disabled={!isAvailable || busy}
                            onChange={() => setMethod(option.id)}
                            className="sr-only"
                          />
                          <div
                            aria-hidden="true"
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                              selected
                                ? "border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 shadow-xs"
                                : "border-gray-300 dark:border-white/20 bg-white dark:bg-transparent group-hover:border-gray-400 dark:group-hover:border-white/40"
                            )}
                          >
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full bg-white transition-transform duration-200 ease-out",
                                selected ? "scale-100" : "scale-0"
                              )}
                            />
                          </div>
                        </div>

                        {/* Brand Squircle Icon */}
                        <Icon />

                        {/* Title, Badges & Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <label
                                htmlFor={`payment-opt-${option.id}`}
                                className="text-xs sm:text-sm font-bold text-dark dark:text-white cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                              >
                                {option.name}
                              </label>
                              {option.tag && (
                                <span className="text-[10px] font-semibold tracking-tight text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 px-1.5 py-0.5 rounded-md">
                                  {option.tag}
                                </span>
                              )}
                            </div>

                            {/* Right Brand Badges */}
                            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                              {isAvailable ? option.badges : (
                                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                  Unavailable
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {option.description}
                          </p>

                          {/* Mobile Badges Strip (visible on small screens) */}
                          <div className="flex sm:hidden items-center gap-1.5 mt-2 pt-1 border-t border-gray-100 dark:border-white/5">
                            {isAvailable ? option.badges : null}
                          </div>
                        </div>
                      </div>

                      {/* Selected Detail Drawer */}
                      {selected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="border-t border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] p-3.5 sm:p-4 text-xs leading-relaxed"
                        >
                          {option.id === "card" && (
                            <OnSiteStripePayment
                              ref={onSitePaymentRef}
                              method="card"
                              items={basket}
                              totalAmount={quote?.total_amount || 0}
                              currency={quote?.currency || currency}
                              email={email}
                              address={address}
                              tier={tier}
                              promo={promo}
                              internationalAcknowledged={internationalAcknowledged}
                              stripePublishableKey={configQuery.data?.stripePublishableKey}
                              isDark={isDark}
                              disabled={busy || !quote || quoteQuery.isFetching}
                              showPayButton={false}
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
                              onSwitchMethod={(target) => setMethod(target)}
                            />
                          )}

                          {option.id === "apple_pay" && (
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] p-3.5 sm:p-4 flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                <ApplePayBadge />
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="font-semibold text-dark dark:text-white text-xs">
                                  Instant biometric checkout with Apple Pay
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                  Clicking <strong>Pay with Apple Pay</strong> below will open secure checkout where you can authorize payment instantly using Touch ID, Face ID, or your Apple device passcode.
                                </p>
                              </div>
                            </div>
                          )}

                          {option.id === "google_pay" && (
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] p-3.5 sm:p-4 flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-2xs">
                                <GooglePayBadge />
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="font-semibold text-dark dark:text-white text-xs">
                                  Instant checkout with Google Pay
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                  Clicking <strong>Pay with Google Pay</strong> below will open secure checkout where you can complete payment using cards saved in your Google Account without re-entering numbers.
                                </p>
                              </div>
                            </div>
                          )}

                          {option.id === "amazon_pay" && (
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] p-3.5 sm:p-4 flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#232F3E] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <AmazonPayBadge />
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="font-semibold text-dark dark:text-white text-xs">
                                  Fast checkout with Amazon Pay &amp; Digital Cards
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                  Clicking <strong>Pay with Amazon Pay</strong> below will process your order with full Amazon A-to-z buyer protection.
                                </p>
                              </div>
                            </div>
                          )}

                          {option.id === "paypal" && (
                            <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-3 sm:p-3.5 flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#003087]/10 dark:bg-[#0079C1]/20 flex items-center justify-center shrink-0 mt-0.5">
                                <PaypalIcon className="w-4 h-4" />
                              </div>
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-semibold text-dark dark:text-white text-xs">
                                    PayPal Secure Authorization
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/40 px-1.5 py-0.5 rounded">
                                    Buyer Protection Included
                                  </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                                  Pay using your PayPal balance, linked bank account, or choose <strong>PayPal Pay in 3</strong> to spread the cost into 3 interest-free monthly payments. You will return here automatically once authorized.
                                </p>
                                <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                                  <span className="flex items-center gap-1">
                                    <Lock size={11} className="text-emerald-600 dark:text-emerald-400" /> 256-bit encrypted session
                                  </span>
                                  <span>•</span>
                                  <span>Stock reserved for 30 minutes</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Guaranteed Security & Compliance Trust Bar */}
              <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium text-dark dark:text-gray-200">256-Bit SSL Encrypted Checkout</span>
                  <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Zero card details stored</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-gray-400" /> PCI-DSS Level 1
                  </span>
                  <span>•</span>
                  <span>Stripe &amp; PayPal Verified</span>
                </div>
              </div>
            </fieldset>
          </div>
          <aside className="hidden lg:block lg:sticky lg:top-28 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-4 sm:p-6 shadow-xs text-dark dark:text-white">
            <h2 className="text-base sm:text-lg font-semibold text-dark dark:text-white">
              Order summary{" "}
              <span className="text-xs sm:text-sm font-normal text-gray-400 dark:text-gray-400">
                ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
              </span>
            </h2>
            <div className="my-4 sm:my-5 divide-y divide-gray-100 dark:divide-white/10 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.product_id} className="flex gap-2.5 sm:gap-3 py-2.5 sm:py-3 items-center">
                  <img
                    src={item.product.cover_image_url}
                    alt=""
                    className="w-10 sm:w-11 h-14 sm:h-16 rounded object-cover bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium leading-snug text-dark dark:text-white line-clamp-2">
                      {item.product.title}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                      Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-dark dark:text-white whitespace-nowrap shrink-0">
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
              className="text-xs font-medium text-gray-600 dark:text-gray-300 block"
            >
              Promotion code
            </label>
            <div className="flex gap-2 mt-1.5 mb-3">
              <input
                id="checkout-promo"
                className="w-full min-w-0 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] px-3.5 py-2.5 text-base sm:text-xs text-dark dark:text-white uppercase focus:outline-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                value={promoDraft}
                disabled={busy || Boolean(attempt)}
                placeholder="ENTER CODE"
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
                className="text-xs font-bold border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] hover:bg-gray-50 dark:hover:bg-white/10 text-dark dark:text-white rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs shrink-0"
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
                className="text-xs sm:text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl p-3 mb-4"
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
              className={cn(
                "space-y-2.5 sm:space-y-3 text-xs sm:text-sm border-t border-gray-100 dark:border-white/10 pt-4 sm:pt-5 transition-opacity",
                quoteQuery.isFetching && "opacity-70"
              )}
              aria-live="polite"
              aria-busy={quoteQuery.isFetching}
            >
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Subtotal</dt>
                <dd className="font-semibold text-dark dark:text-white">{quote ? displayPrice(quote.subtotal) : "--"}</dd>
              </div>
              {Boolean(quote?.discount_amount) && (
                <div className="flex justify-between text-brand-red dark:text-red-400 font-semibold">
                  <dt>Discount</dt>
                  <dd>-{displayPrice(quote!.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Delivery</dt>
                <dd className="font-semibold text-dark dark:text-white">
                  {quote
                    ? quote.shipping_amount === 0
                      ? "FREE"
                      : displayPrice(quote.shipping_amount)
                    : "--"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 dark:border-white/10 pt-3 sm:pt-4 text-lg sm:text-xl font-bold text-dark dark:text-white">
                <dt className="flex items-center gap-1.5">
                  Total{" "}
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                    ({quote?.currency || currency})
                  </span>
                </dt>
                <dd className="flex items-center gap-1.5">
                  {quoteQuery.isFetching && (
                    <RefreshCw size={13} className="animate-spin text-brand-blue shrink-0" />
                  )}
                  <span>{quote ? displayPrice(quote.total_amount) : "--"}</span>
                </dd>
              </div>
            </dl>
            {quote?.duties_notice && (
              <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300 mt-4 sm:mt-5 leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-blue-600 w-4 h-4 rounded shrink-0"
                  checked={internationalAcknowledged}
                  disabled={busy || Boolean(attempt)}
                  onChange={(event) =>
                    setInternationalAcknowledged(event.target.checked)
                  }
                />
                <span>
                  {quote.duties_notice} I understand that these charges may be
                  payable on arrival.
                </span>
              </label>
            )}
            {quote && quote.currency !== "GBP" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 sm:mt-4">
                Charged in {quote.currency}. Exchange rate dated{" "}
                {quote.exchange_rate_date}; your provider may apply separate
                account conversion fees.
              </p>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 p-3 mt-4 text-xs flex items-start gap-2"
              >
                <AlertCircle size={15} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span className="flex-1 leading-snug">{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white border-2 border-brand-blue hover:border-brand-blue-hover px-4 sm:px-5 py-3.5 sm:py-4 mt-5 sm:mt-6 text-sm font-bold shadow-md transition-all active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>
                {busy
                  ? "Please wait..."
                  : quoteQuery.isFetching
                    ? "Updating total..."
                    : method === "card"
                      ? `Pay Now • ${quote ? displayPrice(quote.total_amount) : ""}`
                      : method === "apple_pay"
                        ? `Pay with Apple Pay • ${quote ? displayPrice(quote.total_amount) : ""}`
                        : method === "google_pay"
                          ? `Pay with Google Pay • ${quote ? displayPrice(quote.total_amount) : ""}`
                          : method === "amazon_pay"
                            ? `Pay with Amazon Pay • ${quote ? displayPrice(quote.total_amount) : ""}`
                            : method === "paypal"
                              ? "Continue with PayPal"
                              : "Continue to secure payment"}
              </span>
              <ArrowRight size={17} className="shrink-0" />
            </button>
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 mt-2.5 sm:mt-3 text-center">
              You will complete payment securely {method === "paypal" ? "via PayPal" : "via Stripe (256-bit SSL encrypted directly on-site)"}.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-gray-100 dark:border-white/10">
              <Truck size={15} /> Delivery to {countryName(address.country)}
            </div>
          </aside>
        </form>
      </div>

      {/* Sticky Mobile Checkout Action Bar (< lg screen only) */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0E131F]/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 px-3.5 sm:px-4 pt-2.5 sm:pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] transition-colors"
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {quoteQuery.isError && (
          <div className="max-w-6xl mx-auto mb-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 text-[11px] text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
            <span className="truncate flex-1">{quoteQuery.error.message}</span>
            <button
              type="button"
              onClick={() => quoteQuery.refetch()}
              className="font-bold underline text-red-800 dark:text-red-200 shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
        {error && (
          <div className="max-w-6xl mx-auto mb-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 text-[11px] text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
            <span className="truncate flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold underline text-red-800 dark:text-red-200 shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500 block leading-none mb-1">
              Total to pay
            </span>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-base sm:text-lg font-black text-dark dark:text-white truncate block leading-none">
                {quote ? displayPrice(quote.total_amount) : "--"}
              </span>
              {quoteQuery.isFetching && (
                <span className="text-[10px] font-semibold text-brand-blue animate-pulse shrink-0">
                  Updating...
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate mt-0.5">
              {quote?.shipping_amount === 0 ? "Free UK Delivery" : "Tracked Delivery"}
            </span>
          </div>

          <button
            type="submit"
            form="checkout-form"
            disabled={busy}
            className="flex-1 max-w-[190px] sm:max-w-[240px] flex items-center justify-center gap-1.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <span className="truncate">
              {busy
                ? "Please wait..."
                : quoteQuery.isFetching
                  ? "Updating..."
                  : method === "apple_pay"
                    ? "Pay with Apple Pay"
                    : method === "google_pay"
                      ? "Pay with Google Pay"
                      : method === "amazon_pay"
                        ? "Pay with Amazon Pay"
                        : method === "paypal"
                          ? "Pay with PayPal"
                          : "Pay Now"}
            </span>
            <ArrowRight size={15} className="shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
