import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-center justify-between p-4 bg-dark text-white rounded-md shadow-lg border border-neutral-800 text-sm"
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-brand-red shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-brand-blue shrink-0" />}
              <span className="font-medium tracking-tight text-neutral-100">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
