import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Disc } from 'lucide-react';
import { publicApi } from '../../lib/publicApi';
import { formatGBP, formatDateUK } from '../../lib/formatters';
import { StoreDataState } from '../../components/common/StoreDataState';

export const OrdersPage: React.FC = () => {
  const ordersQuery = useQuery({ queryKey: ['account', 'orders'], queryFn: () => publicApi.getMyOrders() });
  const orders = ordersQuery.data || [];
  if (ordersQuery.isLoading || ordersQuery.error) return <StoreDataState loading={ordersQuery.isLoading} error={ordersQuery.error} retry={() => ordersQuery.refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-lg text-dark">Order History</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          View all your previous purchases, Royal Mail tracking numbers, and order receipts.
        </p>
      </div>

      <div className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden bg-white">
        {orders.map((order) => (
          <div key={order.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm text-dark">{order.order_number}</span>
                <span
                  className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-sm ${
                    order.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'dispatched'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Placed on {formatDateUK(order.created_at)} • {order.items.length} titles
              </p>
              <div className="text-xs font-mono font-semibold text-dark">
                Total: {formatGBP(order.total_amount)}
              </div>
            </div>

            <Link
              to={`/order-success/${order.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
            >
              <span>View Full Receipt & Tracking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
