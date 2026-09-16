import React from 'react';
import { Order } from '../../types';
import { formatGBP, formatDateUK } from '../../lib/formatters';

export const PrintableReceipt: React.FC<{ order: Order; className?: string }> = ({ order, className = '' }) => (
  <article id="printable-receipt" className={`printable-receipt-content bg-white text-gray-900 p-6 sm:p-10 max-w-[850px] mx-auto print:p-0 ${className}`}>
    <header className="flex flex-wrap justify-between gap-4 border-b-2 border-gray-900 pb-6">
      <div><h1 className="text-xl font-bold">AZ Rayan DVDs</h1><p className="text-sm mt-1">Order receipt</p></div>
      <div className="text-sm"><p className="font-mono font-bold">{order.order_number}</p><p className="mt-1">{formatDateUK(order.created_at)}</p><p className="mt-2 capitalize">Payment: {order.payment_status.replace(/_/g, ' ')}</p></div>
    </header>
    <div className="grid grid-cols-2 gap-6 py-6 text-sm">
      <section><h2 className="font-semibold mb-2">Delivery address</h2><address className="not-italic leading-relaxed">{order.shipping_address.full_name}<br />{order.shipping_address.address_line_1}<br />{order.shipping_address.address_line_2 && <>{order.shipping_address.address_line_2}<br /></>}{order.shipping_address.city}, {order.shipping_address.postcode}<br />{order.shipping_address.country}</address><p className="mt-2 break-all">{order.email}</p></section>
      <section><h2 className="font-semibold mb-2">Order status</h2><p className="capitalize">{order.status}</p><p className="mt-2">{order.delivery_name || order.shipping_carrier || 'Delivery service not recorded'}</p>{order.tracking_number && <p className="font-mono mt-2 break-all">Tracking: {order.tracking_number}</p>}<p className="mt-2">{order.payment_method === 'bank_transfer' ? 'Bank transfer' : order.payment_method === 'paypal' ? 'PayPal' : 'Card'}</p>{order.paid_at && <p className="mt-2">Payment received: {formatDateUK(order.paid_at)}</p>}</section>
    </div>
    <table className="w-full text-sm border-collapse"><thead><tr className="border-y border-gray-300 text-left"><th className="py-3">Title</th><th className="py-3 text-center">Qty</th><th className="py-3 text-right">Unit price</th><th className="py-3 text-right">Amount</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id} className="border-b border-gray-100"><td className="py-3 pr-3">{item.product_title}<span className="block text-xs text-gray-500 mt-1">{item.product_sku}</span></td><td className="py-3 text-center">{item.quantity}</td><td className="py-3 text-right">{formatGBP(item.unit_price)}</td><td className="py-3 text-right">{formatGBP(item.total_price)}</td></tr>)}</tbody></table>
    <dl className="ml-auto max-w-xs space-y-3 py-6 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatGBP(order.subtotal)}</dd></div>
      <div className="flex justify-between"><dt>Delivery</dt><dd>{formatGBP(order.shipping_amount)}</dd></div>
      {order.discount_amount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>-{formatGBP(order.discount_amount)}</dd></div>}
      <div className="flex justify-between pt-3 border-t border-gray-300 font-bold text-base"><dt>Order total (GBP)</dt><dd>{formatGBP(order.total_amount)}</dd></div>
      {Number(order.refunded_amount) > 0 && <div className="flex justify-between"><dt>Refunded</dt><dd>{formatGBP(order.refunded_amount!)}</dd></div>}
    </dl>
    <footer className="border-t border-gray-200 pt-5 text-xs text-gray-500">Keep this reference for any queries about your order: {order.order_number}.</footer>
  </article>
);
