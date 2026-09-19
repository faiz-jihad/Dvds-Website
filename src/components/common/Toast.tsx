import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  return (
    <div
      className="fixed z-50 pointer-events-none flex flex-col gap-2.5 bottom-4 inset-x-3.5 sm:bottom-6 sm:left-auto sm:right-6 sm:inset-x-auto sm:max-w-sm sm:w-full items-center sm:items-end"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="pointer-events-auto w-full sm:w-auto sm:min-w-[320px] sm:max-w-sm flex items-start gap-3 p-3.5 sm:p-4 bg-[#0a0d14]/95 backdrop-blur-md text-white rounded-xl sm:rounded-2xl shadow-2xl shadow-black/70 border border-white/10 ring-1 ring-white/5"
          >
            {/* Status Icon with subtle ambient badge */}
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <div className="w-6 h-6 rounded-full bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue dark:text-blue-400" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-6 h-6 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-brand-red dark:text-red-400" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-6 h-6 rounded-full bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center">
                  <Info className="w-3.5 h-3.5 text-brand-blue dark:text-blue-400" />
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs sm:text-sm font-medium text-white/95 leading-snug break-words">
                {toast.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
