import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, Truck, ShieldCheck, Tag, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { formatGBP } from '../lib/formatters';
import { QuantitySelector } from '../components/commerce/QuantitySelector';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { useCustomerAuth } from '../auth/CustomerAuth';

export const CartPage: React.FC = () => {
  const { customer } = useCustomerAuth();
  const {
    items,
    removeItem,
    updateQuantity,
    getSubtotal,
    getShippingFee,
    getDiscountAmount,
    getTotal,
    getFreeShippingProgress,
    appliedPromoCode,
    applyPromo,
    removePromo,
  } = useCartStore();

  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const shipping = getShippingFee();
  const discount = getDiscountAmount();
  const total = getTotal();
  const progress = getFreeShippingProgress();

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyPromo(promoInput);
    setPromoMessage({ text: res.message, isError: !res.success });
    if (res.success) setPromoInput('');
  };

  if (items.length === 0) {
    return (
      <div className="py-20 bg-[#F8FAFC] dark:bg-[#07090E] min-h-[60vh] flex items-center justify-center transition-colors">
        <EmptyState
          title="Your basket is empty"
          description="You haven't selected any films yet. Explore our curated catalogue of new releases and timeless classics."
          actionText="Explore DVD Catalogue"
          actionHref="/shop"
          icon={<ShoppingBag className="w-8 h-8 stroke-[1.5]" />}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-6 sm:py-10 transition-colors">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        <div className="pb-6 mb-8 border-b border-gray-200 dark:border-white/10">
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400">
            Your Selection
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark dark:text-white tracking-tight mt-1">
            Shopping Basket ({items.reduce((sum, i) => sum + i.quantity, 0)} items)
          </h1>
        </div>

        {/* Free Shipping Progress Alert */}
        <div className="mb-8 p-4 bg-white dark:bg-[#0E131F] border border-gray-200 dark:border-white/10 rounded-xl shadow-xs">
          <div className="flex items-start justify-between gap-3 text-xs mb-2">
            <span className="flex min-w-0 items-start gap-2 font-medium text-dark dark:text-gray-200">
              <Truck className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
              {progress.threshold <= 0 || progress.remaining <= 0 ? (
                <span className="text-brand-blue dark:text-blue-400 font-bold">
                  Free Tracked UK Delivery applied — 100% complimentary shipping on all UK orders.
                </span>
              ) : (
                <>
                  Add <strong className="text-brand-blue dark:text-blue-400 font-bold">{formatGBP(progress.remaining)}</strong> more to qualify for Free UK Delivery
                </>
              )}
            </span>
            <span className="font-mono text-brand-blue dark:text-blue-400 font-semibold">{progress.threshold <= 0 ? 'FREE' : `${progress.percentage}%`}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-blue dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Basket Items List */}
          <div className="lg:col-span-8 divide-y divide-gray-200 dark:divide-white/10">
            {items.map((item) => (
              <div key={item.id} className="py-5 flex gap-4 items-start sm:gap-6 sm:py-6">
                <Link
                  to={`/product/${item.product.slug}`}
                  className="w-20 sm:w-24 aspect-dvd bg-gray-100 dark:bg-[#141A26] rounded-sm overflow-hidden shrink-0 border border-gray-200 dark:border-white/10"
                >
                  <img
                    src={item.product.cover_image_url}
                    alt={item.product.title}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <Link
                      to={`/product/${item.product.slug}`}
                      className="font-display font-semibold text-base text-dark dark:text-white hover:text-brand-blue dark:hover:text-blue-400 line-clamp-1 transition-colors"
                    >
                      {item.product.title}
                    </Link>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                      Format: <span className="text-dark dark:text-gray-200 font-medium">{item.product.format}</span> • Year: {item.product.release_year}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                      Unit price: {formatGBP(item.unit_price)}
                    </div>

                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="mt-3 text-xs text-brand-red hover:underline flex items-center gap-1 font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove from basket
                    </button>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-3">
                    <QuantitySelector
                      quantity={item.quantity}
                      max={item.product.stock_quantity}
                      onChange={(q) => updateQuantity(item.product_id, q)}
                    />
                    <span className="font-bold text-base text-dark dark:text-white font-mono">
                      {formatGBP(item.unit_price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Summary Card */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-[#0E131F] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-white/10 space-y-5 shadow-xs">
              <h3 className="font-display font-bold text-base text-dark dark:text-white pb-3 border-b border-gray-200 dark:border-white/10">
                Order Summary
              </h3>

              {/* Promo Code Form */}
              <div>
                <form onSubmit={handleApplyPromo} className="flex flex-col gap-2 min-[380px]:flex-row">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Enter promo code"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#141A26] border border-gray-300 dark:border-white/15 rounded-md text-xs uppercase font-mono text-dark dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-brand-blue dark:focus:border-blue-500"
                  />
                  <Button variant="secondary" size="sm" type="submit" className="min-[380px]:shrink-0">
                    Apply
                  </Button>
                </form>

                {promoMessage && (
                  <p className={`text-xs mt-1.5 font-medium ${promoMessage.isError ? 'text-brand-red' : 'text-brand-blue dark:text-blue-400'}`}>
                    {promoMessage.text}
                  </p>
                )}

                {appliedPromoCode && (
                  <div className="flex items-center justify-between text-xs bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-1.5 rounded-md mt-2">
                    <span className="font-mono font-bold">PROMO: {appliedPromoCode}</span>
                    <button onClick={removePromo} className="text-dark dark:text-gray-300 hover:text-brand-red underline text-[11px]">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs pt-2 border-t border-gray-200 dark:border-white/10">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium text-dark dark:text-white">{formatGBP(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-brand-red font-medium">
                    <span>Discount</span>
                    <span className="font-mono">- {formatGBP(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>UK Tracked Delivery</span>
                  <span className="font-mono font-medium text-dark dark:text-white">
                    {shipping === 0 ? (
                      <span className="text-brand-blue dark:text-blue-400 font-bold uppercase text-[11px]">FREE</span>
                    ) : (
                      formatGBP(shipping)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-dark dark:text-white pt-3 border-t border-gray-200 dark:border-white/10">
                  <span>Total Due</span>
                  <span className="font-mono">{formatGBP(total)}</span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Includes VAT where applicable.</p>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center gap-2"
                onClick={() => {
                  if (!customer) {
                    navigate('/login?redirect=/checkout', { state: { from: '/checkout' } });
                  } else {
                    navigate('/checkout');
                  }
                }}
              >
                <span>{customer ? 'Proceed to Checkout' : 'Sign in to Checkout'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              {!customer && (
                <p className="text-[11px] text-center text-gray-500 dark:text-gray-400 bg-gray-100/80 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-lg py-2 px-3">
                  Account sign-in is required at checkout to protect your order &amp; tracking.
                </p>
              )}

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-blue dark:text-blue-400" />
                <span>Tracked delivery • Server-verified shipping rates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
