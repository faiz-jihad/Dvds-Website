import { formatMoney, countryName } from '../../../shared/commerce.js';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package,
  ArrowRight,
  Disc,
  Printer,
  Copy,
  Check,
  Search,
  Truck,
  ExternalLink,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
import { publicApi } from '../../lib/publicApi';
import { formatGBP, formatDateUK } from '../../lib/formatters';
import { StoreDataState } from '../../components/common/StoreDataState';
import { Button } from '../../components/common/Button';
import { OrderReceiptModal } from '../../components/orders/OrderReceiptModal';
import { OrderStatusStepper } from '../../components/orders/OrderStatusStepper';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { Order } from '../../types';

type FilterTab = 'all' | 'in_progress' | 'delivered' | 'awaiting_payment';

export const OrdersPage: React.FC = () => {
  const ordersQuery = useQuery({
    queryKey: ['account', 'orders'],
    queryFn: () => publicApi.getMyOrders(),
    retry: false,
  });

  const addItem = useCartStore((state) => state.addItem);
  const addToast = useUiStore((state) => state.addToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [expandedStepperOrderId, setExpandedStepperOrderId] = useState<string | null>(null);

  const orders = ordersQuery.data || [];

  // Filter & Search computation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'in_progress') {
        if (!['pending', 'processing', 'dispatched'].includes(order.status)) return false;
      } else if (activeTab === 'delivered') {
        if (order.status !== 'delivered') return false;
      } else if (activeTab === 'awaiting_payment') {
        if (order.payment_status !== 'awaiting_payment') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesNumber = order.order_number?.toLowerCase().includes(q);
        const matchesTracking = order.tracking_number?.toLowerCase().includes(q);
        const matchesItem = (order.items || []).some(
          (item) =>
            item.product_title?.toLowerCase().includes(q) ||
            item.product_sku?.toLowerCase().includes(q)
        );
        const matchesName = order.shipping_address?.full_name?.toLowerCase().includes(q);
        return matchesNumber || matchesTracking || matchesItem || matchesName;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Quick stats
  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((o) => ['pending', 'processing', 'dispatched'].includes(o.status)).length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    return { total, active, delivered };
  }, [orders]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    addToast(`${label} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleReorder = (order: Order) => {
    const items = order.items || [];
    if (items.length === 0) {
      addToast('No items available to reorder.', 'error');
      return;
    }

    items.forEach((item) => {
      addItem({
        id: item.product_id || item.id,
        sku: item.product_sku || 'ZDV-DVD',
        title: item.product_title,
        slug: (item as any).slug || 'dvd-edition',
        description: item.product_title,
        short_description: null,
        category_id: null,
        price: item.unit_price,
        compare_at_price: null,
        format: 'DVD',
        condition: 'New',
        release_year: 2024,
        runtime_minutes: 120,
        age_rating: '15',
        region_code: '2',
        language: 'English',
        subtitles: 'English SDH',
        stock_quantity: 10,
        cover_image_url: item.cover_image_url || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
        status: 'active',
        is_featured: false,
        is_new_release: false,
        is_best_seller: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, item.quantity || 1);
    });

    addToast(`Added ${items.length} titles from ${order.order_number} to your basket!`, 'success');
  };

  if (ordersQuery.isLoading || ordersQuery.error) {
    return (
      <StoreDataState
        loading={ordersQuery.isLoading}
        error={ordersQuery.error}
        retry={() => ordersQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Summary stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-dark">Order History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Track deliveries, print official receipts, and reorder previous physical media purchases.
          </p>
        </div>

        {/* Quick KPI pills */}
        {orders.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
              Total: {stats.total}
            </span>
            {stats.active > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-brand-blue font-semibold border border-blue-200">
                In Transit: {stats.active}
              </span>
            )}
            {stats.delivered > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                Delivered: {stats.delivered}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-dark shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-dark'
              }`}
            >
              All Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'in_progress'
                  ? 'bg-white text-dark shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-dark'
              }`}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivered')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'delivered'
                  ? 'bg-white text-dark shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-dark'
              }`}
            >
              Delivered
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('awaiting_payment')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'awaiting_payment'
                  ? 'bg-white text-dark shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-dark'
              }`}
            >
              Awaiting Payment
            </button>
          </div>

          {/* Search Input */}
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by order # or DVD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
        </div>
      )}

      {/* Orders List / Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center bg-gray-50/50">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center mx-auto mb-3">
            <Package className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-dark">
            {orders.length === 0 ? 'No orders placed yet' : 'No matching orders found'}
          </p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            {orders.length === 0
              ? 'When you order DVDs from our archival store, tracking references and tax receipts will appear here.'
              : 'Try clearing your search or switching filter tabs to see other purchases.'}
          </p>
          <div className="mt-5">
            {orders.length === 0 ? (
              <Link to="/shop">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Disc className="h-3.5 w-3.5" />
                  <span>Browse DVD Catalogue</span>
                </Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const items = order.items || [];
            const isDelivered = order.status === 'delivered';
            const isDispatched = order.status === 'dispatched';
            const isAwaitingPayment =
              order.payment_method === 'bank_transfer' && order.payment_status === 'awaiting_payment';

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs transition-all hover:border-gray-300"
              >
                {/* Order Top Bar: Reference, Date, Status Badges */}
                <div className="bg-gray-50/70 px-5 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-extrabold text-sm text-dark tracking-tight">
                      {order.order_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.order_number, order.order_number)}
                      className="text-gray-400 hover:text-dark transition-colors"
                      title="Copy order number"
                      aria-label="Copy order number"
                    >
                      {copiedId === order.order_number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDateUK(order.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isDispatched
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isDelivered && <CheckCircle2 className="w-3 h-3" />}
                      {isDispatched && <Truck className="w-3 h-3" />}
                      {order.status}
                    </span>

                    {/* Payment Badge */}
                    {isAwaitingPayment ? (
                      <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Awaiting Payment
                      </span>
                    ) : order.payment_status === 'paid' ? (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-sm bg-gray-100 text-gray-700">
                        Paid
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Main Body: Line Items & Logistics */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Items Preview */}
                  <div className="lg:col-span-8 space-y-3">
                    <div className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <div key={item.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                          <div className="w-11 h-14 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                            {item.cover_image_url ? (
                              <img
                                src={item.cover_image_url}
                                alt={item.product_title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Disc className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-bold text-xs text-dark truncate">
                              {item.product_title}
                            </h5>
                            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                              {item.product_sku || 'ZDV-DVD'} • Qty: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-dark">
                              {formatMoney(item.total_price || item.unit_price * item.quantity, order.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tracking Section if dispatched */}
                    {order.tracking_number && (
                      <div className="mt-3 p-3 rounded-lg bg-blue-50/50 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-brand-blue shrink-0" />
                          <div>
                            <span className="text-gray-500 text-[11px] block">
                              {order.shipping_carrier || 'Royal Mail Tracked 48'}:
                            </span>
                            <span className="font-mono font-extrabold text-dark tracking-wide">
                              {order.tracking_number}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(order.tracking_number!, 'Tracking Number')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-dark px-2 py-1 bg-white rounded border border-gray-200 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                          <a
                            href={`https://www.royalmail.com/track-your-item#/tracking-results/${order.tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue hover:underline px-2 py-1 bg-white rounded border border-brand-blue/30 transition-colors"
                          >
                            <span>Track on Royal Mail</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Address, Financial Total & Actions */}
                  <div className="lg:col-span-4 lg:border-l lg:border-gray-100 lg:pl-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-2 text-xs">
                      {/* Destination snippet */}
                      <div className="text-gray-500">
                        <span className="font-semibold text-gray-700 block mb-0.5">Dispatched To:</span>
                        <p className="font-medium text-dark">{order.shipping_address?.full_name}</p>
                        <p>{order.shipping_address?.city}, {order.shipping_address?.postcode}</p>
                      </div>

                      {/* Total */}
                      <div className="pt-2 border-t border-gray-100">
                        <span className="text-[11px] text-gray-500 block">Total Amount Paid</span>
                        <span className="font-mono font-black text-lg text-dark">
                          {formatMoney(order.total_amount, order.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      {/* Track Status Stepper Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStepperOrderId((prev) => (prev === order.id ? null : order.id))
                        }
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-50 text-xs font-semibold text-brand-blue transition-colors cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>
                          {expandedStepperOrderId === order.id
                            ? 'Hide Progress'
                            : 'Track Status Progress'}
                        </span>
                      </button>

                      {/* Print Receipt Action */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedReceiptOrder(order)}
                        className="w-full gap-1.5 text-xs justify-center"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Receipt</span>
                      </Button>

                      {/* View Receipt / Tracking Link */}
                      <Link
                        to={`/order-success/${order.id}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-dark transition-colors"
                      >
                        <span>View Tracking & Receipt</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {/* Buy Again Action */}
                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        className="w-full inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-brand-blue hover:underline pt-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Buy these items again</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Order Status Stepper */}
                {expandedStepperOrderId === order.id && (
                  <div className="px-5 pb-5 pt-3 border-t border-gray-100 bg-gray-50/50">
                    <OrderStatusStepper order={order} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Print Receipt Modal */}
      <OrderReceiptModal
        isOpen={Boolean(selectedReceiptOrder)}
        onClose={() => setSelectedReceiptOrder(null)}
        order={selectedReceiptOrder}
      />
    </div>
  );
};
