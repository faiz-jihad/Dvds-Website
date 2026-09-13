import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, PackageCheck, Truck, Check, Disc, Filter } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { Order, OrderStatus, FulfilmentStatus } from '../../types';
import { formatGBP, formatDateUK } from '../../lib/formatters';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useUiStore } from '../../stores/useUiStore';
import { AdminDataState } from '../../components/admin/AdminDataState';

export const AdminOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => adminApi.getOrders(),
    refetchInterval: 30_000,
  });
  const orders = ordersQuery.data || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setCarrier(order.shipping_carrier || '');
    setTrackingNumber(order.tracking_number || '');
    setInternalNote(order.internal_notes || '');
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, fulfilment: FulfilmentStatus) => {
    if (newStatus === 'dispatched' && (!carrier.trim() || !trackingNumber.trim())) {
      addToast('Carrier and tracking number are required before dispatch', 'error');
      return;
    }
    if (newStatus === 'cancelled' && internalNote.trim().length < 3) {
      addToast('Enter a cancellation reason in the internal note before cancelling.', 'error');
      return;
    }
    setIsUpdating(true);
    try {
      const updated = await adminApi.updateOrderStatus(orderId, newStatus, fulfilment, {
        carrier,
        trackingNumber,
        note: internalNote,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      setSelectedOrder(updated);
      addToast(`Order ${updated.order_number} marked as ${newStatus}`, 'success');
    } catch (updateError) {
      addToast(updateError instanceof Error ? updateError.message : 'Order could not be updated', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      o.order_number.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.shipping_address.full_name.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (ordersQuery.isLoading || ordersQuery.error) {
    return <AdminDataState loading={ordersQuery.isLoading} error={ordersQuery.error} onRetry={() => ordersQuery.refetch()} />;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
          ORDER MANAGEMENT
        </span>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight mt-0.5">
          Customer Orders & Fulfilment ({orders.length})
        </h1>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number, customer, email..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-brand-blue"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-brand-blue"
          >
            <option value="all">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
              <tr>
                <th className="p-3.5">Order No</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Customer & Destination</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Total</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/70">
                  <td className="p-3.5 font-mono font-bold text-dark">{o.order_number}</td>
                  <td className="p-3.5 text-gray-500">{formatDateUK(o.created_at)}</td>
                  <td className="p-3.5">
                    <div className="font-medium text-dark">{o.shipping_address.full_name}</div>
                    <div className="text-[11px] text-gray-400">
                      {o.shipping_address.city}, {o.shipping_address.postcode}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-gray-600">
                    {o.items.reduce((s, i) => s + i.quantity, 0)} discs
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 font-semibold text-[10px] uppercase">
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-sm font-semibold text-[10px] uppercase ${
                        o.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'dispatched'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-dark">
                    {formatGBP(o.total_amount)}
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openOrder(o)}
                      className="text-xs h-8 px-2.5"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Inspection Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Order: ${selectedOrder.order_number}`}
          description={`Placed on ${formatDateUK(selectedOrder.created_at)}`}
          maxWidth="xl"
        >
          <div className="space-y-6 text-xs">
            {/* Fulfilment Status Controls */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-gray-500 font-medium">Fulfilment Action:</span>
                <div className="font-bold text-dark text-sm uppercase mt-0.5">
                  Current: {selectedOrder.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedOrder.payment_status === 'paid' && selectedOrder.status === 'processing' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'dispatched', 'fulfilled')}
                    className="gap-1"
                    isLoading={isUpdating}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Mark Dispatched
                  </Button>
                )}
                {selectedOrder.status === 'dispatched' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered', 'fulfilled')}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    isLoading={isUpdating}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Delivered
                  </Button>
                )}
                {selectedOrder.payment_status !== 'paid' && <span className="rounded bg-amber-100 px-3 py-2 text-[10px] font-bold uppercase text-amber-800">Awaiting verified payment</span>}
                {selectedOrder.payment_status !== 'paid' && !['cancelled', 'delivered'].includes(selectedOrder.status) && (
                  <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled', 'unfulfilled')} isLoading={isUpdating}>Cancel order</Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-md border border-gray-200 p-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Shipping carrier</span>
                <input
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-xs outline-none focus:border-brand-blue"
                  placeholder="Royal Mail, DHL, DPD..."
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Tracking number *</span>
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 px-3 font-mono text-xs uppercase outline-none focus:border-brand-blue"
                  placeholder="Required before dispatch"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Internal fulfilment note</span>
                <textarea
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  className="min-h-20 w-full rounded-md border border-gray-300 p-3 text-xs outline-none focus:border-brand-blue"
                  placeholder="Packing exceptions, customer request, or operational note..."
                />
              </label>
            </div>

            {/* Customer & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 border border-gray-200 rounded-md bg-white">
                <span className="font-bold text-gray-500 uppercase text-[10px] block mb-1">
                  Customer Email
                </span>
                <span className="font-medium text-dark">{selectedOrder.email}</span>
                <span className="text-gray-400 block mt-1">Phone: {selectedOrder.shipping_address.phone || '—'}</span>
              </div>
              <div className="p-3 border border-gray-200 rounded-md bg-white">
                <span className="font-bold text-gray-500 uppercase text-[10px] block mb-1">
                  UK Delivery Address
                </span>
                <p className="font-semibold text-dark">{selectedOrder.shipping_address.full_name}</p>
                <p className="text-gray-600">{selectedOrder.shipping_address.address_line_1}</p>
                {selectedOrder.shipping_address.address_line_2 && (
                  <p className="text-gray-600">{selectedOrder.shipping_address.address_line_2}</p>
                )}
                <p className="text-gray-600 font-mono">
                  {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.postcode}
                </p>
              </div>
            </div>

            {/* Ordered Items */}
            <div>
              <h4 className="font-bold uppercase tracking-wider text-dark mb-2">
                Purchased DVDs ({selectedOrder.items.length})
              </h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-md">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item.cover_image_url && (
                        <img
                          src={item.cover_image_url}
                          alt={item.product_title}
                          className="w-8 aspect-dvd object-cover rounded-xs border border-gray-200"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-dark">{item.product_title}</div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          SKU: {item.product_sku} • Qty {item.quantity}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-dark">{formatGBP(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Total Breakdown */}
            <div className="p-3 bg-gray-50 rounded-md space-y-1.5 text-right font-mono">
              <div className="text-gray-500">Subtotal: {formatGBP(selectedOrder.subtotal)}</div>
              <div className="text-gray-500">
                Shipping: {selectedOrder.shipping_amount === 0 ? 'FREE' : formatGBP(selectedOrder.shipping_amount)}
              </div>
              <div className="text-dark font-bold text-sm pt-1 border-t border-gray-200">
                Total Paid: {formatGBP(selectedOrder.total_amount)}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
