import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
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
  User,
  Wallet,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useCartStore } from "../stores/useCartStore";
import { useThemeStore } from "../stores/useThemeStore";
import { checkoutApi, currentCheckoutAttempt } from "../lib/checkoutApi";
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
import { Address, PaymentMethodType } from "../types";
import { useCustomerAuth } from "../auth/CustomerAuth";
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from "../lib/checkoutDraft";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] px-3.5 py-3 text-sm text-dark dark:text-white outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:bg-gray-50 dark:disabled:bg-white/5 transition-colors";
const methods = [
  {
    id: "card" as const,
    name: "Visa debit or credit card",
    icon: CreditCard,
    description:
      "Pay securely with a Visa debit or credit card. Apple Pay and Google Pay are also offered on supported devices.",
    detail:
      "Your card details are entered securely on Stripe. Apple Pay and Google Pay are available where supported — you will return here after payment.",
    badge: "Powered by Stripe",
  },
  {
    id: "paypal" as const,
    name: "PayPal",
    icon: Wallet,
    description:
      "Pay with your PayPal account or the options available at PayPal.",
    detail:
      "Continue to PayPal to approve your payment, then return to your order.",
    badge: "PayPal checkout",
  },
  {
    id: "bank_transfer" as const,
    name: "Company bank transfer",
    icon: Building2,
    description: "Transfer directly to our company bank account.",
    detail:
      "Place your order to receive bank details and a unique reference. Shipping begins after payment is confirmed.",
    badge: "Manual confirmation",
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
  const [method, setMethod] = useState<PaymentMethodType>(
    () => savedDraft?.method || "card",
  );
  const [promo, setPromo] = useState<string>(
    () => savedDraft?.promo ?? (appliedPromo || ""),
  );
  const [promoDraft, setPromoDraft] = useState<string>(
    () => savedDraft?.promoDraft ?? (appliedPromo || ""),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(currentCheckoutAttempt);
  const [applePaySupported, setApplePaySupported] = useState(false);
  const [googlePaySupported, setGooglePaySupported] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    () => savedDraft?.selectedAddressId || "initial",
  );
  const [saveNewAddress, setSaveNewAddress] = useState<boolean>(
    () => savedDraft?.saveNewAddress ?? true,
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
    enabled: items.length > 0 && !attempt,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const quote = quoteQuery.data;
  const displayPrice = (amount: number) =>
    formatMoney(amount, quote?.currency || currency);

  useEffect(() => {
    if (quote && !quote.methods[method]) {
      const available = methods.find((option) => quote.methods[option.id]);
      if (available) setMethod(available.id);
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
  useEffect(() => {
    // Apple Pay: available on Safari / iOS / macOS with a card enrolled in Wallet.
    const applePay = (
      window as Window & {
        ApplePaySession?: { canMakePayments: () => boolean };
      }
    ).ApplePaySession;
    setApplePaySupported(Boolean(applePay?.canMakePayments()));

    // Google Pay detection is only a capability probe. Some browsers reject the
    // Google payment method identifier when it is not allowed by the page CSP or
    // payment method manifest, so we must ignore those failures instead of
    // blowing up the checkout experience.
    if (
      typeof window === "undefined" ||
      !window.PaymentRequest ||
      !window.isSecureContext ||
      location.protocol !== "https:"
    ) {
      setGooglePaySupported(false);
      return;
    }

    try {
      const request = new window.PaymentRequest(
        [
          {
            supportedMethods: "https://google.com/pay",
            data: {
              apiVersion: 2,
              apiVersionMinor: 0,
              allowedPaymentMethods: [
                {
                  type: "CARD",
                  parameters: {
                    allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                    allowedCardNetworks: ["VISA", "MASTERCARD"],
                  },
                },
              ],
            },
          },
        ],
        { total: { label: "Total", amount: { currency: "GBP", value: "0" } } },
      );
      request
        .canMakePayment()
        .then((result) => setGooglePaySupported(Boolean(result)))
        .catch(() => setGooglePaySupported(false));
    } catch {
      setGooglePaySupported(false);
    }
  }, []);
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
      if (result.completed || attempt.method === "bank_transfer") {
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
      !quote.methods[method] ||
      attempt
    )
      return;
    let validatedAddress;
    try {
      validatedAddress = normalizeAddress({ ...address });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check your address.");
      return;
    }
    if (international && !internationalAcknowledged) {
      setError("Acknowledge the international delivery notice to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (
        selectedAddressId === "custom" &&
        saveNewAddress &&
        customer &&
        address.address_line_1
      ) {
        publicApi
          .createMyAddress({
            full_name: address.full_name,
            phone: address.phone,
            address_line_1: address.address_line_1,
            address_line_2: address.address_line_2 || undefined,
            city: address.city,
            county: address.county || undefined,
            postcode: address.postcode,
            country: countryName(address.country),
            is_default: savedAddresses.length === 0,
          })
          .catch((err) =>
            console.warn("[checkout] Could not save address to account:", err),
          );
      }
      const result = await checkoutApi.create(method, {
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
      if (method === "bank_transfer" || result.completed) {
        clearCheckoutDraft();
        navigate(`/order-success/${result.orderId}`);
      } else if (result.url && new URL(result.url).protocol === "https:") {
        window.location.assign(result.url);
      } else {
        throw new Error(
          "The payment link is unavailable. Your order is saved; please retry from its status page.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Payment could not be started. Please retry.",
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
            <fieldset disabled={busy || Boolean(attempt)}>
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
              disabled={busy || Boolean(attempt)}
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
              disabled={busy || Boolean(attempt)}
              className="border-t border-gray-100 dark:border-white/10 pt-7"
            >
              <legend className="text-lg font-semibold float-left w-full mb-2 text-dark dark:text-white">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-300 rounded-full text-xs mr-3 font-bold">
                  3
                </span>
                Payment method
              </legend>
              <p className="clear-both text-sm text-gray-500 dark:text-gray-400 mb-5">
                Choose how you would like to pay.
              </p>
              <div className="space-y-3">
                {methods.map((option) => {
                  const available = option.id === "bank_transfer" ? true : Boolean(quote?.methods[option.id]);
                  const selected = available && method === option.id;
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.id}
                      className={`block rounded-xl border overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-900/40 ${
                        !available
                          ? "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-400 cursor-not-allowed"
                          : selected
                            ? "border-brand-blue ring-1 ring-brand-blue bg-blue-50/20 dark:bg-blue-950/20 cursor-pointer"
                            : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26]/50 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start gap-3 p-4 sm:p-5">
                        <input
                          type="radio"
                          name="payment"
                          value={option.id}
                          checked={selected}
                          disabled={!available}
                          onChange={() => setMethod(option.id)}
                          className="accent-blue-600 w-4 h-4 shrink-0 mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Icon size={18} className={selected ? "text-brand-blue" : "text-gray-500 dark:text-gray-400"} />
                            <span
                              className={`font-semibold text-dark dark:text-white ${option.id === "paypal" && available ? "text-blue-900 dark:text-blue-300 italic" : ""}`}
                            >
                              {option.name}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed mt-2 text-gray-500 dark:text-gray-400">
                            {option.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="inline-block text-[11px] font-medium px-2 py-1 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                              {available
                                ? option.id === "bank_transfer"
                                  ? quote?.bank_name || option.badge
                                  : option.badge
                                : "Temporarily unavailable"}
                            </span>
                            {available && (
                              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-brand-blue dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                ACTIVE
                              </span>
                            )}
                            {option.id === "card" &&
                              available &&
                              applePaySupported && (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-gray-900 dark:bg-white dark:text-dark text-white"
                                  title="Apple Pay available on this device"
                                >
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                  </svg>
                                  Apple Pay
                                </span>
                              )}
                            {option.id === "card" &&
                              available &&
                              googlePaySupported &&
                              !applePaySupported && (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-white dark:bg-[#141A26] border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300"
                                  title="Google Pay available on this device"
                                >
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M12 10.2v3.6h5.1c-.2 1.2-1.4 3.4-5.1 3.4-3.1 0-5.6-2.5-5.6-5.7s2.5-5.7 5.6-5.7c1.7 0 2.9.7 3.5 1.4l2.4-2.3C16.4 3.4 14.4 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
                                      fill="#4285F4"
                                    />
                                  </svg>
                                  Google Pay
                                </span>
                              )}
                          </div>
                        </div>
                        {selected && (
                          <Check
                            size={17}
                            className="text-brand-blue shrink-0 mt-1"
                          />
                        )}
                      </div>
                      {selected && (
                        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 px-4 sm:px-5 py-3 border-t border-blue-100 dark:border-blue-900/40 text-xs leading-relaxed text-blue-800 dark:text-blue-300">
                          <Lock size={14} className="shrink-0 mt-0.5" />
                          {option.detail}
                        </div>
                      )}
                    </label>
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
                (method !== "bank_transfer" && !quote?.methods[method]) ||
                Boolean(attempt)
              }
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white border-2 border-brand-blue hover:border-brand-blue-hover px-5 py-4 mt-6 text-sm font-bold shadow-md transition-all active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>
                {busy
                  ? "Please wait..."
                  : quoteQuery.isFetching
                    ? "Updating total..."
                    : method === "bank_transfer"
                      ? "Place Order — Pay by Bank Transfer"
                      : method === "paypal"
                        ? "Continue with PayPal"
                        : "Continue to Secure Payment"}
              </span>
              <ArrowRight size={17} className="shrink-0" />
            </button>
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 mt-3 text-center">
              {method === "bank_transfer"
                ? "Your order will await payment confirmation before shipping."
                : "You will review and complete payment with your selected provider."}
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
