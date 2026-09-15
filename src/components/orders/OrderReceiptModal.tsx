import React from 'react';
import { Order } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { PrintableReceipt } from './PrintableReceipt';
import { Printer, Download, X } from 'lucide-react';

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
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Order Receipt & Tax Invoice"
      description="Format optimized for A4 paper and PDF archiving."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 no-print">
          <div className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900 font-mono">{order.order_number}</span>
            <span className="hidden sm:inline"> • Ready for printing or PDF export</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>

        {/* The Printable Document */}
        <div className="overflow-y-auto max-h-[70vh] rounded-lg border border-gray-200 bg-gray-100 p-2 sm:p-6">
          <PrintableReceipt order={order} />
        </div>
      </div>
    </Modal>
  );
};
