import React from 'react';
import { Order } from '../../types';
import { formatGBP, formatDateUK } from '../../lib/formatters';
import { Disc, ShieldCheck, CheckCircle2, Truck } from 'lucide-react';

interface PrintableReceiptProps {
  order: Order;
  className?: string;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ order, className = '' }) => {
  const addr = order.shipping_address;
  const items = order.items || [];
  const vatRate = 0.2; // UK 20% standard rate
  const vatAmount = (order.total_amount * vatRate) / (1 + vatRate);
  const netAmount = order.total_amount - vatAmount;

  return (
    <div
      id="printable-receipt"
      className={`printable-receipt-content bg-white text-gray-900 font-sans p-8 sm:p-12 max-w-[850px] mx-auto border border-gray-200 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0 print:m-0 ${className}`}
    >
      {/* Top Header Banner with Store Branding */}
      <div className="border-b-2 border-gray-900 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold">
              <Disc className="w-5 h-5 text-amber-400 animate-spin-slow" />
            </div>
            <div>
              <span className="font-display font-black text-xl tracking-tight text-gray-900 uppercase">
                AZ Rayan DVDs
              </span>
              <span className="block text-[10px] font-mono tracking-widest text-gray-500 uppercase">
                British Physical Media & Film Archive
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600 space-y-0.5 leading-relaxed">
            <p className="font-medium text-gray-800">AZ Rayan Ltd • UK Registered Media Merchant</p>
            <p>71-75 Shelton Street, Covent Garden, London, WC2H 9JQ</p>
            <p>VAT Reg: <span className="font-mono font-medium">GB 389 4410 82</span> • Co. Reg: <span className="font-mono font-medium">14829104</span></p>
            <p>Email: support@azrayandvds.co.uk • Web: azrayandvds.co.uk</p>
          </div>
        </div>

        {/* Invoice Title & Stamp */}
        <div className="sm:text-right space-y-1.5">
          <div className="inline-block px-3 py-1 rounded bg-gray-900 text-white text-[11px] font-mono font-bold tracking-wider uppercase">
            Official Tax Invoice
          </div>
          <p className="text-xs font-semibold text-gray-700">Order Reference:</p>
          <p className="font-mono font-extrabold text-lg text-gray-900 tracking-tight">
            {order.order_number}
          </p>
          <p className="text-xs text-gray-500">
            Date Issued: <span className="font-medium text-gray-800">{formatDateUK(order.created_at)}</span>
          </p>
          {/* Payment Status Badge */}
          <div className="pt-1">
            {order.payment_status === 'paid' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PAID IN FULL
              </span>
            ) : order.payment_status === 'awaiting_payment' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                AWAITING BANK TRANSFER
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                PAYMENT PENDING
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two-column Bilateral Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-gray-200 text-xs">
        {/* Recipient / Delivery Address */}
        <div className="space-y-1 bg-gray-50/70 p-4 rounded-lg border border-gray-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Deliver To (Recipient)
          </p>
          <p className="font-bold text-sm text-gray-900">{addr?.full_name || 'Customer'}</p>
          <p className="text-gray-700">{addr?.address_line_1}</p>
          {addr?.address_line_2 && <p className="text-gray-700">{addr?.address_line_2}</p>}
          <p className="text-gray-700">
            {addr?.city}{addr?.county ? `, ${addr.county}` : ''}
          </p>
          <p className="font-mono font-bold text-gray-900">{addr?.postcode}</p>
          <p className="text-gray-600">{addr?.country || 'United Kingdom'}</p>
          {addr?.phone && <p className="text-gray-500 pt-1 font-mono">Tel: {addr.phone}</p>}
          <p className="text-gray-500 font-mono">Email: {order.email}</p>
        </div>

        {/* Fulfillment & Carrier Logistics */}
        <div className="space-y-2 bg-gray-50/70 p-4 rounded-lg border border-gray-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Fulfillment & Shipping Details
          </p>
          <div className="flex items-center gap-2 text-gray-800">
            <Truck className="w-4 h-4 text-brand-blue" />
            <span className="font-semibold">
              {order.shipping_carrier || 'Royal Mail Tracked 48'}
            </span>
          </div>
          {order.tracking_number && (
            <div className="pt-1">
              <span className="text-gray-500 block text-[11px]">Royal Mail Tracking Reference:</span>
              <span className="font-mono font-extrabold text-sm text-brand-blue tracking-wider">
                {order.tracking_number}
              </span>
            </div>
          )}
          <div className="pt-1 text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Delivery Tier:</span>
              <span className="font-semibold capitalize text-gray-800">
                {(order as any).delivery_tier || 'Standard (2-3 Business Days)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Order Status:</span>
              <span className="font-semibold uppercase text-xs text-gray-900">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Provider:</span>
              <span className="font-semibold capitalize text-gray-800">
                {order.payment_method === 'bank_transfer'
                  ? 'BACS Wire Transfer'
                  : order.payment_method === 'paypal'
                  ? 'PayPal Verified'
                  : 'Stripe Secure Card'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="py-6 border-b border-gray-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-900 text-gray-600 font-mono uppercase text-[11px]">
              <th className="py-2.5 pr-2 w-8">#</th>
              <th className="py-2.5 px-2">Title & Specifications</th>
              <th className="py-2.5 px-2 w-28">Catalogue SKU</th>
              <th className="py-2.5 px-2 text-center w-14">Qty</th>
              <th className="py-2.5 px-2 text-right w-24">Unit Price</th>
              <th className="py-2.5 pl-2 text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => (
              <tr key={item.id || idx} className="page-break-avoid">
                <td className="py-3 pr-2 font-mono text-gray-400">{idx + 1}</td>
                <td className="py-3 px-2">
                  <p className="font-bold text-gray-900 text-sm">{item.product_title}</p>
                  <p className="text-[11px] text-gray-500 font-medium">
                    UK Retail Pressing • Region 2 PAL • Collector's Edition
                  </p>
                </td>
                <td className="py-3 px-2 font-mono text-gray-600">{item.product_sku || 'ZDV-UK'}</td>
                <td className="py-3 px-2 text-center font-bold text-gray-900">{item.quantity}</td>
                <td className="py-3 px-2 text-right font-mono text-gray-700">
                  {formatGBP(item.unit_price)}
                </td>
                <td className="py-3 pl-2 text-right font-mono font-bold text-gray-900">
                  {formatGBP(item.total_price || item.unit_price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Breakdown & Tax Notice */}
      <div className="py-6 flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 text-xs">
        {/* Left: Authenticity Guarantee Note */}
        <div className="space-y-3 max-w-sm">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold text-gray-900 block">BBFC Certified & Studio Authenticated</span>
              This physical disc edition is a genuine licensed UK release in original factory casing with BBFC age certification.
            </div>
          </div>
          {order.internal_notes && (
            <p className="text-[11px] text-gray-500 italic">
              Verification: {order.internal_notes}
            </p>
          )}
        </div>

        {/* Right: Totals Table */}
        <div className="w-full sm:w-72 space-y-2 font-medium">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal (Net):</span>
            <span className="font-mono">{formatGBP(netAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>UK VAT (20% included):</span>
            <span className="font-mono">{formatGBP(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery (Royal Mail):</span>
            <span className="font-mono">
              {order.shipping_amount > 0 ? formatGBP(order.shipping_amount) : 'FREE'}
            </span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Promotional Discount:</span>
              <span className="font-mono">-{formatGBP(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t-2 border-gray-900">
            <span>Total Paid (GBP):</span>
            <span className="font-mono text-lg">{formatGBP(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Footer Barcode & Legal Disclaimer */}
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
        <div className="space-y-1">
          <p className="font-semibold text-gray-700">Thank you for supporting physical media and British independent cinema.</p>
          <p>Returns accepted within 30 days of dispatch for unopened items. Terms & Conditions apply.</p>
        </div>

        {/* Packing Scan Monospace Barcode Simulator */}
        <div className="text-center sm:text-right font-mono tracking-widest text-[9px] text-gray-400">
          <div className="h-6 flex items-center justify-end gap-[2px] opacity-70">
            {[3,1,4,2,1,5,2,3,1,4,2,3,1,2,5,1,2,3,4,1,2,1,3].map((w, i) => (
              <span key={i} className="bg-gray-900 h-full inline-block" style={{ width: `${w}px` }} />
            ))}
          </div>
          <span>*{order.order_number}*</span>
        </div>
      </div>
    </div>
  );
};
