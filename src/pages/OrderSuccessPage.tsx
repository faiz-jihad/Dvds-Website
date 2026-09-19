import { formatMoney, countryName } from "../../shared/commerce.js";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Building2,
  Copy,
  RefreshCw,
  Truck,
  UploadCloud,
  FileText,
  X,
  Check,
  Sun,
  Moon,
  ShieldCheck,
  Timer,
} from "lucide-react";
import {
  checkoutApi,
  consumeCheckoutReceipt,
  currentCheckoutAttempt,
} from "../lib/checkoutApi";
import { formatGBP, formatDateUK, cn } from "../lib/formatters";
import { StoreDataState } from "../components/common/StoreDataState";
import { OrderReceiptModal } from "../components/orders/OrderReceiptModal";
import { useCartStore } from "../stores/useCartStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import { clearCheckoutDraft } from "../lib/checkoutDraft";
import { useThemeStore } from "../stores/useThemeStore";

interface PaymentProofData {
  fileName: string;
  fileSize: number;
  dataUrl: string;
  uploadedAt: string;
}

export const OrderSuccessPage: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";
  const params = useParams<{ orderId: string; id: string }>();
  const orderId = params.orderId || params.id || "";
  const [search] = useSearchParams();
  const [message, setMessage] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Payment proof upload state (Max 2MB)
  const [proof, setProof] = useState<PaymentProofData | null>(() => {
    try {
      const saved = localStorage.getItem(`order_proof_${orderId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string>("");
  const [uploadingProof, setUploadingProof] = useState<boolean>(false);
  const [proofSuccess, setProofSuccess] = useState<boolean>(false);
  const query = useQuery({
    queryKey: ["order", orderId, search.get("session_id"), search.get("token")],
    queryFn: () =>
      checkoutApi.orderStatus(
        orderId,
        search.get("session_id") || undefined,
        search.get("token") || search.get("paypal_order_id") || undefined,
      ),
    enabled: Boolean(orderId),
    retry: 1,
    refetchInterval: (state) => {
      const order = state.state.data;
      if (state.state.error) return false;
      if (!order) return 5000;
      if (["cancelled", "refunded", "delivered"].includes(order.status))
        return false;
      return order.payment_status === "pending" ? 5000 : 15000;
    },
  });
  const order = query.data;
  const bankPending = Boolean(
    order &&
    order.payment_method === "bank_transfer" &&
    order.payment_status === "awaiting_payment" &&
    order.status !== "cancelled",
  );
  const paid = order?.payment_status === "paid";
  const partiallyRefunded = order?.payment_status === "partially_refunded";
  const refunded = Boolean(
    order?.payment_status === "refunded" || order?.status === "refunded",
  );
  const closed = Boolean(
    order &&
    (["cancelled", "refunded"].includes(order.status) ||
      order.payment_status === "failed"),
  );
  const attemptCurrency = currentCheckoutAttempt()?.input?.currency;
  const effectiveCurrency =
    order?.currency && order.currency !== "GBP"
      ? order.currency
      : attemptCurrency || (Number(order?.total_amount) >= 5000 ? "IDR" : (order?.currency || "GBP"));

  const ORDER_EXPIRY_MINUTES = 20;
  const isOrderExpired = Boolean(
    order &&
    !paid &&
    !partiallyRefunded &&
    (order.status === "cancelled" ||
      order.payment_status === "failed" ||
      (new Date(order.created_at).getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000 <= Date.now())),
  );

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!order || paid || closed) return 0;
    const expiryTime = new Date(order.created_at).getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000;
    return Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!order || paid || closed || !bankPending) return;
    const interval = setInterval(() => {
      const expiryTime = new Date(order.created_at).getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000;
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        checkoutApi.cancel(order.id).catch(() => {}).finally(() => {
          query.refetch();
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.id, order?.created_at, paid, closed, bankPending]);

  const minutesLeft = Math.floor(timeLeft / 60);
  const secondsLeft = timeLeft % 60;
  const formattedCountdown = `${minutesLeft.toString().padStart(2, "0")}:${secondsLeft.toString().padStart(2, "0")}`;

  useEffect(() => {
    if (
      !order ||
      (!paid &&
        !bankPending &&
        !partiallyRefunded &&
        order.payment_status !== "refunded")
    )
      return;
    const purchased = consumeCheckoutReceipt(order.id);
    clearCheckoutDraft();
    if (!purchased) return;

    // Dispatch order confirmation for customer & admin
    useNotificationStore.getState().addNotification({
      target: "customer",
      type: "order",
      title: "Order Confirmed",
      message: `Your order #${order.order_number} has been received (${formatMoney(order.total_amount, effectiveCurrency)}). Follow delivery progress anytime.`,
      link: `/order-success/${order.id}`,
    });
    useNotificationStore.getState().addNotification({
      target: "admin",
      type: "order",
      title: "New Order Received",
      message: `Order #${order.order_number} (${formatMoney(order.total_amount, effectiveCurrency)}) placed by customer.`,
      link: "/admin/orders",
    });

    useCartStore.setState((state) => {
      const remaining = state.items.flatMap((item) => {
        const quantity =
          item.quantity -
          (purchased.find((line) => line.product_id === item.product_id)
            ?.quantity || 0);
        return quantity > 0 ? [{ ...item, quantity }] : [];
      });
      return {
        items: remaining,
        ...(!remaining.length
          ? { appliedPromoCode: null, discountPercentage: 0, fixedDiscount: 0 }
          : {}),
      };
    });
  }, [order, paid, bankPending, partiallyRefunded]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 2MB: 2 * 1024 * 1024 = 2,097,152 bytes
    if (file.size > 2 * 1024 * 1024) {
      setProofError(
        "File size exceeds 2MB limit. Please upload payment proof under 2MB.",
      );
      e.target.value = "";
      setProofFile(null);
      setProofPreview(null);
      return;
    }

    setProofFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleUploadProof = () => {
    if (!proofFile) return;
    setUploadingProof(true);
    setProofError("");

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newProof: PaymentProofData = {
          fileName: proofFile.name,
          fileSize: proofFile.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        setProof(newProof);
        try {
          localStorage.setItem(
            `order_proof_${orderId}`,
            JSON.stringify(newProof),
          );
          if (order?.order_number) {
            localStorage.setItem(
              `order_proof_${order.order_number}`,
              JSON.stringify(newProof),
            );
          }
        } catch {
          // ignore localStorage error
        }
        checkoutApi.uploadPaymentProof(orderId, newProof).catch((err) => {
          console.warn("[checkout] Server proof sync error:", err);
        });
        setProofSuccess(true);
        setProofFile(null);
        setProofPreview(null);
        setUploadingProof(false);
      };
      reader.readAsDataURL(proofFile);
    } catch (err) {
      setProofError(
        err instanceof Error ? err.message : "Failed to upload payment proof.",
      );
      setUploadingProof(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage(
        "Could not copy automatically. Please select and copy the details.",
      );
    }
  };
  const cancel = async () => {
    setCancelling(true);
    setMessage("");
    try {
      await checkoutApi.cancel(orderId);
      await query.refetch();
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to cancel. Please refresh the order.",
      );
    } finally {
      setCancelling(false);
    }
  };
  if (query.isPending || (!order && query.error))
    return (
      <StoreDataState
        loading={query.isPending}
        error={query.error}
        retry={() => query.refetch()}
      />
    );
  if (!order)
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#07090E] p-12 text-center text-dark dark:text-white">
        Order not found.{" "}
        <Link to="/" className="underline text-brand-blue">
          Return to shop
        </Link>
      </div>
    );
  const needsReview =
    order.payment_review_required && (paid || partiallyRefunded);
  const isCancelledOrExpired = closed || (isOrderExpired && !paid);
  const title = refunded
    ? "Payment refunded"
    : isCancelledOrExpired
      ? "Order cancelled - Payment expired"
      : needsReview
        ? "Payment received - order under review"
        : partiallyRefunded
          ? "Payment partially refunded"
          : paid
            ? "Payment confirmed"
            : bankPending
              ? "Order placed - awaiting transfer"
              : "Awaiting payment confirmation";
  const description = refunded
    ? "Your payment provider has confirmed a full refund for this order."
    : isCancelledOrExpired
      ? "Batas waktu pembayaran 20 menit telah berakhir. Pesanan ini otomatis dibatalkan dan stok telah dirilis kembali."
      : needsReview
        ? "Your payment arrived after the stock reservation was released. Our team needs to review the order before dispatch."
        : partiallyRefunded
          ? "A refund has been recorded. Your latest order and delivery status are shown below."
          : paid
            ? "Your payment has been verified. Follow the delivery status below."
            : bankPending
              ? "Gunakan rekening bank dan nomor referensi di bawah ini. Harap transfer sebelum batas waktu 20 menit berakhir agar pesanan tidak hangus."
              : "We are checking the payment status. If you have already paid, please wait for confirmation before trying again.";
  const isAlert = isCancelledOrExpired || needsReview || refunded;
  const Icon =
    isCancelledOrExpired || needsReview ? AlertCircle : paid ? CheckCircle2 : Clock;
  const bank = order.bank_details;
  const pendingUrl =
    currentCheckoutAttempt()?.orderId === order.id
      ? currentCheckoutAttempt()?.url
      : undefined;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white transition-colors duration-200">
      {/* Checkout / Order Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 group"
            aria-label="DVDs Zone Home"
          >
            <img
              src={
                isDark
                  ? "/brand/logo-dark-theme.png"
                  : "/brand/logo-transparent.png"
              }
              alt="DVDs Zone"
              className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <ShieldCheck size={15} className="text-brand-blue shrink-0" />
              <span>Verified Order</span>
            </span>

            {/* Direct Theme Switcher Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all cursor-pointer shadow-2xs",
                isDark
                  ? "bg-white/5 hover:bg-white/10 border-white/10 text-brand-blue hover:text-blue-300"
                  : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 hover:text-gray-900",
              )}
              title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
              aria-label="Toggle color theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-2xs"
            >
              <span>Back to shop</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            {paid ? (
              <div className="inline-flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-full bg-emerald-500/25 dark:bg-emerald-400/20 blur-xl animate-pulse" />
                  <span className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/25 border-4 border-white dark:border-[#141A26]">
                    <motion.svg
                      className="w-10 h-10 sm:w-12 sm:h-12 stroke-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.15, type: "tween", ease: "easeOut", duration: 0.45 }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  </span>
                </motion.div>
              </div>
            ) : bankPending ? (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full p-4 sm:p-5 shadow-sm",
                  "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50",
                )}
              >
                <Clock size={34} className="animate-pulse" />
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full p-4 sm:p-5 shadow-sm",
                  isAlert
                    ? "bg-rose-50 dark:bg-rose-950/50 text-brand-red dark:text-red-400 border border-rose-200/80 dark:border-rose-900/50"
                    : "bg-blue-50 dark:bg-blue-950/50 text-brand-blue dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50",
                )}
              >
                <Icon size={34} />
              </span>
            )}
            <h1 className="font-display font-bold text-2xl sm:text-3xl mt-5 text-dark dark:text-white">
              {title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto mt-3 leading-relaxed">
              {description}
            </p>
            <p className="text-sm mt-4 font-mono font-semibold text-gray-700 dark:text-gray-300">
              {order.order_number}
            </p>
          </header>

          {query.error && (
            <p
              role="alert"
              className="rounded-xl p-4 bg-brand-red-soft dark:bg-brand-red/15 border border-brand-red/30 dark:border-brand-red/40 text-brand-red dark:text-red-200 text-sm mb-5"
            >
              The latest update could not be loaded. The details below are from
              the last successful check. {query.error.message}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-sm mb-5"
            >
              {message}
            </p>
          )}

          {isCancelledOrExpired && (
            <section className="bg-white dark:bg-[#0E131F] rounded-2xl border border-brand-red/30 dark:border-brand-red/40 p-6 sm:p-8 mb-6 shadow-xs text-center text-dark dark:text-white">
              <div className="inline-flex p-3 rounded-full bg-brand-red-soft dark:bg-brand-red/20 text-brand-red dark:text-red-400 border border-brand-red/30 dark:border-brand-red/40 mb-3">
                <AlertCircle size={30} />
              </div>
              <h2 className="text-lg font-bold text-dark dark:text-white">
                Pesanan Dibatalkan (Waktu Pembayaran Hangus)
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 leading-relaxed">
                Batas waktu pembayaran 20 menit telah habis. Pesanan ini telah otomatis dibatalkan dan reservasi stok item telah dilepaskan kembali. Silakan lakukan pemesanan ulang.
              </p>
              <div className="mt-5 flex justify-center">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-brand-blue hover:bg-brand-blue-hover text-white transition-colors shadow-xs"
                >
                  <span>Pesan Ulang / Kembali ke Toko</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </section>
          )}

          {bankPending && !isCancelledOrExpired && (
            <section className="bg-white dark:bg-[#0E131F] rounded-2xl border border-blue-200 dark:border-blue-900/40 p-5 sm:p-7 mb-6 shadow-xs text-dark dark:text-white">
              {/* High Urgency 20-Minute Countdown Banner (Brand Red Urgency) */}
              <div className="mb-5 p-4 rounded-xl bg-brand-red-soft dark:bg-brand-red/15 border border-brand-red/30 dark:border-brand-red/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-brand-red/25 text-brand-red dark:text-red-300">
                    <Timer className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-red dark:text-red-300 block">
                      Batas Waktu Pembayaran: 20 Menit
                    </span>
                    <p className="text-xs text-brand-red/90 dark:text-red-300/90 mt-0.5">
                      Segera selesaikan transfer sebelum batas waktu habis agar pesanan tidak hangus.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-xl sm:text-2xl font-black text-brand-red dark:text-red-400">
                    {formattedCountdown}
                  </div>
                  <div className="text-[10px] uppercase font-mono text-gray-500 dark:text-gray-400">
                    Sisa Waktu
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 dark:border-white/10 pb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-dark dark:text-white">
                  <Building2 size={20} className="text-brand-blue" /> Direct
                  Bank Transfer Instructions
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-red-soft dark:bg-brand-red/20 text-brand-red dark:text-red-400 border border-brand-red/30 dark:border-brand-red/40 font-mono">
                  <Clock size={13} /> SISA WAKTU: {formattedCountdown}
                </span>
              </div>
              {bank?.bank_account_number ? (
                <>
                  <dl className="grid sm:grid-cols-2 gap-5 mt-5">
                    {(
                      [
                        ["Bank", bank.bank_name],
                        ["Account name", bank.bank_account_name],
                        ["Sort code", bank.bank_sort_code],
                        ["Account number", bank.bank_account_number],
                        [
                          "Amount to transfer",
                          formatMoney(order.total_amount, effectiveCurrency),
                        ],
                        [
                          "Payment reference",
                          order.bank_transfer_reference || order.order_number,
                        ],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="p-3 bg-gray-50/80 dark:bg-[#141A26] rounded-xl border border-gray-100 dark:border-white/10"
                      >
                        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {label}
                        </dt>
                        <dd className="flex items-center gap-2 text-sm font-semibold break-all text-dark dark:text-white">
                          {value || "--"}
                          {value && (
                            <button
                              onClick={() => copy(value)}
                              className="p-1 text-gray-400 hover:text-brand-blue rounded hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                              aria-label={`Copy ${label.toLowerCase()}`}
                              title="Copy"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs sm:text-sm leading-relaxed text-blue-900 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 mt-5">
                    {bank.bank_payment_instructions ||
                      "Include your payment reference so our team can match the transfer to your order. Upload your proof of transfer below once sent."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-brand-red dark:text-red-400 mt-4">
                  Bank details are not available for this order. Please contact
                  the store and quote your order reference before transferring.
                </p>
              )}

              {/* Upload Payment Proof Section */}
              <div className="mt-7 pt-6 border-t border-gray-100 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-dark dark:text-white flex items-center gap-2">
                      <UploadCloud size={18} className="text-brand-blue" />
                      Upload Payment Proof
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      JPG, PNG, WEBP images or PDF document (Maximum 2MB).
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 uppercase">
                    Max. 2MB
                  </span>
                </div>

                {proofSuccess && (
                  <div className="mb-4 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-950 dark:text-blue-200 flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-brand-blue dark:text-blue-400 shrink-0 mt-0.5"
                    />
                    <div>
                      <strong className="font-semibold block">
                        Payment Proof Uploaded Successfully!
                      </strong>
                      <span>
                        Our team is verifying your transfer. Your order status
                        will automatically update once confirmed.
                      </span>
                    </div>
                  </div>
                )}

                {proofError && (
                  <div className="mb-4 p-3.5 bg-brand-red-soft dark:bg-brand-red/15 border border-brand-red/30 dark:border-brand-red/40 rounded-xl text-xs text-brand-red dark:text-red-300 flex items-start gap-2">
                    <AlertCircle
                      size={16}
                      className="text-brand-red dark:text-red-400 shrink-0 mt-0.5"
                    />
                    <span>{proofError}</span>
                  </div>
                )}

                {proof ? (
                  <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {proof.dataUrl.startsWith("data:image/") ? (
                        <img
                          src={proof.dataUrl}
                          alt="Payment Proof"
                          className="w-14 h-14 object-cover rounded-lg border border-blue-200 dark:border-blue-900/50 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-brand-blue dark:text-blue-300 shrink-0">
                          <FileText size={22} />
                        </div>
                      )}
                      <div className="min-w-0 text-xs">
                        <p className="font-semibold text-dark dark:text-white truncate">
                          {proof.fileName}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                          {(proof.fileSize / 1024).toFixed(1)} KB • Uploaded{" "}
                          {formatDateUK(proof.uploadedAt)}
                        </p>
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-brand-blue dark:text-blue-400">
                          <Check size={12} /> Proof Saved &amp; Ready for
                          Verification
                        </span>
                      </div>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#141A26] border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-dark dark:hover:text-white shadow-xs transition-colors">
                      Replace File
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!proofFile ? (
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-brand-blue dark:hover:border-brand-blue rounded-2xl bg-gray-50/50 dark:bg-white/5 hover:bg-blue-50/30 dark:hover:bg-white/10 transition-all cursor-pointer group text-center">
                        <UploadCloud
                          size={32}
                          className="text-gray-400 group-hover:text-brand-blue mb-2 transition-colors"
                        />
                        <span className="text-xs sm:text-sm font-semibold text-dark dark:text-white">
                          Select receipt photo or bank transfer proof
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          Click to choose a file or image (Maximum 2MB)
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-[#141A26] border border-gray-200 dark:border-white/10 rounded-xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0 text-xs">
                            {proofPreview ? (
                              <img
                                src={proofPreview}
                                alt="Preview"
                                className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                                <FileText size={22} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-dark dark:text-white truncate">
                                {proofFile.name}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                                {(proofFile.size / 1024).toFixed(1)} KB (Max
                                limit 2048 KB)
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setProofFile(null);
                              setProofPreview(null);
                              setProofError("");
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleUploadProof}
                          disabled={uploadingProof}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-blue text-white text-xs font-semibold hover:brightness-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                        >
                          {uploadingProof ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />{" "}
                              Uploading...
                            </>
                          ) : (
                            <>
                              <UploadCloud size={14} /> Submit &amp; Confirm
                              Payment Proof
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="grid md:grid-cols-[minmax(0,1fr)_280px] gap-6">
            <section className="bg-white dark:bg-[#0E131F] rounded-2xl border border-gray-200 dark:border-white/10 p-5 sm:p-7 shadow-xs text-dark dark:text-white">
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                Order details
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Placed {formatDateUK(order.created_at)}
              </p>
              <div className="divide-y divide-gray-100 dark:divide-white/10 my-5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm text-dark dark:text-white">
                        {item.product_title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Qty {item.quantity} x{" "}
                        {formatMoney(item.unit_price, effectiveCurrency)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-dark dark:text-white">
                      {formatMoney(item.total_price, effectiveCurrency)}
                    </span>
                  </div>
                ))}
              </div>
              <dl className="text-sm space-y-3 border-t border-gray-100 dark:border-white/10 pt-5">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Subtotal</dt>
                  <dd className="font-medium text-dark dark:text-white">
                    {formatMoney(order.subtotal, effectiveCurrency)}
                  </dd>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-brand-red dark:text-red-400 font-medium">
                    <dt>Discount</dt>
                    <dd>
                      -{formatMoney(order.discount_amount, effectiveCurrency)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Delivery</dt>
                  <dd className="font-medium text-dark dark:text-white">
                    {order.shipping_amount === 0
                      ? "FREE"
                      : formatMoney(order.shipping_amount, effectiveCurrency)}
                  </dd>
                </div>
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-100 dark:border-white/10 text-dark dark:text-white">
                  <dt>Order total</dt>
                  <dd>{formatMoney(order.total_amount, effectiveCurrency)}</dd>
                </div>
                {Number(order.refunded_amount) > 0 && (
                  <div className="flex justify-between text-blue-700 dark:text-blue-400">
                    <dt>Refunded</dt>
                    <dd>
                      {formatMoney(order.refunded_amount!, effectiveCurrency)}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <aside className="space-y-5">
              <section className="bg-white dark:bg-[#0E131F] rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-xs text-dark dark:text-white">
                <h2 className="font-semibold text-sm flex gap-2 items-center text-dark dark:text-white">
                  <Truck size={17} className="text-brand-blue" /> Delivery
                  status
                </h2>
                <p className="capitalize text-sm font-semibold mt-3 text-dark dark:text-white">
                  {order.status.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {order.delivery_name}
                </p>
                {order.shipping_carrier && (
                  <p className="text-sm mt-3 text-dark dark:text-white">
                    {order.shipping_carrier}
                  </p>
                )}
                {order.tracking_number && (
                  <p className="text-xs font-mono mt-1 break-all text-gray-600 dark:text-gray-300">
                    Tracking: {order.tracking_number}
                  </p>
                )}
                {order.delivered_at && (
                  <p className="text-xs mt-2 text-brand-blue dark:text-blue-400 font-semibold">
                    Delivered {formatDateUK(order.delivered_at)}
                  </p>
                )}
              </section>

              <section className="bg-white dark:bg-[#0E131F] rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-xs text-dark dark:text-white">
                <h2 className="font-semibold text-sm text-dark dark:text-white">
                  Delivery address
                </h2>
                <address className="not-italic text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
                  {order.shipping_address.full_name}
                  <br />
                  {order.shipping_address.address_line_1}
                  <br />
                  {order.shipping_address.address_line_2 && (
                    <>
                      {order.shipping_address.address_line_2}
                      <br />
                    </>
                  )}
                  {order.shipping_address.city},{" "}
                  {order.shipping_address.postcode}
                  <br />
                  {countryName(order.shipping_address.country)}
                </address>
              </section>

              <section className="bg-white dark:bg-[#0E131F] rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-xs text-dark dark:text-white">
                <h2 className="font-semibold text-sm text-dark dark:text-white">
                  Payment
                </h2>
                <p className="text-sm font-semibold mt-3 text-dark dark:text-white">
                  {order.payment_method === "bank_transfer"
                    ? "Bank transfer"
                    : order.payment_method === "paypal"
                      ? "PayPal"
                      : "Card"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 capitalize">
                  {order.payment_status.replace(/_/g, " ")}
                </p>
                {order.paid_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Received {formatDateUK(order.paid_at)}
                  </p>
                )}
              </section>
            </aside>
          </div>

          <OrderReceiptModal
            isOpen={receiptOpen}
            onClose={() => setReceiptOpen(false)}
            order={order}
          />

          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-3.5 mt-8">
            <button
              type="button"
              onClick={() => setReceiptOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 sm:px-5 rounded-xl bg-white dark:bg-[#0E131F] hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:text-dark dark:hover:text-white text-xs sm:text-sm font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <FileText size={15} className="text-gray-400" />
              <span>View / Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 sm:px-5 rounded-xl bg-white dark:bg-[#0E131F] hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:text-dark dark:hover:text-white text-xs sm:text-sm font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  query.isFetching
                    ? "animate-spin text-brand-blue"
                    : "text-gray-400"
                }
              />
              <span>
                {query.isFetching ? "Refreshing..." : "Refresh Status"}
              </span>
            </button>

            {!paid && !closed && !partiallyRefunded && pendingUrl && (
              <a
                href={pendingUrl}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-blue/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Resume Payment</span>
              </a>
            )}

            {!paid && !closed && !partiallyRefunded && (
              <button
                type="button"
                disabled={cancelling}
                onClick={cancel}
                className="inline-flex items-center justify-center h-11 px-3 text-xs font-semibold text-gray-400 hover:text-brand-red transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}

            <Link
              to={closed ? "/cart" : "/shop"}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 sm:px-6 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-blue/20 active:scale-95 transition-all cursor-pointer group"
            >
              <span>{closed ? "Return to Basket" : "Continue Shopping"}</span>
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          {!closed && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-5">
              This page refreshes automatically while your order is being
              processed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
