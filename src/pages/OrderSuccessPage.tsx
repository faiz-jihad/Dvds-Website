import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  ArrowRight,
  Disc,
  Printer,
  Building2,
  Copy,
  Check,
  AlertCircle,
  CreditCard,
  Clock,
} from 'lucide-react';
import { publicApi } from '../lib/publicApi';
import { formatGBP, formatDateUK } from '../lib/formatters';
import { Button } from '../components/common/Button';
import { StoreDataState } from '../components/common/StoreDataState';
import { useCartStore } from '../stores/useCartStore';
import { useUiStore } from '../stores/useUiStore';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || undefined;
  const paypalToken = searchParams.get('token') || searchParams.get('paypal_order_id') || undefined;
  const clearCart = useCartStore((state) => state.clearCart);
  const addToast = useUiStore((state) => state.addToast);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ['order', orderId, sessionId, paypalToken],
    queryFn: () => publicApi.getOrderStatus(orderId || '', sessionId, paypalToken),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.payment_status === 'paid') return false;
      if (data.payment_method === 'bank_transfer') return 15000; // gentle refresh for bank transfer
      return 3000; // poll until paid for card/paypal
    },
  });
  const order = orderQuery.data;

  useEffect(() => {
    if (order?.payment_status === 'paid' && (sessionId || paypalToken)) {
      clearCart();
    }
  }, [clearCart, order?.payment_status, sessionId, paypalToken]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    addToast(`${label} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedField(null), 2500);
  };

  if (orderQuery.isLoading || orderQuery.error) {
    return <StoreDataState loading={orderQuery.isLoading} error={orderQuery.error} retry={() => orderQuery.refetch()} />;
  }

  if (!order) {
    return (
      <div className="py-24 text-center">
        <h2 className="font-display font-bold text-2xl text-dark">Order Confirmation</h2>
        <p className="text-gray-500 text-sm mt-2 mb-6">
          Your order has been recorded. Reference: {orderId}
        </p>
        <Link to="/shop">
          <Button variant="primary">Continue Browsing</Button>
        </Link>
      </div>
    );
  }

  const isBankTransferAwaiting =
    order.payment_method === 'bank_transfer' && order.payment_status === 'awaiting_payment';

  return (
    <div className="bg-[#FBFBFC] min-h-screen py-8 sm:py-12 text-[#111827]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Bifurcated Header Banner */}
        {isBankTransferAwaiting ? (
          <div className="bg-white rounded-2xl border border-amber-200/80 p-6 sm:p-8 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <Clock className="w-9 h-9 stroke-[2]" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Awaiting Bank Transfer Payment
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight mt-1 mb-2">
              Your order has been received and is awaiting payment.
            </h1>
            <p className="text-sm text-gray-600 max-w-lg mx-auto">
              Please transfer <strong className="text-gray-900 font-bold">{formatGBP(order.total_amount)}</strong> to the AZ Rayan Ltd business account below using your order number as reference.
            </p>
            <div className="mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono">
              <span className="text-gray-500">Order Number:</span>
              <strong className="text-dark font-bold text-sm">{order.order_number}</strong>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-9 h-9 stroke-[2]" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 mb-2">
              Order Confirmed & Paid
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight mt-1 mb-2">
              Thank you for your order. Your payment has been received.
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              We've dispatched your confirmation email to{' '}
              <strong className="text-gray-900">{order.email}</strong>.
            </p>
            <div className="mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono">
              <span className="text-gray-500">Order Reference:</span>
              <strong className="text-dark font-bold text-sm">{order.order_number}</strong>
            </div>
          </div>
        )}

        {/* Bank Transfer Instructions Box (Only for bank_transfer orders) */}
        {isBankTransferAwaiting && (
          <div className="bg-white rounded-2xl border border-amber-300/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-amber-100">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Barclays Bank UK Transfer Details
                </h2>
                <p className="text-xs text-gray-500">
                  Please use your UK banking app to complete the transfer.
                </p>
              </div>
            </div>

            {/* Account Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider block">
                    Account Name
                  </span>
                  <span className="text-sm font-bold text-gray-900">AZ Rayan Ltd</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('AZ Rayan Ltd', 'Account Name')}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer"
                  title="Copy Account Name"
                >
                  {copiedField === 'Account Name' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider block">
                    Bank
                  </span>
                  <span className="text-sm font-bold text-gray-900">Barclays Bank UK</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('Barclays Bank UK', 'Bank Name')}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer"
                  title="Copy Bank Name"
                >
                  {copiedField === 'Bank Name' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider block">
                    Sort Code
                  </span>
                  <span className="text-base font-mono font-extrabold text-gray-900">20-00-00</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('20-00-00', 'Sort Code')}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer"
                  title="Copy Sort Code"
                >
                  {copiedField === 'Sort Code' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider block">
                    Account Number
                  </span>
                  <span className="text-base font-mono font-extrabold text-gray-900">13894195</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('13894195', 'Account Number')}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer"
                  title="Copy Account Number"
                >
                  {copiedField === 'Account Number' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Crucial Reference Banner */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-amber-900 block">
                  Payment Reference (Crucial)
                </span>
                <span className="text-lg font-mono font-black text-gray-900">
                  {order.order_number}
                </span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Please use your order number as the payment reference so our team can match and dispatch your order.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(order.order_number, 'Payment Reference')}
                className="shrink-0 bg-white border-amber-300 text-amber-950 hover:bg-amber-100 gap-1.5"
              >
                {copiedField === 'Payment Reference' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Reference</span>
                  </>
                )}
              </Button>
            </div>

            {/* Note & Workflow */}
            <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl space-y-1.5">
              <p className="font-semibold text-gray-700">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Once you send the bank transfer, our store administrator manually verifies incoming Barclays transactions.</li>
                <li>Upon verification, your order will be marked as <strong className="text-gray-900">Paid</strong> and will move to <strong className="text-gray-900">Processing</strong>.</li>
                <li>Your items will be dispatched via Royal Mail Tracked with FREE delivery across the UK.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Order Details & Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 shadow-xs space-y-8">
          {/* Status Bar */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200 flex flex-col items-start gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            <div className="flex items-center gap-3">
              <PackageCheck className="w-5 h-5 text-brand-blue" />
              <div>
                <div className="text-xs font-bold text-dark uppercase tracking-wider">
                  Order Status: {order.status}
                </div>
                <div className="text-[11px] text-gray-500">
                  Payment: <strong className="capitalize text-gray-700">{order.payment_status.replace('_', ' ')}</strong> • Fulfilment: {order.fulfilment_status}
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-gray-500">{formatDateUK(order.created_at)}</span>
          </div>

          {/* Purchased DVD Titles */}
          <div>
            <h3 className="font-display font-bold text-sm text-dark uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
              Purchased Editions ({order.items.length})
            </h3>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {item.cover_image_url ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.product_title}
                        className="w-11 h-14 object-cover rounded-md border border-gray-200 shadow-2xs"
                      />
                    ) : (
                      <Disc className="w-7 h-7 text-gray-400" />
                    )}
                    <div className="truncate">
                      <div className="font-semibold text-xs text-dark truncate">
                        {item.product_title}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        SKU: {item.product_sku} • Qty {item.quantity}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono font-bold text-xs text-dark">
                    {formatGBP(item.total_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address & Payment Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
            <div className="text-xs space-y-1">
              <h4 className="font-display font-bold text-dark uppercase tracking-wider mb-2">
                Delivery Address
              </h4>
              <p className="font-semibold text-dark">{order.shipping_address.full_name}</p>
              <p className="text-gray-600">{order.shipping_address.address_line_1}</p>
              {order.shipping_address.address_line_2 && (
                <p className="text-gray-600">{order.shipping_address.address_line_2}</p>
              )}
              <p className="text-gray-600">
                {order.shipping_address.city}, {order.shipping_address.postcode}
              </p>
              <p className="text-gray-600">{order.shipping_address.country}</p>
              <div className="pt-2 flex items-center gap-1 text-emerald-700 font-medium">
                <Truck className="w-3.5 h-3.5" />
                <span>Free UK Delivery (Royal Mail Tracked)</span>
              </div>
            </div>

            <div className="text-xs space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="font-display font-bold text-dark uppercase tracking-wider mb-2">
                Payment Summary
              </h4>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatGBP(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-brand-red font-medium">
                  <span>Discount</span>
                  <span className="font-mono">- {formatGBP(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Delivery (UK)</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {order.shipping_amount === 0 ? 'FREE' : formatGBP(order.shipping_amount)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-dark text-sm pt-2 border-t border-gray-200">
                <span>Total Due</span>
                <span className="font-mono">{formatGBP(order.total_amount)}</span>
              </div>

              <div className="pt-3 border-t border-gray-200/80 text-[11px] text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium text-gray-800 capitalize">
                    {order.payment_method === 'bank_transfer'
                      ? 'Bank Transfer'
                      : order.payment_method === 'paypal'
                      ? 'PayPal'
                      : 'Card (Stripe)'}
                  </span>
                </div>
                {order.payment_reference && (
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span className="font-mono text-gray-700">{order.payment_reference}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 grid grid-cols-1 gap-3 border-t border-gray-100 min-[420px]:flex min-[420px]:flex-wrap min-[420px]:items-center min-[420px]:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="w-full gap-1.5 min-[420px]:w-auto"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </Button>

            <Link to="/shop" className="w-full min-[420px]:w-auto">
              <Button variant="primary" size="md" className="w-full min-[420px]:w-auto">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

