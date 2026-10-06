import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ArrowRight, ShieldCheck, XCircle } from 'lucide-react';
import { checkoutApi } from '../lib/checkoutApi';
import { useThemeStore } from '../stores/useThemeStore';

export const CheckoutCancelPage: React.FC = () => {
  const [search] = useSearchParams();
  const orderId = search.get('order_id');
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (orderId) {
      // Best-effort cancellation: release reserved stock back to store inventory
      checkoutApi.cancel(orderId).catch(() => {});
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white flex flex-col justify-center items-center px-4 py-16 transition-colors">
      <div className="w-full max-w-lg bg-white dark:bg-[#0F1523] border border-gray-200 dark:border-white/10 rounded-2xl p-8 sm:p-10 shadow-xl text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <XCircle className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
          Checkout Cancelled
        </h1>

        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
          Your payment was not completed and <strong>no charges were made</strong> to your account.
          Your basket items have been safely saved.
        </p>

        <div className="bg-gray-50 dark:bg-[#141B2D] rounded-xl p-4 mb-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>No payment details were stored. You can resume checkout anytime.</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/checkout"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            <span>Return to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-dark dark:text-white font-semibold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancelPage;
