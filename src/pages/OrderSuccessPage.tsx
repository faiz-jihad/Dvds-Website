import React, { useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, PackageCheck, Truck, ArrowRight, Disc, Printer } from 'lucide-react';
import { publicApi } from '../lib/publicApi';
import { formatGBP, formatDateUK } from '../lib/formatters';
import { Button } from '../components/common/Button';
import { StoreDataState } from '../components/common/StoreDataState';
import { useCartStore } from '../stores/useCartStore';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || undefined;
  const clearCart = useCartStore((state) => state.clearCart);
  const orderQuery = useQuery({
    queryKey: ['order', orderId, sessionId],
    queryFn: () => publicApi.getOrderStatus(orderId || '', sessionId),
    enabled: Boolean(orderId),
    refetchInterval: (query) => query.state.data?.payment_status === 'paid' ? false : 2000,
  });
  const order = orderQuery.data;

  useEffect(() => {
    if (order?.payment_status === 'paid' && sessionId) clearCart();
  }, [clearCart, order?.payment_status, sessionId]);

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

  return (
    <div className="bg-white min-h-screen py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Success Header */}
        <div className="text-center pb-8 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <CheckCircle2 className="w-9 h-9 stroke-[2]" />
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            Order Confirmed
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark tracking-tight mt-1 mb-2">
            Thank you for your order.
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            We've sent a detailed confirmation email and dispatch tracking link to{' '}
            <strong className="text-dark">{order.email}</strong>.
          </p>
          <div className="mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono">
            <span className="text-gray-500">Order Reference:</span>
            <strong className="text-dark font-bold text-sm">{order.order_number}</strong>
          </div>
        </div>

        {/* Order Details Breakdown */}
        <div className="py-8 space-y-8">
          {/* Status Bar */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-5 border border-gray-200 flex flex-col items-start gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            <div className="flex items-center gap-3">
              <PackageCheck className="w-5 h-5 text-brand-blue" />
              <div>
                <div className="text-xs font-bold text-dark uppercase tracking-wider">
                  Status: {order.status}
                </div>
                <div className="text-[11px] text-gray-500">
                  Fulfilment status: {order.fulfilment_status}
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
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.cover_image_url ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.product_title}
                        className="w-10 aspect-dvd object-cover rounded-xs border border-gray-200"
                      />
                    ) : (
                      <Disc className="w-6 h-6 text-gray-400" />
                    )}
                    <div className="truncate">
                      <div className="font-semibold text-xs text-dark truncate">
                        {item.product_title}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">
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

          {/* Shipping Address & Summary Table */}
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
            </div>

            <div className="text-xs space-y-2 bg-gray-50 p-4 rounded-md border border-gray-200">
              <h4 className="font-display font-bold text-dark uppercase tracking-wider mb-2">
                Payment Breakdown
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
                <span>Delivery</span>
                <span className="font-mono">
                  {order.shipping_amount === 0 ? 'FREE' : formatGBP(order.shipping_amount)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-dark text-sm pt-2 border-t border-gray-200">
                <span>Total Paid (GBP)</span>
                <span className="font-mono">{formatGBP(order.total_amount)}</span>
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
