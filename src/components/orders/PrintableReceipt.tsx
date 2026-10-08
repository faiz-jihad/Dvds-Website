import React from 'react';
import { Order } from '../../types';
import { formatGBP, formatDateUK, formatDateTimeUK } from '../../lib/formatters';

interface PrintableReceiptProps {
  order: Order;
  className?: string;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ order, className = '' }) => {
  if (!order) return null;

  const shippingAddr = order.shipping_address || ({} as Partial<NonNullable<Order['shipping_address']>>);
  const items = Array.isArray(order.items) ? order.items : [];
  const isPaid = order.payment_status === 'paid';
  const paymentMethodLabel =
    order.payment_method === 'bank_transfer'
      ? 'Bank Transfer'
      : order.payment_method === 'paypal'
      ? 'PayPal'
      : 'Card (Stripe)';

  const transactionRef =
    order.stripe_payment_intent_id ||
    order.paypal_capture_id ||
    order.bank_transfer_reference ||
    order.payment_reference ||
    order.id;

  const paymentStatusLabel = (order.payment_status || 'pending').replace(/_/g, ' ').toUpperCase();

  return (
    <article
      id="printable-receipt"
      className={`printable-receipt-content bg-white text-gray-900 p-6 sm:p-10 max-w-[820px] mx-auto font-sans leading-normal print:p-0 print:max-w-none ${className}`}
    >
      {/* Official Header with Brand Colors: Navy / Red / White */}
      <header className="border-b-2 border-gray-900 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-gray-950 font-display">
                DVDs ZONE
              </span>
            </div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mt-1">
              Official Payment Receipt & Proof of Purchase
            </p>
            <p className="text-xs text-gray-600 mt-1">
              DVDs Zone • Online DVD & Entertainment Specialist • United Kingdom
            </p>
            <p className="text-xs text-gray-500">
              azrayanltd@gmail.com • www.dvdszone.co.uk
            </p>
          </div>

          <div className="text-right sm:text-right">
            <div className="inline-block bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-right">
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Order Reference</div>
              <div className="font-mono font-bold text-base text-gray-950">{order.order_number}</div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">Order Date:</span> {formatDateTimeUK(order.created_at)}
            </div>
            <div className="mt-1">
              <span
                className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                Payment: {paymentStatusLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Customer & Payment Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-200 text-xs sm:text-sm">
        {/* Customer & Shipping */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-1 mb-2">
            Customer & Delivery Details
          </h2>
          <div className="font-bold text-gray-900">
            {shippingAddr.full_name || 'Customer'}
          </div>
          {shippingAddr.address_line_1 && (
            <div className="text-gray-700">{shippingAddr.address_line_1}</div>
          )}
          {shippingAddr.address_line_2 && (
            <div className="text-gray-700">{shippingAddr.address_line_2}</div>
          )}
          {(shippingAddr.city || shippingAddr.postcode) && (
            <div className="text-gray-700">
              {[shippingAddr.city, shippingAddr.postcode].filter(Boolean).join(', ')}
            </div>
          )}
          {shippingAddr.country && (
            <div className="text-gray-700">
              {shippingAddr.country === 'GB' ? 'United Kingdom' : shippingAddr.country}
            </div>
          )}
          <div className="text-gray-600 pt-1">
            <span className="font-medium">Email:</span> {order.email || '—'}
          </div>
          {shippingAddr.phone && (
            <div className="text-gray-600">
              <span className="font-medium">Phone:</span> {shippingAddr.phone}
            </div>
          )}
          {order.delivery_name && (
            <div className="text-gray-600 pt-1">
              <span className="font-medium">Delivery:</span> {order.delivery_name}
            </div>
          )}
          {order.tracking_number && (
            <div className="text-gray-600 font-mono">
              <span className="font-medium">Tracking:</span> {order.tracking_number}
            </div>
          )}
        </div>

        {/* Payment & Transaction */}
        <div className="space-y-1 sm:pl-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-1 mb-2">
            Payment Information
          </h2>
          <div className="flex justify-between py-0.5">
            <span className="text-gray-600">Payment Status:</span>
            <span className="font-bold text-gray-900">{paymentStatusLabel}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-semibold text-gray-900">{paymentMethodLabel}</span>
          </div>
          {order.paid_at && (
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">Payment Confirmed:</span>
              <span className="text-gray-900">{formatDateTimeUK(order.paid_at)}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:justify-between py-0.5 gap-1">
            <span className="text-gray-600">Transaction Ref:</span>
            <span className="font-mono text-[11px] text-gray-900 break-all select-all">
              {transactionRef}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-gray-600">Fulfillment Status:</span>
            <span className="capitalize text-gray-900">
              {(order.fulfilment_status || order.status || 'processing').replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600">
            <span className="font-semibold text-gray-800">Security Guarantee:</span> Fully encrypted payment. Sensitive card numbers and CVV codes are never stored.
          </div>
        </div>
      </div>

      {/* Itemized Order Line Items Table */}
      <div className="py-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">
          Purchased Items
        </h2>
        <div className="border border-gray-300 rounded overflow-hidden">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 font-bold uppercase text-[11px]">
                <th className="py-2.5 px-3 text-left w-10">#</th>
                <th className="py-2.5 px-3 text-left">Item Description</th>
                <th className="py-2.5 px-3 text-center w-16">Qty</th>
                <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                <th className="py-2.5 px-3 text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500 italic">
                    No order items recorded.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-gray-50/50 page-break-avoid">
                    <td className="py-3 px-3 text-gray-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-950">{item.product_title}</div>
                      {item.product_sku && (
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          SKU: {item.product_sku}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 font-mono">
                      {formatGBP(item.unit_price)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gray-950 font-mono">
                      {formatGBP(item.total_price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Totals Breakdown */}
      <div className="flex justify-end pt-2 pb-6">
        <div className="w-full sm:w-72 space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between py-1 text-gray-700">
            <span>Subtotal</span>
            <span className="font-mono">{formatGBP(order.subtotal)}</span>
          </div>

          <div className="flex justify-between py-1 text-gray-700">
            <span>Shipping & Delivery</span>
            <span className="font-mono">
              {order.shipping_amount === 0 ? 'FREE' : formatGBP(order.shipping_amount)}
            </span>
          </div>

          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between py-1 text-emerald-700 font-medium">
              <span>Promotional Discount</span>
              <span className="font-mono">-{formatGBP(order.discount_amount)}</span>
            </div>
          )}

          <div className="border-t-2 border-gray-900 pt-2 flex justify-between text-base font-black text-gray-950">
            <span>TOTAL PAID</span>
            <span className="font-mono text-lg">{formatGBP(order.total_amount)}</span>
          </div>

          {Number(order.refunded_amount) > 0 && (
            <div className="flex justify-between py-1 text-red-600 font-semibold border-t border-dashed border-red-200">
              <span>Total Refunded</span>
              <span className="font-mono">-{formatGBP(order.refunded_amount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Official Receipt Footer */}
      <footer className="border-t-2 border-gray-900 pt-6 mt-4 text-xs text-gray-600 space-y-4 page-break-avoid">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-gray-900">Thank you for your purchase!</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Please retain this receipt for warranty and return purposes.
            </p>
            <p className="text-[11px] text-gray-500">
              For support or returns, email{' '}
              <span className="font-medium text-gray-700">azrayanltd@gmail.com</span> with order ref{' '}
              <span className="font-mono font-bold text-gray-800">{order.order_number}</span>.
            </p>
          </div>

          {/* Barcode Graphic Simulation for authentic shop receipt look */}
          <div className="text-center font-mono">
            <div className="tracking-[0.25em] text-lg font-black select-none text-gray-900">
              ||| | |||| | || | ||| |||| |
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 tracking-wider font-bold">
              *{order.order_number}*
            </div>
          </div>
        </div>

        <div className="text-[10px] text-gray-400 text-center border-t border-gray-100 pt-3">
          DVDs Zone • United Kingdom • All items are brand new, sealed original media unless specified.
        </div>
      </footer>
    </article>
  );
};
