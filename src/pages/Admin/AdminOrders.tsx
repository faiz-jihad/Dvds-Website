import { formatMoney, countryName } from '../../../shared/commerce.js';
import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, PackageCheck, Truck, Check, Disc, Filter, Building2, CreditCard, AlertCircle, Paperclip, FileText, Download, ZoomIn } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { Order, OrderStatus, FulfilmentStatus } from '../../types';
import { formatGBP, formatDateUK } from '../../lib/formatters';
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
      fileName: order.bank_details.payment_proof_filename || 'bukti_transfer.jpg',
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
            fileName: parsed.fileName || 'bukti_transfer.jpg',
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

  const addToast = useUiStore((state) => state.addToast);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setCarrier(order.shipping_carrier || '');
    setTrackingNumber(order.tracking_number || '');
    setInternalNote(order.internal_notes || '');
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-sm font-semibold text-[10px] uppercase ${
                            o.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.payment_status === 'awaiting_payment'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {o.payment_status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <span className="capitalize text-gray-700 font-medium">
                          {o.payment_method === 'bank_transfer'
                            ? 'Bank Transfer'
                            : o.payment_method === 'paypal'
                            ? 'PayPal'
                            : o.payment_provider === 'stripe'
                            ? 'Stripe — Card / Apple Pay'
                            : 'Card (Stripe)'}
                        </span>
                        {o.paid_at && (
                          <span className="text-gray-400 font-mono text-[10px]">
                            • {formatDateUK(o.paid_at)}
                          </span>
                        )}
                      </div>
                      {/* Direct Bank Transfer Bukti Status & Actions */}
                      {o.payment_method === 'bank_transfer' && (() => {
                        const proof = getOrderProof(o);
                        return (
                          <div className="pt-0.5 flex flex-wrap items-center gap-1.5">
                            {proof ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingProof({
                                    fileName: proof.fileName || 'bukti_transfer.jpg',
                                    dataUrl: proof.dataUrl,
                                    fileSize: proof.fileSize,
                                    uploadedAt: proof.uploadedAt,
                                    orderNumber: o.order_number,
                                    order: o,
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-brand-blue border border-blue-200 font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Lihat Bukti Transfer Pembayaran"
                              >
                                <Paperclip className="w-3 h-3 text-brand-blue" />
                                <span>Lihat Bukti</span>
                              </button>
                            ) : o.payment_status === 'awaiting_payment' ? (
                              <span className="text-[10px] text-amber-700 flex items-center gap-1 italic">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Menunggu bukti
                              </span>
                            ) : null}

                            {user?.role === 'admin' && !['cancelled', 'refunded'].includes(o.status) && o.payment_status === 'awaiting_payment' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingBankOrder(o);
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Check className="w-3 h-3" />
                                Confirm Payment
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
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
                    {formatMoney(o.total_amount, o.currency)}
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
                      {selectedOrder.payment_review_required && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Payment arrived after cancellation and stock was released. Verify availability with the customer or issue a refund in the payment provider dashboard before fulfilment.</div>}
            {Number(selectedOrder.refunded_amount) > 0 && <p className="text-sm text-blue-700">Refunded: {formatMoney(selectedOrder.refunded_amount!, selectedOrder.currency)}</p>}
            {/* Direct Bank Transfer & Payment Proof Verification Section */}
            {selectedOrder.payment_method === 'bank_transfer' && (() => {
              const proof = getOrderProof(selectedOrder);
              const isAwaiting = selectedOrder.payment_status === 'awaiting_payment';
              return (
                <div className={`p-4 rounded-lg border ${isAwaiting ? 'bg-amber-50/80 border-amber-300' : 'bg-blue-50/50 border-blue-200'} space-y-3`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-200/70">
                    <div className="flex items-start gap-2.5">
                      <Building2 className={`w-5 h-5 ${isAwaiting ? 'text-amber-700' : 'text-brand-blue'} shrink-0 mt-0.5`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-xs">
                            Direct Bank Transfer Verification
                          </span>
                          {proof ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              <Paperclip className="w-2.5 h-2.5" /> Bukti Tersedia
                            </span>
                          ) : isAwaiting ? (
                            <span className="inline-flex items-center gap-1 bg-amber-200/70 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-2.5 h-2.5" /> Menunggu Bukti
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          Ref transfer: <strong className="font-mono text-dark">{selectedOrder.order_number}</strong> • Nominal tagihan: <strong className="text-dark">{formatMoney(selectedOrder.total_amount, selectedOrder.currency)}</strong>
                        </p>
                      </div>
                    </div>

                    {user?.role === 'admin' && !['cancelled', 'refunded'].includes(selectedOrder.status) && isAwaiting && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setConfirmingBankOrder(selectedOrder)}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 font-bold shadow-xs shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Konfirmasi Pembayaran Diterima
                      </Button>
                    )}
                  </div>

                  {/* Bank Account Details row */}
                  {selectedOrder.bank_details && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white/70 p-2.5 rounded border border-gray-200/70">
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold block">Bank</span>
                        <span className="font-semibold text-gray-800">{selectedOrder.bank_details.bank_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold block">Nama Rekening</span>
                        <span className="font-semibold text-gray-800">{selectedOrder.bank_details.bank_account_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold block">Sort Code</span>
                        <span className="font-mono font-semibold text-gray-800">{selectedOrder.bank_details.bank_sort_code || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold block">No Rekening / IBAN</span>
                        <span className="font-mono font-semibold text-gray-800">{selectedOrder.bank_details.bank_account_number || selectedOrder.bank_details.bank_iban || '—'}</span>
                      </div>
                    </div>
                  )}

                  {/* Proof Viewer card */}
                  {proof ? (
                    <div className="bg-white rounded-md border border-gray-200 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3">
                        {proof.dataUrl.startsWith('data:image/') ? (
                          <div
                            onClick={() => setViewingProof({
                              fileName: proof.fileName || 'bukti_transfer.jpg',
                              dataUrl: proof.dataUrl,
                              fileSize: proof.fileSize,
                              uploadedAt: proof.uploadedAt,
                              orderNumber: selectedOrder.order_number,
                              order: selectedOrder,
                            })}
                            className="group relative cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-gray-50 w-16 h-16 shrink-0 flex items-center justify-center"
                            title="Klik untuk memperbesar bukti transfer"
                          >
                            <img
                              src={proof.dataUrl}
                              alt="Bukti Transfer"
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-md border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-dark text-xs flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-brand-blue" />
                            {proof.fileName || 'Bukti Transfer Pembayaran'}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 space-x-1">
                            {proof.fileSize && <span>{(proof.fileSize / 1024).toFixed(1)} KB</span>}
                            {proof.uploadedAt && <span>• Diunggah {formatDateUK(proof.uploadedAt)}</span>}
                          </div>
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Bukti terlampir dan siap diverifikasi admin</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewingProof({
                            fileName: proof.fileName || 'bukti_transfer.jpg',
                            dataUrl: proof.dataUrl,
                            fileSize: proof.fileSize,
                            uploadedAt: proof.uploadedAt,
                            orderNumber: selectedOrder.order_number,
                            order: selectedOrder,
                          })}
                          className="text-xs h-8 px-2.5 gap-1"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          Lihat Bukti
                        </Button>
                        <a
                          href={proof.dataUrl}
                          download={proof.fileName || `bukti-transfer-${selectedOrder.order_number}`}
                          className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs border border-gray-200 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/80 rounded-md border border-amber-200 p-3 text-[11px] text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Bukti transfer belum diunggah</span>
                        <span>Pelanggan belum melampirkan file bukti transfer untuk pesanan ini. Anda dapat menunggu pelanggan mengunggah bukti via link pesanan atau mengonfirmasi langsung bila mutasi rekening bank sudah sesuai.</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Fulfilment Status Controls */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-gray-500 font-medium">Fulfilment Action:</span>
                <div className="font-bold text-dark text-sm uppercase mt-0.5">
                  Current: {selectedOrder.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedOrder.payment_status === 'paid' && !selectedOrder.payment_review_required && selectedOrder.status === 'processing' && (
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
                {selectedOrder.payment_status !== 'paid' && (
                  <span className="rounded bg-amber-100 px-3 py-2 text-[10px] font-bold uppercase text-amber-800">
                    Awaiting verified payment
                  </span>
                )}
                {!['paid', 'partially_refunded', 'refunded'].includes(selectedOrder.payment_status) && !['cancelled', 'delivered', 'refunded'].includes(selectedOrder.status) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled', 'unfulfilled')}
                    isLoading={isUpdating}
                  >
                    Cancel order
                  </Button>
                )}
              </div>
            </div>

            {/* Payment & Provider Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-md border border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Payment Method</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {selectedOrder.payment_method === 'bank_transfer'
                    ? 'Company Bank Transfer'
                    : selectedOrder.payment_method === 'paypal'
                    ? 'PayPal'
                    : 'Stripe — Visa / Apple Pay / Google Pay'}
                </span>
                <span className="text-[10px] text-gray-400 block font-mono">
                  Provider: {selectedOrder.payment_provider || 'standard'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Payment Status</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedOrder.payment_status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {selectedOrder.payment_status.replace('_', ' ')}
                </span>
                {selectedOrder.paid_at && (
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    Paid: {formatDateUK(selectedOrder.paid_at)}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Transaction Reference</span>
                <span className="font-mono text-[11px] text-gray-800 break-all font-medium">
                  {selectedOrder.payment_reference ||
                    selectedOrder.paypal_capture_id ||
                    selectedOrder.stripe_payment_intent_id ||
                    selectedOrder.order_number}
                </span>
                {selectedOrder.payment_confirmed_by && (
                  <span className="text-[10px] text-gray-400 block">
                    Confirmed by: {selectedOrder.payment_confirmed_by}
                  </span>
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
                    <span className="font-mono font-bold text-dark">{formatMoney(item.total_price, selectedOrder.currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Total Breakdown */}
            <div className="p-3 bg-gray-50 rounded-md space-y-1.5 text-right font-mono">
              <div className="text-gray-500">Subtotal: {formatMoney(selectedOrder.subtotal, selectedOrder.currency)}</div>
              <div className="text-gray-500">
                {selectedOrder.delivery_name || 'Shipping'}: {selectedOrder.shipping_amount === 0 ? 'FREE' : formatMoney(selectedOrder.shipping_amount, selectedOrder.currency)}
              </div>
              <div className="text-dark font-bold text-sm pt-1 border-t border-gray-200">
                Order Total: {formatMoney(selectedOrder.total_amount, selectedOrder.currency)}
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
                        Bukti Transfer dari Pelanggan ({proof.fileName || 'bukti_transfer.jpg'})
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewingProof({
                          fileName: proof.fileName || 'bukti_transfer.jpg',
                          dataUrl: proof.dataUrl,
                          fileSize: proof.fileSize,
                          uploadedAt: proof.uploadedAt,
                          orderNumber: confirmingBankOrder.order_number,
                          order: confirmingBankOrder,
                        })}
                        className="text-[10px] text-brand-blue font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ZoomIn className="w-3 h-3" />
                        Perbesar Ukuran Penuh
                      </button>
                    </div>
                    {proof.dataUrl.startsWith('data:image/') ? (
                      <div
                        onClick={() => setViewingProof({
                          fileName: proof.fileName || 'bukti_transfer.jpg',
                          dataUrl: proof.dataUrl,
                          fileSize: proof.fileSize,
                          uploadedAt: proof.uploadedAt,
                          orderNumber: confirmingBankOrder.order_number,
                          order: confirmingBankOrder,
                        })}
                        className="cursor-pointer group relative overflow-hidden rounded border border-gray-300 bg-white max-h-44 flex items-center justify-center"
                        title="Klik untuk memperbesar bukti"
                      >
                        <img
                          src={proof.dataUrl}
                          alt="Bukti Transfer"
                          className="max-h-44 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-semibold gap-1">
                          <ZoomIn className="w-4 h-4" /> Klik untuk memperbesar
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
                          download={proof.fileName || 'bukti-transfer'}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-[11px] font-semibold"
                        >
                          Unduh
                        </a>
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Pelanggan belum melampirkan file bukti transfer via web. Pastikan Anda telah memeriksa mutasi rekening bank secara manual sebelum menyetujui verifikasi pembayaran.</span>
                  </div>
                );
              }
            })()}

            <label className="block space-y-1">
              <span className="font-bold text-gray-700 uppercase text-[10px]">Catatan Verifikasi Admin (Opsional)</span>
              <input
                type="text"
                value={bankConfirmNote}
                onChange={(e) => setBankConfirmNote(e.target.value)}
                placeholder="No ref mutasi rekening bank atau catatan verifikasi..."
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
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmBankPayment}
                isLoading={isConfirmingBank}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Konfirmasi Pembayaran & Proses Pesanan
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
          title={`Bukti Transfer — Order #${viewingProof.orderNumber}`}
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
                    {viewingProof.uploadedAt ? ` • Diunggah pada ${formatDateUK(viewingProof.uploadedAt)}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingProof.dataUrl}
                  download={viewingProof.fileName || `bukti-transfer-${viewingProof.orderNumber}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-semibold text-xs transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh File
                </a>
                {viewingProof.order && viewingProof.order.payment_status === 'awaiting_payment' && user?.role === 'admin' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const ord = viewingProof.order!;
                      setViewingProof(null);
                      setConfirmingBankOrder(ord);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Konfirmasi Pembayaran
                  </Button>
                )}
              </div>
            </div>

            {/* Image Preview or Document Download container */}
            <div className="bg-slate-900 rounded-lg p-2 sm:p-4 flex items-center justify-center min-h-[320px] max-h-[70vh] overflow-auto">
              {viewingProof.dataUrl.startsWith('data:image/') ? (
                <img
                  src={viewingProof.dataUrl}
                  alt={`Bukti Transfer ${viewingProof.orderNumber}`}
                  className="max-h-[65vh] w-auto object-contain rounded shadow-lg"
                />
              ) : (
                <div className="text-center p-8 text-white space-y-3">
                  <FileText className="w-16 h-16 mx-auto text-gray-400" />
                  <p className="font-semibold text-sm">Dokumen Pembayaran ({viewingProof.fileName})</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Dokumen non-gambar tidak dapat ditampilkan langsung dalam preview browser. Silakan unduh untuk memeriksa isi dokumen bukti transfer.
                  </p>
                  <a
                    href={viewingProof.dataUrl}
                    download={viewingProof.fileName}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs"
                  >
                    <Download className="w-4 h-4" /> Unduh Dokumen
                  </a>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
