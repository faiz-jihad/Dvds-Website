import { formatMoney, countryName } from '../../../shared/commerce.js';
import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Eye,
  PackageCheck,
  Truck,
  Check,
  Disc,
  Filter,
  Building2,
  CreditCard,
  AlertCircle,
  Paperclip,
  FileText,
  Download,
  ZoomIn,
  Copy,
  Clock,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  Save,
  Package,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { Order, OrderStatus, FulfilmentStatus } from '../../types';
import { formatGBP, formatDateUK, cn } from '../../lib/formatters';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useUiStore } from '../../stores/useUiStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { useAdminAuth } from '../../auth/AdminAuth';

interface PaymentProofInfo {
  dataUrl: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
}

function getOrderProof(order?: Order | null): PaymentProofInfo | null {
  if (!order) return null;
  if (order.bank_details?.payment_proof_url) {
    return {
      dataUrl: order.bank_details.payment_proof_url,
      fileName: order.bank_details.payment_proof_filename || 'payment_proof.jpg',
      fileSize: order.bank_details.payment_proof_filesize || undefined,
      uploadedAt: order.bank_details.payment_proof_uploaded_at || undefined,
    };
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw =
        localStorage.getItem(`order_proof_${order.id}`) ||
        localStorage.getItem(`order_proof_${order.order_number}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.dataUrl) {
          return {
            dataUrl: parsed.dataUrl,
            fileName: parsed.fileName || 'payment_proof.jpg',
            fileSize: parsed.fileSize,
            uploadedAt: parsed.uploadedAt,
          };
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function getOrderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'delivered':
      return {
        label: 'Delivered',
        dot: 'bg-brand-blue',
        badge: 'bg-blue-50 text-brand-blue border-blue-200',
      };
    case 'dispatched':
      return {
        label: 'Dispatched',
        dot: 'bg-brand-blue',
        badge: 'bg-blue-50 text-brand-blue border-blue-200',
      };
    case 'processing':
      return {
        label: 'Processing',
        dot: 'bg-brand-blue',
        badge: 'bg-blue-50 text-brand-blue border-blue-200',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        dot: 'bg-brand-red',
        badge: 'bg-brand-red-soft text-brand-red border-brand-red/30',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        dot: 'bg-brand-red',
        badge: 'bg-brand-red-soft text-brand-red border-brand-red/30',
      };
    default:
      return {
        label: status ? status.replace('_', ' ').toUpperCase() : 'PENDING',
        dot: 'bg-gray-400',
        badge: 'bg-gray-100 text-gray-700 border-gray-200',
      };
  }
}

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return {
        label: 'PAID',
        dot: 'bg-brand-blue',
        badge: 'bg-blue-50 text-brand-blue border-blue-200',
      };
    case 'awaiting_payment':
      return {
        label: 'AWAITING PAYMENT',
        dot: 'bg-brand-red',
        badge: 'bg-brand-red-soft text-brand-red border-brand-red/30',
      };
    case 'failed':
      return {
        label: 'FAILED',
        dot: 'bg-brand-red',
        badge: 'bg-brand-red-soft text-brand-red border-brand-red/30',
      };
    default:
      return {
        label: status ? status.replace('_', ' ').toUpperCase() : 'UNPAID',
        dot: 'bg-gray-400',
        badge: 'bg-gray-100 text-gray-700 border-gray-200',
      };
  }
}

const CARRIER_PRESETS = ['Royal Mail', 'DHL Express', 'DPD UK', 'Evri', 'FedEx'];

export const AdminOrders: React.FC = () => {
  const { user } = useAdminAuth();
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => adminApi.getOrders(),
    refetchInterval: 30_000,
  });
  const orders = ordersQuery.data || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Bank Transfer verification & proof lightbox states
  const [viewingProof, setViewingProof] = useState<{
    fileName: string;
    dataUrl: string;
    fileSize?: number;
    uploadedAt?: string;
    orderNumber: string;
    order?: Order;
  } | null>(null);

  useEffect(() => {
    setSelectedOrder((current) => current ? ordersQuery.data?.find((order) => order.id === current.id) || current : null);
  }, [ordersQuery.data]);

  // Bank Transfer manual confirmation states
  const [confirmingBankOrder, setConfirmingBankOrder] = useState<Order | null>(null);
  const [bankConfirmNote, setBankConfirmNote] = useState('');
  const [isConfirmingBank, setIsConfirmingBank] = useState(false);

  // Cancellation & Fake / Invalid Receipt Rejection states
  const [cancellingOrder, setCancellingOrder] = useState<{
    order: Order;
    isFakeProof?: boolean;
  } | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState('Fake / fraudulent transfer receipt uploaded');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const openCancelModal = (order: Order, isFakeProof = false) => {
    setCancellingOrder({ order, isFakeProof });
    setCancelReasonPreset(
      isFakeProof
        ? 'Fake / fraudulent transfer receipt uploaded'
        : 'Order cancelled by store administrator'
    );
    setCustomCancelReason('');
  };

  const handleExecuteCancel = async () => {
    if (!cancellingOrder) return;
    const finalReason =
      cancelReasonPreset === 'other'
        ? customCancelReason.trim()
        : customCancelReason.trim()
        ? `${cancelReasonPreset} (${customCancelReason.trim()})`
        : cancelReasonPreset;

    if (finalReason.length < 3) {
      addToast('Please enter a cancellation reason of at least 3 characters', 'error');
      return;
    }

    setIsCancelling(true);
    try {
      const updated = await adminApi.cancelOrder(cancellingOrder.order.id, finalReason, true);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['order'] });
      await queryClient.invalidateQueries({ queryKey: ['my-orders'] });

      // Clean up localStorage proof key if fraudulent
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(`order_proof_${cancellingOrder.order.id}`);
          localStorage.removeItem(`order_proof_${cancellingOrder.order.order_number}`);
        }
      } catch {}

      if (selectedOrder?.id === updated.id) {
        setSelectedOrder(updated);
      }
      setCancellingOrder(null);
      setCustomCancelReason('');
      setViewingProof(null);
      setConfirmingBankOrder(null);

      addToast(`Order ${updated.order_number} cancelled & marked as failed. Stock returned to inventory.`, 'success');

      useNotificationStore.getState().addNotification({
        target: 'customer',
        type: 'order',
        title: 'Order Cancelled',
        message: `Order #${updated.order_number} has been cancelled (${finalReason}). Any reserved stock has been released.`,
        link: '/account/orders',
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to cancel order', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const addToast = useUiStore((state) => state.addToast);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setCarrier(order.shipping_carrier || '');
    setTrackingNumber(order.tracking_number || '');
    setInternalNote(order.internal_notes || '');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard`, 'success');
  };

  const handleConfirmBankPayment = async () => {
    if (!confirmingBankOrder) return;
    setIsConfirmingBank(true);
    try {
      const updated = await adminApi.confirmBankTransferPayment(confirmingBankOrder.id, bankConfirmNote);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['order'] });
      await queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      if (selectedOrder?.id === updated.id) {
        setSelectedOrder(updated);
      }
      setConfirmingBankOrder(null);
      setBankConfirmNote('');
      addToast(`Payment confirmed for order ${updated.order_number}! Status updated to Processing.`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to confirm bank transfer payment', 'error');
    } finally {
      setIsConfirmingBank(false);
    }
  };

  const handleSaveFulfilmentDetails = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const updated = await adminApi.updateOrderStatus(
        selectedOrder.id,
        selectedOrder.status,
        selectedOrder.fulfilment_status || 'unfulfilled',
        {
          carrier,
          trackingNumber,
          note: internalNote,
        }
      );
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['order'] });
      setSelectedOrder(updated);
      addToast('Fulfilment details saved successfully', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save fulfilment details', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, fulfilment: FulfilmentStatus) => {
    if (newStatus === 'dispatched' && (!carrier.trim() || !trackingNumber.trim())) {
      addToast('Carrier and tracking number are required before dispatch', 'error');
      return;
    }
    if (newStatus === 'cancelled') {
      const ord = selectedOrder || orders.find((o) => o.id === orderId);
      if (ord) {
        openCancelModal(ord, false);
      }
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
      await queryClient.invalidateQueries({ queryKey: ['order'] });
      await queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setSelectedOrder(updated);
      addToast(`Order ${updated.order_number} marked as ${newStatus}`, 'success');

      // Dispatch real-time notifications for both customer and admin
      useNotificationStore.getState().addNotification({
        target: 'customer',
        type: 'order',
        title: 'Order Status Updated',
        message: `Order #${updated.order_number} status is now ${newStatus.toUpperCase()} (${fulfilment})${trackingNumber ? ` • Tracking: ${trackingNumber}` : ''}.`,
        link: '/account/orders',
      });
      useNotificationStore.getState().addNotification(
        {
          target: 'admin',
          type: 'order',
          title: 'Order Updated',
          message: `Order #${updated.order_number} changed to ${newStatus.toUpperCase()} (${fulfilment}).`,
          link: '/admin/orders',
        },
        { showToast: false }
      );
    } catch (updateError) {
      addToast(updateError instanceof Error ? updateError.message : 'Order could not be updated', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Metrics overview counts
  const awaitingPaymentOrders = orders.filter((o) => o.payment_status === 'awaiting_payment');
  const processingOrders = orders.filter((o) => o.status === 'processing');
  const dispatchedOrders = orders.filter((o) => o.status === 'dispatched');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      o.order_number.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.shipping_address?.full_name?.toLowerCase().includes(q) ||
      o.shipping_address?.city?.toLowerCase().includes(q) ||
      o.shipping_address?.postcode?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || o.payment_status === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems: paginatedOrders,
    totalItems: totalOrdersCount,
  } = useAdminPagination(filteredOrders, 25);

  if (ordersQuery.isLoading || ordersQuery.error) {
    return <AdminDataState loading={ordersQuery.isLoading} error={ordersQuery.error} onRetry={() => ordersQuery.refetch()} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-brand-blue">
            DISPATCH &amp; REVENUE OPERATIONS
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight mt-0.5">
            Customer Orders &amp; Fulfilment
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={ordersQuery.isFetching ? 'animate-spin text-brand-blue' : 'text-gray-500'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => { setStatusFilter('all'); setPaymentFilter('all'); }}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs',
            statusFilter === 'all' && paymentFilter === 'all'
              ? 'bg-blue-50/40 border-brand-blue/40 ring-2 ring-brand-blue/10'
              : 'bg-white border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">All Orders</span>
            <Layers size={16} className="text-brand-blue" />
          </div>
          <p className="text-2xl font-extrabold text-dark mt-2 font-display">{orders.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Total recorded orders</p>
        </button>

        <button
          type="button"
          onClick={() => { setPaymentFilter('awaiting_payment'); setStatusFilter('all'); }}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs',
            paymentFilter === 'awaiting_payment'
              ? 'bg-brand-red-soft/40 border-brand-red/40 ring-2 ring-brand-red/10'
              : 'bg-white border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-red uppercase tracking-wider">Awaiting Payment</span>
            <AlertCircle size={16} className="text-brand-red" />
          </div>
          <p className="text-2xl font-extrabold text-brand-red mt-2 font-display">{awaitingPaymentOrders.length}</p>
          <p className="text-[11px] text-brand-red/80 mt-0.5">Bank transfers to verify</p>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('processing'); setPaymentFilter('all'); }}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs',
            statusFilter === 'processing'
              ? 'bg-indigo-50/40 border-indigo-400/50 ring-2 ring-indigo-400/10'
              : 'bg-white border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Ready to Dispatch</span>
            <PackageCheck size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-950 mt-2 font-display">{processingOrders.length}</p>
          <p className="text-[11px] text-indigo-700 mt-0.5">Paid &amp; packing</p>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('delivered'); setPaymentFilter('all'); }}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs',
            statusFilter === 'delivered'
              ? 'bg-emerald-50/40 border-emerald-400/50 ring-2 ring-emerald-400/10'
              : 'bg-white border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Delivered</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-950 mt-2 font-display">{deliveredOrders.length}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Successfully fulfilled</p>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order reference, customer, city, postcode..."
            className="w-full h-10 pl-10 pr-8 text-xs bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-blue focus:bg-white transition-all text-dark placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-dark"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          {/* Fulfilment Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Fulfilment:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-blue font-semibold text-dark cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="processing">Processing</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-blue font-semibold text-dark cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="awaiting_payment">Awaiting Payment</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {(statusFilter !== 'all' || paymentFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setPaymentFilter('all');
                setSearchQuery('');
              }}
              className="h-9 px-3 text-xs text-brand-blue hover:text-dark font-bold underline transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-xs border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 select-none">
              <tr>
                <th className="py-3.5 px-4">Order Ref</th>
                <th className="py-3.5 px-4">Date Placed</th>
                <th className="py-3.5 px-4">Customer &amp; Destination</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Fulfilment</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Package size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-bold text-dark text-sm">No orders match your criteria</p>
                    <p className="text-xs mt-0.5">Try searching with a different keyword or resetting your filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => {
                  const proof = getOrderProof(o);
                  const totalDiscs = o.items.reduce((sum, item) => sum + item.quantity, 0);
                  const statusBadge = getOrderStatusBadge(o.status);
                  const payBadge = getPaymentStatusBadge(o.payment_status);
                    return (
                    <tr
                      key={o.id}
                      onClick={() => openOrder(o)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Order No & Reference */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-dark group-hover:text-brand-blue transition-colors">
                          <Package size={13} className="text-gray-400 group-hover:text-brand-blue shrink-0" />
                          <span>{o.order_number}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                          {o.shipping_carrier && o.tracking_number ? (
                            <>
                              <Truck size={10} className="text-gray-400 shrink-0" />
                              <span className="truncate max-w-[130px]">{o.shipping_carrier}: {o.tracking_number}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">UK Standard</span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 align-middle text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-dark">
                          <Calendar size={12} className="text-gray-400 shrink-0" />
                          <span>{formatDateUK(o.created_at)}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block mt-0.5 pl-4">
                          {new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Customer & Destination */}
                      <td className="py-4 px-4 align-middle">
                        <div className="font-semibold text-dark text-xs truncate max-w-[190px]">
                          {o.shipping_address.full_name || o.email}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-[190px]">
                          <MapPin size={11} className="text-gray-400 shrink-0" />
                          <span>
                            {o.shipping_address.city || 'United Kingdom'}, {o.shipping_address.postcode || ''}
                          </span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200/60 font-mono text-[11px] font-bold text-gray-700">
                          <Disc size={12} className="text-brand-blue shrink-0" />
                          <span>
                            {totalDiscs} {totalDiscs === 1 ? 'disc' : 'discs'}
                          </span>
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                                payBadge.badge
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full', payBadge.dot)} />
                              {payBadge.label}
                            </span>
                            {proof && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingProof({
                                    fileName: proof.fileName || 'payment_proof.jpg',
                                    dataUrl: proof.dataUrl,
                                    fileSize: proof.fileSize,
                                    uploadedAt: proof.uploadedAt,
                                    orderNumber: o.order_number,
                                    order: o,
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-brand-blue hover:text-white text-brand-blue border border-blue-200 text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                                title="Inspect payment receipt"
                              >
                                <Paperclip size={10} />
                                <span>Proof</span>
                              </button>
                            )}
                          </div>

                          <div className="text-[11px] text-gray-500 flex items-center gap-1">
                            {o.payment_method === 'bank_transfer' ? (
                              <Building2 size={11} className="text-gray-400 shrink-0" />
                            ) : (
                              <CreditCard size={11} className="text-gray-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[140px]">
                              {o.payment_method === 'bank_transfer'
                                ? 'Bank Transfer'
                                : o.payment_method === 'paypal'
                                ? 'PayPal'
                                : 'Card / Apple Pay'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Fulfilment Status */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs',
                            statusBadge.badge
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusBadge.dot)} />
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-4 align-middle text-right font-mono font-extrabold text-sm text-dark whitespace-nowrap">
                        {formatMoney(o.total_amount, o.currency)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrder(o);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-brand-blue hover:text-white hover:border-brand-blue text-dark text-xs font-semibold shadow-2xs transition-all group-hover:border-brand-blue group-hover:text-brand-blue cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View</span>
                          <ChevronRight size={12} className="opacity-60" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalOrdersCount}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="orders"
        />
      </div>

      {/* Order Inspection Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.order_number}`}
          description={`Placed on ${formatDateUK(selectedOrder.created_at)}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 text-xs pb-2">
            {/* Header Highlights Bar */}
            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedOrder.order_number, 'Order number')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-dark font-mono text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="Click to copy order reference"
                >
                  <Copy size={12} className="text-gray-400" />
                  <span>{selectedOrder.order_number}</span>
                </button>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 font-medium flex items-center gap-1">
                  <Clock size={12} className="text-gray-400" />
                  {formatDateUK(selectedOrder.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Payment Badge */}
                {(() => {
                  const pb = getPaymentStatusBadge(selectedOrder.payment_status);
                  return (
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase', pb.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', pb.dot)} />
                      {pb.label}
                    </span>
                  );
                })()}

                {/* Fulfilment Badge */}
                {(() => {
                  const sb = getOrderStatusBadge(selectedOrder.status);
                  return (
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase', sb.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', sb.dot)} />
                      {sb.label}
                    </span>
                  );
                })()}

                {/* Total */}
                <span className="font-mono font-extrabold text-sm text-dark ml-2">
                  {formatMoney(selectedOrder.total_amount, selectedOrder.currency)}
                </span>
              </div>
            </div>

            {/* Visual Order Lifecycle Stepper */}
            <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Order Lifecycle Stepper
              </p>
              <div className="grid grid-cols-4 gap-2 relative">
                {/* Step 1: Placed */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-xs shadow-xs mb-1.5">
                    <Check size={14} />
                  </div>
                  <span className="font-bold text-dark text-[11px]">Placed</span>
                  <span className="text-[10px] text-gray-400">{formatDateUK(selectedOrder.created_at)}</span>
                </div>

                {/* Step 2: Payment */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xs mb-1.5 transition-colors',
                      selectedOrder.payment_status === 'paid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    )}
                  >
                    {selectedOrder.payment_status === 'paid' ? <Check size={14} /> : <AlertCircle size={14} />}
                  </div>
                  <span className="font-bold text-dark text-[11px]">Payment</span>
                  <span className="text-[10px] text-gray-400 capitalize">{selectedOrder.payment_status.replace('_', ' ')}</span>
                </div>

                {/* Step 3: Dispatched */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xs mb-1.5 transition-colors',
                      ['dispatched', 'delivered'].includes(selectedOrder.status)
                        ? 'bg-brand-blue text-white'
                        : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    <Truck size={14} />
                  </div>
                  <span className="font-bold text-dark text-[11px]">Dispatched</span>
                  <span className="text-[10px] text-gray-400">
                    {selectedOrder.shipping_carrier || (selectedOrder.status === 'processing' ? 'Packing' : 'Pending')}
                  </span>
                </div>

                {/* Step 4: Delivered */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xs mb-1.5 transition-colors',
                      selectedOrder.status === 'delivered'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="font-bold text-dark text-[11px]">Delivered</span>
                  <span className="text-[10px] text-gray-400">
                    {selectedOrder.status === 'delivered' ? 'Completed' : 'Upcoming'}
                  </span>
                </div>
              </div>
            </div>

            {selectedOrder.payment_review_required && (
              <div role="alert" className="rounded-2xl border border-brand-red/30 bg-brand-red-soft p-4 text-xs text-brand-red flex items-start gap-2.5 shadow-2xs">
                <AlertCircle size={18} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Payment Review Required</strong>
                  <span>Payment arrived after cancellation and stock was released. Verify availability with the customer or issue a refund in the payment provider dashboard before fulfilment.</span>
                </div>
              </div>
            )}

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT COLUMN: Fulfilment Tracking & Items List (Span 7) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Fulfilment Status & Actions Card */}
                <div className="p-4 sm:p-5 bg-white border border-gray-200 rounded-2xl space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-blue" />
                      <span className="font-bold text-dark text-xs uppercase tracking-wide">
                        Fulfilment Operations
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {selectedOrder.payment_status === 'paid' && !selectedOrder.payment_review_required && selectedOrder.status === 'processing' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'dispatched', 'fulfilled')}
                          className="gap-1 text-xs font-bold shadow-xs"
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
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold shadow-xs"
                          isLoading={isUpdating}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark Delivered
                        </Button>
                      )}

                      {!['paid', 'partially_refunded', 'refunded'].includes(selectedOrder.payment_status) && !['cancelled', 'delivered', 'refunded'].includes(selectedOrder.status) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled', 'unfulfilled')}
                          isLoading={isUpdating}
                          className="text-xs"
                        >
                          Cancel order
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Consignment Carrier & Tracking Form */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          Shipping Carrier
                        </label>
                        <input
                          type="text"
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          placeholder="e.g. Royal Mail, DHL, DPD"
                          className="w-full h-9 px-3 rounded-xl border border-gray-300 text-xs font-medium focus:border-brand-blue outline-none transition-colors"
                        />
                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {CARRIER_PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCarrier(p)}
                              className={cn(
                                'text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer',
                                carrier === p
                                  ? 'bg-brand-blue text-white border-brand-blue font-bold'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Tracking Number *
                          </label>
                          {trackingNumber && carrier.toLowerCase().includes('royal mail') && (
                            <a
                              href={`https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-brand-blue hover:underline flex items-center gap-0.5 font-semibold"
                            >
                              <span>Track item</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Consignment tracking ID"
                          className="w-full h-9 px-3 rounded-xl border border-gray-300 font-mono text-xs uppercase focus:border-brand-blue outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Internal Fulfilment Note
                      </label>
                      <textarea
                        rows={2}
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        placeholder="Packing exceptions, customer instructions, or operational note..."
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:border-brand-blue outline-none transition-colors resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSaveFulfilmentDetails}
                        isLoading={isUpdating}
                        className="gap-1.5 text-xs font-semibold shadow-2xs"
                      >
                        <Save size={13} />
                        Save Fulfilment Details
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Purchased Items List Card */}
                <div className="p-4 sm:p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Disc className="w-4 h-4 text-brand-blue" />
                      <span className="font-bold text-dark text-xs uppercase tracking-wide">
                        Purchased DVDs ({selectedOrder.items.length})
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-gray-500">
                      {selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)} total discs
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.cover_image_url ? (
                            <img
                              src={item.cover_image_url}
                              alt={item.product_title}
                              className="w-10 h-14 object-cover rounded-lg border border-gray-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                              <Disc size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h5 className="font-bold text-dark text-xs truncate" title={item.product_title}>
                              {item.product_title}
                            </h5>
                            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                              Qty: <strong className="text-dark">{item.quantity}</strong> &bull; {formatMoney(item.unit_price, selectedOrder.currency)} each
                            </p>
                            {item.product_sku && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                SKU: {item.product_sku}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-dark text-xs shrink-0">
                          {formatMoney(item.total_price, selectedOrder.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer & Destination Card */}
                <div className="p-4 sm:p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-blue" />
                      <span className="font-bold text-dark text-xs uppercase tracking-wide">
                        Customer &amp; Delivery Destination
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${selectedOrder.shipping_address.full_name}\n${selectedOrder.shipping_address.address_line_1}\n${selectedOrder.shipping_address.address_line_2 ? selectedOrder.shipping_address.address_line_2 + '\n' : ''}${selectedOrder.shipping_address.city}, ${selectedOrder.shipping_address.postcode}`,
                          'Delivery address'
                        )
                      }
                      className="text-[10px] text-brand-blue hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Copy size={11} /> Copy Address
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-150">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Customer Details</span>
                      <p className="font-semibold text-dark">{selectedOrder.shipping_address.full_name}</p>
                      <a href={`mailto:${selectedOrder.email}`} className="text-brand-blue hover:underline flex items-center gap-1 mt-0.5 truncate">
                        <Mail size={11} className="shrink-0" /> {selectedOrder.email}
                      </a>
                      {selectedOrder.shipping_address.phone && (
                        <p className="text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone size={11} className="shrink-0" /> {selectedOrder.shipping_address.phone}
                        </p>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-150 font-medium">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">UK Delivery Address</span>
                      <p className="text-dark">{selectedOrder.shipping_address.address_line_1}</p>
                      {selectedOrder.shipping_address.address_line_2 && (
                        <p className="text-dark">{selectedOrder.shipping_address.address_line_2}</p>
                      )}
                      <p className="font-mono text-dark font-semibold">
                        {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.postcode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Payment, Bank Verification & Financials (Span 5) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Direct Bank Transfer & Proof Verification (if bank transfer) */}
                {selectedOrder.payment_method === 'bank_transfer' && (() => {
                  const proof = getOrderProof(selectedOrder);
                  const isAwaiting = selectedOrder.payment_status === 'awaiting_payment';

                  return (
                    <div className={cn(
                      'p-4 sm:p-5 rounded-2xl border space-y-3.5 shadow-xs',
                      isAwaiting ? 'bg-brand-red-soft/30 border-brand-red/30' : 'bg-blue-50/30 border-blue-200'
                    )}>
                      <div className="flex items-center justify-between pb-2 border-b border-gray-200/70">
                        <div className="flex items-center gap-2">
                          <Building2 className={cn('w-4 h-4', isAwaiting ? 'text-brand-red' : 'text-brand-blue')} />
                          <span className="font-bold text-dark text-xs uppercase tracking-wide">
                            Bank Transfer Proof
                          </span>
                        </div>
                        {proof ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-brand-blue text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Paperclip size={10} /> Proof Available
                          </span>
                        ) : isAwaiting ? (
                          <span className="inline-flex items-center gap-1 bg-brand-red-soft text-brand-red border border-brand-red/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <AlertCircle size={10} /> Awaiting Proof
                          </span>
                        ) : null}
                      </div>

                      {/* Bank Details Grid */}
                      {selectedOrder.bank_details && (
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/90 p-2.5 rounded-xl border border-gray-200">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Bank Name</span>
                            <span className="font-semibold text-dark truncate block">{selectedOrder.bank_details.bank_name || 'Barclays'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Account Name</span>
                            <span className="font-semibold text-dark truncate block">{selectedOrder.bank_details.bank_account_name || 'AZ Rayan Ltd'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Sort Code</span>
                            <span className="font-mono font-bold text-dark">{selectedOrder.bank_details.bank_sort_code || '20-00-00'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Account Number</span>
                            <span className="font-mono font-bold text-dark">{selectedOrder.bank_details.bank_account_number || '12345678'}</span>
                          </div>
                        </div>
                      )}

                      {/* Attached Proof Document / Photo */}
                      {proof ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            {proof.dataUrl.startsWith('data:image/') ? (
                              <div
                                onClick={() => setViewingProof({
                                  fileName: proof.fileName || 'payment_proof.jpg',
                                  dataUrl: proof.dataUrl,
                                  fileSize: proof.fileSize,
                                  uploadedAt: proof.uploadedAt,
                                  orderNumber: selectedOrder.order_number,
                                  order: selectedOrder,
                                })}
                                className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0 cursor-pointer relative group bg-gray-50 flex items-center justify-center"
                                title="Click to enlarge proof"
                              >
                                <img src={proof.dataUrl} alt="Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn size={14} />
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                                <FileText size={20} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-dark text-xs truncate" title={proof.fileName}>
                                {proof.fileName || 'payment_proof.jpg'}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {proof.fileSize ? `${(proof.fileSize / 1024).toFixed(1)} KB` : ''}
                                {proof.uploadedAt ? ` • Uploaded ${formatDateUK(proof.uploadedAt)}` : ''}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-1">
                                <Check size={11} /> Ready for verification
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setViewingProof({
                                fileName: proof.fileName || 'payment_proof.jpg',
                                dataUrl: proof.dataUrl,
                                fileSize: proof.fileSize,
                                uploadedAt: proof.uploadedAt,
                                orderNumber: selectedOrder.order_number,
                                order: selectedOrder,
                              })}
                              className="text-xs flex-1 gap-1"
                            >
                              <ZoomIn size={12} />
                              View Proof
                            </Button>
                            <a
                              href={proof.dataUrl}
                              download={proof.fileName || `payment-proof-${selectedOrder.order_number}`}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-dark font-bold text-xs flex items-center gap-1 transition-colors"
                            >
                              <Download size={12} />
                              Download
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <span>Customer has not attached a transfer receipt yet. You can confirm directly once statement matches.</span>
                        </div>
                      )}

                      {/* Admin Confirmation Action */}
                      {user?.role === 'admin' && !['cancelled', 'refunded'].includes(selectedOrder.status) && isAwaiting && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setConfirmingBankOrder(selectedOrder)}
                            className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 font-bold gap-1.5 shadow-xs py-2 text-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Confirm Payment Received
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCancelModal(selectedOrder, true)}
                            className="justify-center text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 font-bold gap-1 shadow-2xs py-2 text-xs cursor-pointer"
                            title="Reject fake or invalid transfer receipt and cancel order"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Reject &amp; Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Payment Overview Card */}
                <div className="p-4 sm:p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <CreditCard className="w-4 h-4 text-brand-blue" />
                    <span className="font-bold text-dark text-xs uppercase tracking-wide">
                      Payment Overview
                    </span>
                  </div>

                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-500">Method</dt>
                      <dd className="font-bold text-dark capitalize">
                        {selectedOrder.payment_method === 'bank_transfer'
                          ? 'Company Bank Transfer'
                          : selectedOrder.payment_method === 'paypal'
                          ? 'PayPal'
                          : 'Stripe • Card'}
                      </dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-gray-500">Status</dt>
                      <dd>
                        {(() => {
                          const pb = getPaymentStatusBadge(selectedOrder.payment_status);
                          return (
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase', pb.badge)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', pb.dot)} />
                              {pb.label}
                            </span>
                          );
                        })()}
                      </dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-gray-500">Transaction Ref</dt>
                      <dd className="font-mono text-dark font-medium truncate max-w-[160px]" title={selectedOrder.payment_reference || selectedOrder.order_number}>
                        {selectedOrder.payment_reference || selectedOrder.paypal_capture_id || selectedOrder.stripe_payment_intent_id || selectedOrder.order_number}
                      </dd>
                    </div>

                    {selectedOrder.paid_at && (
                      <div className="flex justify-between items-center">
                        <dt className="text-gray-500">Paid At</dt>
                        <dd className="text-gray-700 font-mono text-[11px]">{formatDateUK(selectedOrder.paid_at)}</dd>
                      </div>
                    )}

                    {selectedOrder.payment_confirmed_by && (
                      <div className="flex justify-between items-center">
                        <dt className="text-gray-500">Confirmed By</dt>
                        <dd className="text-gray-700 text-[11px] font-medium">{selectedOrder.payment_confirmed_by}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Financial Breakdown Card */}
                <div className="p-4 sm:p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs font-mono">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100 font-sans">
                    <DollarSign className="w-4 h-4 text-brand-blue" />
                    <span className="font-bold text-dark text-xs uppercase tracking-wide">
                      Financial Breakdown
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatMoney(selectedOrder.subtotal, selectedOrder.currency)}</span>
                    </div>

                    <div className="flex justify-between text-gray-500">
                      <span>{selectedOrder.delivery_name || 'UK Shipping'}</span>
                      <span>
                        {selectedOrder.shipping_amount === 0 ? 'FREE' : formatMoney(selectedOrder.shipping_amount, selectedOrder.currency)}
                      </span>
                    </div>

                    {Number(selectedOrder.refunded_amount) > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Refunded</span>
                        <span>-{formatMoney(selectedOrder.refunded_amount!, selectedOrder.currency)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline font-sans">
                      <span className="font-extrabold text-sm text-dark">Total Amount</span>
                      <span className="font-mono font-extrabold text-base text-dark">
                        {formatMoney(selectedOrder.total_amount, selectedOrder.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Bank Transfer Modal */}
      {confirmingBankOrder && (
        <Modal
          isOpen={Boolean(confirmingBankOrder)}
          onClose={() => setConfirmingBankOrder(null)}
          title="Confirm Bank Transfer Payment"
          description={`Order ${confirmingBankOrder.order_number} (${formatMoney(confirmingBankOrder.total_amount, confirmingBankOrder.currency)})`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <p className="font-semibold text-emerald-950">Confirm funds received in {confirmingBankOrder.bank_details?.bank_name || 'the saved bank account'}</p>
              <p className="text-[11px] text-emerald-800">
                Please confirm that the customer has transferred <strong>{formatMoney(confirmingBankOrder.total_amount, confirmingBankOrder.currency)}</strong> to Sort Code <strong>{confirmingBankOrder.bank_details?.bank_sort_code || '--'}</strong>, Account Number <strong>{confirmingBankOrder.bank_details?.bank_account_number || '--'}</strong> with payment reference <strong>{confirmingBankOrder.order_number}</strong>.
              </p>
            </div>

            {/* Customer Proof Preview in Confirm Modal */}
            {(() => {
              const proof = getOrderProof(confirmingBankOrder);
              if (proof) {
                return (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-700 text-[11px] flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-brand-blue" />
                        Customer Transfer Proof ({proof.fileName || 'payment_proof.jpg'})
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewingProof({
                          fileName: proof.fileName || 'payment_proof.jpg',
                          dataUrl: proof.dataUrl,
                          fileSize: proof.fileSize,
                          uploadedAt: proof.uploadedAt,
                          orderNumber: confirmingBankOrder.order_number,
                          order: confirmingBankOrder,
                        })}
                        className="text-[10px] text-brand-blue font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ZoomIn className="w-3 h-3" />
                        Enlarge Full Size
                      </button>
                    </div>
                    {proof.dataUrl.startsWith('data:image/') ? (
                      <div
                        onClick={() => setViewingProof({
                          fileName: proof.fileName || 'payment_proof.jpg',
                          dataUrl: proof.dataUrl,
                          fileSize: proof.fileSize,
                          uploadedAt: proof.uploadedAt,
                          orderNumber: confirmingBankOrder.order_number,
                          order: confirmingBankOrder,
                        })}
                        className="cursor-pointer group relative overflow-hidden rounded border border-gray-300 bg-white max-h-44 flex items-center justify-center"
                        title="Click to enlarge proof"
                      >
                        <img
                          src={proof.dataUrl}
                          alt="Payment Proof"
                          className="max-h-44 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-semibold gap-1">
                          <ZoomIn className="w-4 h-4" /> Click to enlarge
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white border border-gray-200 rounded flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <span className="font-medium text-dark block">{proof.fileName}</span>
                            {proof.fileSize && <span className="text-[10px] text-gray-400">{(proof.fileSize / 1024).toFixed(1)} KB</span>}
                          </div>
                        </div>
                        <a
                          href={proof.dataUrl}
                          download={proof.fileName || 'payment-proof'}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-[11px] font-semibold"
                        >
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Customer has not attached a transfer proof file via web. Please check your bank statement manually before verifying payment.</span>
                  </div>
                );
              }
            })()}

            <label className="block space-y-1">
              <span className="font-bold text-gray-700 uppercase text-[10px]">Admin Verification Notes (Optional)</span>
              <input
                type="text"
                value={bankConfirmNote}
                onChange={(e) => setBankConfirmNote(e.target.value)}
                placeholder="Bank statement reference or verification note..."
                className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-300 rounded-md outline-none focus:border-brand-blue"
              />
            </label>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingBankOrder(null)}
                disabled={isConfirmingBank}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmBankPayment}
                isLoading={isConfirmingBank}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Payment &amp; Process Order
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Viewing Full Payment Proof Modal */}
      {viewingProof && (
        <Modal
          isOpen={Boolean(viewingProof)}
          onClose={() => setViewingProof(null)}
          title={`Payment Proof — Order #${viewingProof.orderNumber}`}
          description={viewingProof.fileName}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Top action bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-brand-blue shrink-0" />
                <div>
                  <span className="font-semibold text-gray-900 block">{viewingProof.fileName}</span>
                  <span className="text-[10px] text-gray-500">
                    {viewingProof.fileSize ? `${(viewingProof.fileSize / 1024).toFixed(1)} KB` : ''}
                    {viewingProof.uploadedAt ? ` • Uploaded on ${formatDateUK(viewingProof.uploadedAt)}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingProof.dataUrl}
                  download={viewingProof.fileName || `payment-proof-${viewingProof.orderNumber}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-semibold text-xs transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </a>
                {viewingProof.order && viewingProof.order.payment_status === 'awaiting_payment' && user?.role === 'admin' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const ord = viewingProof.order!;
                        setViewingProof(null);
                        openCancelModal(ord, true);
                      }}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-xs font-bold gap-1 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Reject (Fake / Invalid)
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const ord = viewingProof.order!;
                        setViewingProof(null);
                        setConfirmingBankOrder(ord);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm Payment
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Image Preview or Document Download container */}
            <div className="bg-slate-900 rounded-lg p-2 sm:p-4 flex items-center justify-center min-h-[320px] max-h-[70vh] overflow-auto">
              {viewingProof.dataUrl.startsWith('data:image/') ? (
                <img
                  src={viewingProof.dataUrl}
                  alt={`Payment Proof ${viewingProof.orderNumber}`}
                  className="max-h-[65vh] w-auto object-contain rounded shadow-lg"
                />
              ) : (
                <div className="text-center p-8 text-white space-y-3">
                  <FileText className="w-16 h-16 mx-auto text-gray-400" />
                  <p className="font-semibold text-sm">Payment Document ({viewingProof.fileName})</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Non-image documents cannot be previewed directly in browser. Please download to inspect the payment proof file.
                  </p>
                  <a
                    href={viewingProof.dataUrl}
                    download={viewingProof.fileName}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs"
                  >
                    <Download className="w-4 h-4" /> Download Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Order & Reject Payment Modal */}
      {cancellingOrder && (
        <Modal
          isOpen={Boolean(cancellingOrder)}
          onClose={() => setCancellingOrder(null)}
          title={cancellingOrder.isFakeProof ? 'Reject Payment Proof & Cancel Order' : 'Cancel Customer Order'}
          description={`Order #${cancellingOrder.order.order_number} (${formatMoney(cancellingOrder.order.total_amount, cancellingOrder.order.currency)})`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {cancellingOrder.isFakeProof ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <p className="font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Fraudulent / Fake Payment Verification
                </p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  If the uploaded bank transfer receipt is counterfeit or funds have not landed in your company account, you can cancel the order and mark payment as failed.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Confirm Order Cancellation
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Are you sure you want to cancel order #{cancellingOrder.order.order_number}?
                </p>
              </div>
            )}

            {/* Inventory Restock Notification */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/90 rounded-xl text-[11px] text-brand-blue flex items-start gap-2">
              <Package className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Automatic Stock Restocking</span>
                <span>
                  All <strong>{cancellingOrder.order.items.reduce((s, i) => s + i.quantity, 0)} reserved DVD discs</strong> will be returned to live shop inventory.
                </span>
              </div>
            </div>

            {/* Reason selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                Cancellation Reason *
              </label>
              <div className="space-y-1.5">
                {[
                  'Fake / fraudulent transfer receipt uploaded',
                  'Payment not received in company bank account',
                  'Invalid or illegible transfer receipt',
                  'Customer requested order cancellation',
                  'Duplicate or unverified order',
                  'other',
                ].map((preset) => (
                  <label
                    key={preset}
                    className={cn(
                      'flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer text-xs',
                      cancelReasonPreset === preset
                        ? 'bg-rose-50/70 border-rose-300 text-dark font-semibold'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="cancelPreset"
                      checked={cancelReasonPreset === preset}
                      onChange={() => setCancelReasonPreset(preset)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{preset === 'other' ? 'Other custom reason (enter below)' : preset}</span>
                  </label>
                ))}
              </div>

              {(cancelReasonPreset === 'other' || cancelReasonPreset.length > 0) && (
                <div className="pt-1">
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                    {cancelReasonPreset === 'other' ? 'Specify Custom Reason *' : 'Additional Admin Note (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder={
                      cancelReasonPreset === 'other'
                        ? 'Explain why this order is cancelled...'
                        : 'e.g. Statement checked on 18 Sept, reference not found...'
                    }
                    className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-rose-500 focus:bg-white transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancellingOrder(null)}
                disabled={isCancelling}
              >
                Keep Order
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleExecuteCancel}
                isLoading={isCancelling}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
