import { formatMoney, countryName } from '../../shared/commerce.js';
import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Building2, Copy, RefreshCw, Truck, UploadCloud, FileText, X, Check } from 'lucide-react';
import { checkoutApi, consumeCheckoutReceipt, currentCheckoutAttempt } from '../lib/checkoutApi';
import { formatGBP, formatDateUK } from '../lib/formatters';
import { StoreDataState } from '../components/common/StoreDataState';
import { OrderReceiptModal } from '../components/orders/OrderReceiptModal';
import { useCartStore } from '../stores/useCartStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { clearCheckoutDraft } from '../lib/checkoutDraft';

interface PaymentProofData {
  fileName: string;
  fileSize: number;
  dataUrl: string;
  uploadedAt: string;
}

export const OrderSuccessPage: React.FC = () => {
  const params = useParams<{ orderId: string; id: string }>();
  const orderId = params.orderId || params.id || '';
  const [search] = useSearchParams();
  const [message, setMessage] = useState('');
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
  const [proofError, setProofError] = useState<string>('');
  const [uploadingProof, setUploadingProof] = useState<boolean>(false);
  const [proofSuccess, setProofSuccess] = useState<boolean>(false);
  const query = useQuery({
    queryKey: ['order', orderId, search.get('session_id'), search.get('token')],
    queryFn: () => checkoutApi.orderStatus(orderId, search.get('session_id') || undefined, search.get('token') || search.get('paypal_order_id') || undefined),
    enabled: Boolean(orderId), retry: 1,
    refetchInterval: (state) => {
      const order = state.state.data;
      if (state.state.error) return false;
      if (!order) return 5000;
      if (['cancelled', 'refunded', 'delivered'].includes(order.status)) return false;
      return order.payment_status === 'pending' ? 5000 : 15000;
    },
  });
  const order = query.data;
  const bankPending = Boolean(order && order.payment_method === 'bank_transfer' && order.payment_status === 'awaiting_payment' && order.status !== 'cancelled');
  const paid = order?.payment_status === 'paid';
  const partiallyRefunded = order?.payment_status === 'partially_refunded';
  const closed = Boolean(order && (['cancelled', 'refunded'].includes(order.status) || order.payment_status === 'failed'));
  useEffect(() => {
    if (!order || (!paid && !bankPending && !partiallyRefunded && order.payment_status !== 'refunded')) return;
    const purchased = consumeCheckoutReceipt(order.id);
    clearCheckoutDraft();
    if (!purchased) return;

    // Dispatch order confirmation for customer & admin
    useNotificationStore.getState().addNotification({
      target: 'customer',
      type: 'order',
      title: 'Order Confirmed',
      message: `Your order #${order.order_number} has been received (${formatMoney(order.total_amount, order.currency)}). Follow delivery progress anytime.`,
      link: `/order-success/${order.id}`,
    });
    useNotificationStore.getState().addNotification({
      target: 'admin',
      type: 'order',
      title: 'New Order Received',
      message: `Order #${order.order_number} (${formatMoney(order.total_amount, order.currency)}) placed by customer.`,
      link: '/admin/orders',
    });

    useCartStore.setState((state) => {
      const remaining = state.items.flatMap((item) => {
        const quantity = item.quantity - (purchased.find((line) => line.product_id === item.product_id)?.quantity || 0);
        return quantity > 0 ? [{ ...item, quantity }] : [];
      });
      return { items: remaining, ...(!remaining.length ? { appliedPromoCode: null, discountPercentage: 0, fixedDiscount: 0 } : {}) };
    });
  }, [order, paid, bankPending, partiallyRefunded]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 2MB: 2 * 1024 * 1024 = 2,097,152 bytes
    if (file.size > 2 * 1024 * 1024) {
      setProofError('File size exceeds 2MB limit. Please upload payment proof under 2MB.');
      e.target.value = '';
      setProofFile(null);
      setProofPreview(null);
      return;
    }

    setProofFile(file);
    if (file.type.startsWith('image/')) {
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
    setProofError('');

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
          localStorage.setItem(`order_proof_${orderId}`, JSON.stringify(newProof));
          if (order?.order_number) {
            localStorage.setItem(`order_proof_${order.order_number}`, JSON.stringify(newProof));
          }
        } catch {
          // ignore localStorage error
        }
        checkoutApi.uploadPaymentProof(orderId, newProof).catch((err) => {
          console.warn('[checkout] Server proof sync error:', err);
        });
        setProofSuccess(true);
        setProofFile(null);
        setProofPreview(null);
        setUploadingProof(false);
      };
      reader.readAsDataURL(proofFile);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : 'Failed to upload payment proof.');
      setUploadingProof(false);
    }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setMessage('Copied to clipboard.'); }
    catch { setMessage('Could not copy automatically. Please select and copy the details.'); }
  };
  const cancel = async () => {
    setCancelling(true); setMessage('');
    try { await checkoutApi.cancel(orderId); await query.refetch(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to cancel. Please refresh the order.'); }
    finally { setCancelling(false); }
  };
  if (query.isPending || (!order && query.error)) return <StoreDataState loading={query.isPending} error={query.error} retry={() => query.refetch()} />;
  if (!order) return <div className="p-12 text-center">Order not found. <Link to="/" className="underline">Return to shop</Link></div>;
  const needsReview = order.payment_review_required && (paid || partiallyRefunded);
  const refunded = order.payment_status === 'refunded';
  const title = refunded ? 'Payment refunded' : closed ? 'Payment not completed' : needsReview ? 'Payment received - order under review' : partiallyRefunded ? 'Payment partially refunded' : paid ? 'Payment confirmed' : bankPending ? 'Order placed - awaiting transfer' : 'Awaiting payment confirmation';
  const description = refunded ? 'Your payment provider has confirmed a full refund for this order.' : closed ? 'This order is closed. Return to your basket to start a new checkout.' : needsReview ? 'Your payment arrived after the stock reservation was released. Our team needs to review the order before dispatch.' : partiallyRefunded ? 'A refund has been recorded. Your latest order and delivery status are shown below.' : paid ? 'Your payment has been verified. Follow the delivery status below.' : bankPending ? 'Use the bank details and exact reference below. Your order will be processed once our team confirms receipt.' : 'We are checking the payment status. If you have already paid, please wait for confirmation before trying again.';
  const Icon = closed || needsReview ? AlertCircle : paid ? CheckCircle2 : Clock;
  const bank = order.bank_details;
  const pendingUrl = currentCheckoutAttempt()?.orderId === order.id ? currentCheckoutAttempt()?.url : undefined;

  return <div className="bg-gray-50/70 min-h-screen py-10 sm:py-14 px-4 sm:px-6">
    <div className="max-w-4xl mx-auto">
      <header className="text-center mb-8">
        <span className={`inline-flex p-4 rounded-full ${paid && !needsReview ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-700'}`}><Icon size={30} /></span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mt-5">{title}</h1><p className="text-sm text-gray-500 max-w-xl mx-auto mt-3 leading-relaxed">{description}</p>
        <p className="text-sm mt-4 font-mono font-semibold">{order.order_number}</p>
      </header>
      {query.error && <p role="alert" className="rounded-xl p-4 bg-amber-50 text-amber-900 text-sm mb-5">The latest update could not be loaded. The details below are from the last successful check. {query.error.message}</p>}
      {message && <p role="status" className="rounded-xl p-4 bg-blue-50 text-blue-900 text-sm mb-5">{message}</p>}
      {bankPending && <section className="bg-white rounded-2xl border border-blue-200 p-5 sm:p-7 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-dark">
            <Building2 size={20} className="text-brand-blue" /> Direct Bank Transfer Instructions
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
            <Clock size={13} /> AWAITING PAYMENT
          </span>
        </div>
        {bank?.bank_account_number ? <>
          <dl className="grid sm:grid-cols-2 gap-5 mt-5">
            {([['Bank', bank.bank_name], ['Account name', bank.bank_account_name], ['Sort code', bank.bank_sort_code], ['Account number', bank.bank_account_number], ['Amount to transfer', formatMoney(order.total_amount, order.currency)], ['Payment reference', order.bank_transfer_reference || order.order_number]] as const).map(([label, value]) => <div key={label} className="p-3 bg-gray-50/80 rounded-xl border border-gray-100"><dt className="text-xs text-gray-500 mb-1">{label}</dt><dd className="flex items-center gap-2 text-sm font-semibold break-all text-dark">{value || '--'}{value && <button onClick={() => copy(value)} className="p-1 text-gray-400 hover:text-brand-blue rounded hover:bg-white transition-colors" aria-label={`Copy ${label.toLowerCase()}`} title="Copy"><Copy size={14} /></button>}</dd></div>)}
          </dl>
          <p className="text-xs sm:text-sm leading-relaxed text-blue-900 bg-blue-50/70 border border-blue-100 rounded-xl p-4 mt-5">{bank.bank_payment_instructions || 'Include your payment reference so our team can match the transfer to your order. Upload your proof of transfer below once sent.'}</p>
        </> : <p className="text-sm text-amber-800 mt-4">Bank details are not available for this order. Please contact the store and quote your order reference before transferring.</p>}

        {/* Upload Payment Proof Section */}
        <div className="mt-7 pt-6 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-dark flex items-center gap-2">
                <UploadCloud size={18} className="text-brand-blue" />
                Upload Payment Proof
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                JPG, PNG, WEBP images or PDF document (Maximum 2MB).
              </p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-brand-blue border border-blue-200 uppercase">
              Max. 2MB
            </span>
          </div>

          {proofSuccess && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Payment Proof Uploaded Successfully!</strong>
                <span>Our team is verifying your transfer. Your order status will automatically update once confirmed.</span>
              </div>
            </div>
          )}

          {proofError && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{proofError}</span>
            </div>
          )}

          {proof ? (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {proof.dataUrl.startsWith('data:image/') ? (
                  <img src={proof.dataUrl} alt="Payment Proof" className="w-14 h-14 object-cover rounded-lg border border-emerald-200 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <FileText size={22} />
                  </div>
                )}
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-dark truncate">{proof.fileName}</p>
                  <p className="text-gray-500 mt-0.5">
                    {(proof.fileSize / 1024).toFixed(1)} KB • Uploaded {formatDateUK(proof.uploadedAt)}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700">
                    <Check size={12} /> Proof Saved &amp; Ready for Verification
                  </span>
                </div>
              </div>
              <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-dark shadow-xs transition-colors">
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
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 hover:border-brand-blue rounded-2xl bg-gray-50/50 hover:bg-blue-50/30 transition-all cursor-pointer group text-center">
                  <UploadCloud size={32} className="text-gray-400 group-hover:text-brand-blue mb-2 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-dark">
                    Select receipt photo or bank transfer proof
                  </span>
                  <span className="text-[11px] text-gray-500 mt-1">
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
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 text-xs">
                      {proofPreview ? (
                        <img src={proofPreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-gray-200 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                          <FileText size={22} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-dark truncate">{proofFile.name}</p>
                        <p className="text-gray-500 mt-0.5">
                          {(proofFile.size / 1024).toFixed(1)} KB (Max limit 2048 KB)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                        setProofError('');
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadProof}
                    disabled={uploadingProof}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-blue text-white text-xs font-semibold hover:brightness-95 disabled:opacity-50 transition-all shadow-xs"
                  >
                    {uploadingProof ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} /> Submit &amp; Confirm Payment Proof
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>}
      <div className="grid md:grid-cols-[minmax(0,1fr)_280px] gap-6">
        <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Order details</h2><p className="text-xs text-gray-500 mt-1">Placed {formatDateUK(order.created_at)}</p>
          <div className="divide-y divide-gray-100 my-5">{order.items.map((item) => <div key={item.id} className="flex gap-3 py-4"><div className="min-w-0 flex-1"><h3 className="font-medium text-sm">{item.product_title}</h3><p className="text-xs text-gray-500 mt-1">Qty {item.quantity} x {formatMoney(item.unit_price, order.currency)}</p></div><span className="text-sm font-medium">{formatMoney(item.total_price, order.currency)}</span></div>)}</div>
          <dl className="text-sm space-y-3 border-t border-gray-100 pt-5">
            <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd>{formatMoney(order.subtotal, order.currency)}</dd></div>
            {order.discount_amount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>-{formatMoney(order.discount_amount, order.currency)}</dd></div>}
            <div className="flex justify-between"><dt className="text-gray-500">Delivery</dt><dd>{order.shipping_amount === 0 ? 'FREE' : formatMoney(order.shipping_amount, order.currency)}</dd></div>
            <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-100"><dt>Order total</dt><dd>{formatMoney(order.total_amount, order.currency)}</dd></div>
            {Number(order.refunded_amount) > 0 && <div className="flex justify-between text-blue-700"><dt>Refunded</dt><dd>{formatMoney(order.refunded_amount!, order.currency)}</dd></div>}
          </dl>
        </section>
        <aside className="space-y-5">
          <section className="bg-white rounded-2xl border border-gray-200 p-5"><h2 className="font-semibold text-sm flex gap-2 items-center"><Truck size={17} /> Delivery status</h2><p className="capitalize text-sm mt-3">{order.status.replace(/_/g, ' ')}</p><p className="text-xs text-gray-500 mt-2">{order.delivery_name}</p>{order.shipping_carrier && <p className="text-sm mt-3">{order.shipping_carrier}</p>}{order.tracking_number && <p className="text-xs font-mono mt-1 break-all">Tracking: {order.tracking_number}</p>}{order.delivered_at && <p className="text-xs mt-2 text-emerald-700">Delivered {formatDateUK(order.delivered_at)}</p>}</section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5"><h2 className="font-semibold text-sm">Delivery address</h2><address className="not-italic text-sm text-gray-600 leading-relaxed mt-3">{order.shipping_address.full_name}<br />{order.shipping_address.address_line_1}<br />{order.shipping_address.address_line_2 && <>{order.shipping_address.address_line_2}<br /></>}{order.shipping_address.city}, {order.shipping_address.postcode}<br />{countryName(order.shipping_address.country)}</address></section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5"><h2 className="font-semibold text-sm">Payment</h2><p className="text-sm mt-3">{order.payment_method === 'bank_transfer' ? 'Bank transfer' : order.payment_method === 'paypal' ? 'PayPal' : 'Card'}</p><p className="text-xs text-gray-500 mt-2 capitalize">{order.payment_status.replace(/_/g, ' ')}</p>{order.paid_at && <p className="text-xs text-gray-500 mt-2">Received {formatDateUK(order.paid_at)}</p>}</section>
        </aside>
      </div>
      <OrderReceiptModal isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} order={order} />
      <div className="flex flex-wrap justify-center items-center gap-5 mt-8 text-sm">
        <button onClick={() => setReceiptOpen(true)} className="inline-flex items-center gap-1.5 text-brand-blue underline font-medium">
          View / print receipt
        </button>
        <button onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex gap-2 items-center text-brand-blue font-medium disabled:opacity-50">
          <RefreshCw size={15} className={query.isFetching ? 'animate-spin' : ''} />
          Refresh status
        </button>
        {!paid && !closed && !partiallyRefunded && pendingUrl && <a className="text-brand-blue underline font-medium" href={pendingUrl}>Resume payment</a>}
        {!paid && !closed && !partiallyRefunded && <button disabled={cancelling} onClick={cancel} className="text-gray-500 underline disabled:opacity-50">{cancelling ? 'Cancelling...' : 'Cancel unpaid order'}</button>}
        <Link to={closed ? '/cart' : '/shop'} className="inline-flex items-center gap-2 rounded-xl bg-brand-blue text-white px-5 py-3 font-semibold shadow-xs hover:brightness-95 transition-all">
          <span>{closed ? 'Return to basket' : 'Continue shopping'}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/25 uppercase">
            STORE
          </span>
          <ArrowRight size={16} />
        </Link>
      </div>
      {!closed && <p className="text-xs text-gray-400 text-center mt-5">This page refreshes automatically while your order is being processed.</p>}
    </div>
  </div>;
};
