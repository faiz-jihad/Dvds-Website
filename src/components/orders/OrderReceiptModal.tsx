import React from "react";
import { createPortal } from "react-dom";
import { Order } from "../../types";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { PrintableReceipt } from "./PrintableReceipt";
import { Printer, Download, CheckCircle2 } from "lucide-react";

interface OrderReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!order || order.status === "cancelled") return null;

  const handlePrint = () => {
    // Small timeout ensures focus/paint state is idle before invoking native dialog
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const isPaid = order.payment_status === "paid";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Official Order Receipt"
        description="A4 print & PDF formatted invoice with full order, payment, and delivery details."
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Top Control Bar (Hidden on print) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-[#141A26] p-3.5 rounded-xl border border-gray-200 dark:border-white/10 no-print">
            <div className="flex items-center gap-2.5">
              <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                {order.order_number}
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                  isPaid
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                }`}
              >
                {isPaid && <CheckCircle2 className="w-3 h-3" />}
                {order.payment_status.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 shadow-sm cursor-pointer bg-brand-blue hover:bg-brand-blue-hover text-white font-bold"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>

          {/* On-screen Preview Frame simulating clean A4 paper */}
          <div className="overflow-y-auto max-h-[70vh] rounded-xl border border-gray-200 dark:border-white/10 bg-gray-200/70 dark:bg-black/60 p-2 sm:p-6 no-print">
            <div className="shadow-2xl rounded-sm overflow-hidden bg-white max-w-[820px] mx-auto border border-gray-300">
              <PrintableReceipt order={order} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Dedicated Portal for Clean, Isolated A4 Print Output */}
      {typeof document !== "undefined" &&
        createPortal(
          <div id="print-only-container">
            <PrintableReceipt order={order} />
          </div>,
          document.body,
        )}
    </>
  );
};
