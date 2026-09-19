import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP } from '../../lib/formatters';
import { QuantitySelector } from './QuantitySelector';
import { Button } from '../common/Button';
import { useCustomerAuth } from '../../auth/CustomerAuth';

export const CartDrawer: React.FC = () => {
  const { isCartDrawerOpen, closeCartDrawer } = useUiStore();
  const { customer } = useCustomerAuth();
  const {
    items,
    removeItem,
    updateQuantity,
    getSubtotal,
    getShippingFee,
    getTotal,
    getFreeShippingProgress,
  } = useCartStore();

  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const shipping = getShippingFee();
  const total = getTotal();
  const progress = getFreeShippingProgress();

  const handleCheckout = () => {
    closeCartDrawer();
    if (!customer) {
      navigate('/login?redirect=/checkout', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCartDrawer}
            className="fixed inset-0 bg-dark/60 backdrop-blur-sm"
          />

          {/* Drawer Body */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="flex w-screen max-w-md flex-col bg-white dark:bg-[#0E131F] text-dark dark:text-white border-l border-transparent dark:border-white/10 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 sm:px-6 sm:py-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-dark dark:text-white stroke-[2]" />
                  <h2 className="font-display font-bold text-base text-dark dark:text-white">
                    Your Basket ({items.reduce((s, i) => s + i.quantity, 0)})
                  </h2>
                </div>
                <button
                  onClick={closeCartDrawer}
                  className="min-h-11 min-w-11 p-1.5 text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                  aria-label="Close basket"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Free UK Delivery Indicator */}
              <div className="bg-gray-50 dark:bg-[#141A26] px-4 py-3 border-b border-gray-100 dark:border-white/10 sm:px-6">
                <div className="flex items-start justify-between gap-2 text-xs mb-1.5">
                  <span className="flex min-w-0 items-start gap-1.5 font-medium text-dark dark:text-white">
                    <Truck className="w-3.5 h-3.5 text-brand-blue" />
                    {progress.threshold <= 0 || progress.remaining <= 0 ? (
                      <span className="text-brand-blue dark:text-blue-400 font-semibold">
                        Free Tracked UK Delivery Applied!
                      </span>
                    ) : (
                      <>
                        Add <strong className="text-brand-blue font-semibold">{formatGBP(progress.remaining)}</strong> for Free UK Delivery
                      </>
                    )}
                  </span>
                  <span className="text-brand-blue dark:text-blue-400 font-mono text-[11px] font-semibold">{progress.threshold <= 0 ? 'FREE' : `${progress.percentage}%`}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-blue transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 divide-y divide-gray-100 dark:divide-white/10">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 mb-4">
                      <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <p className="font-display font-bold text-base text-dark dark:text-white mb-1">
                      Your basket is empty
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] mb-6 leading-relaxed">
                      Discover new releases and rare cinema titles in our DVD vault.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        closeCartDrawer();
                        navigate('/shop');
                      }}
                    >
                      Browse All Titles
                    </Button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="py-4 flex gap-4">
                      {/* DVD Cover thumbnail */}
                      <Link
                        to={`/product/${item.product.slug}`}
                        onClick={closeCartDrawer}
                        className="w-16 aspect-dvd bg-gray-100 dark:bg-[#141A26] rounded-sm overflow-hidden shrink-0 border border-gray-200 dark:border-white/10"
                      >
                        <img
                          src={item.product.cover_image_url}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      {/* Info & controls */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/product/${item.product.slug}`}
                              onClick={closeCartDrawer}
                              className="font-display font-semibold text-xs sm:text-sm text-dark dark:text-white hover:text-brand-blue dark:hover:text-blue-400 line-clamp-1"
                            >
                              {item.product.title}
                            </Link>
                            <button
                              onClick={() => removeItem(item.product_id)}
                              className="-mr-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center text-gray-400 hover:text-brand-red dark:hover:text-red-400 p-1 transition-colors cursor-pointer"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                            {item.product.format} • {item.product.release_year}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2.5">
                          <QuantitySelector
                            size="sm"
                            quantity={item.quantity}
                            max={item.product.stock_quantity}
                            onChange={(qty) => updateQuantity(item.product_id, qty)}
                          />
                          <span className="font-bold text-xs text-dark dark:text-white font-mono">
                            {formatGBP(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer & Checkout */}
              {items.length > 0 && (
                <div className="border-t border-gray-100 dark:border-white/10 p-4 sm:p-6 bg-gray-50/90 dark:bg-[#07090E] space-y-3">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span className="text-dark dark:text-white font-medium font-mono">{formatGBP(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>UK Delivery</span>
                      <span className="text-dark dark:text-white font-medium font-mono">
                        {shipping === 0 ? (
                          <span className="text-brand-blue dark:text-blue-400 font-bold uppercase text-[11px]">FREE</span>
                        ) : (
                          formatGBP(shipping)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-dark dark:text-white pt-2 border-t border-gray-200 dark:border-white/10">
                      <span>Estimated Total</span>
                      <span className="text-base font-mono">{formatGBP(total)}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full justify-center gap-2"
                      onClick={handleCheckout}
                    >
                      <span>{customer ? 'Proceed to Checkout' : 'Sign in to Checkout'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <Link
                      to="/cart"
                      onClick={closeCartDrawer}
                      className="text-center text-xs text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white underline underline-offset-4 py-1"
                    >
                      View Full Basket & Add Promo Code
                    </Link>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Secure Encrypted UK Checkout</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
