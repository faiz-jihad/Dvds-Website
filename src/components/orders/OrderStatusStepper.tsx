import React from 'react';
import { Order } from '../../types';
import Stepper, { Step } from '../common/Stepper';
import { formatDateUK } from '../../lib/formatters';
import {
  CheckCircle2,
  CreditCard,
  Package,
  Truck,
  MapPin,
  ExternalLink,
  Clock,
  AlertTriangle,
  Disc,
} from 'lucide-react';

interface OrderStatusStepperProps {
  order: Order;
  className?: string;
}

export const OrderStatusStepper: React.FC<OrderStatusStepperProps> = ({ order, className = '' }) => {
  // Determine active step index based on order status and payment status
  const getInitialStep = (): number => {
    if (order.status === 'delivered') return 5;
    if (order.status === 'dispatched') return 4;
    if (order.status === 'processing') return 3;
    if (order.payment_status === 'paid') return 2;
    if (order.payment_method === 'bank_transfer' && order.payment_status === 'awaiting_payment') return 2;
    return 1;
  };

  const currentStep = getInitialStep();
  const isBankAwaiting = order.payment_method === 'bank_transfer' && order.payment_status === 'awaiting_payment';

  const stepLabels = [
    { title: 'Confirmed', icon: CheckCircle2 },
    { title: 'Payment', icon: CreditCard },
    { title: 'Processing', icon: Package },
    { title: 'Dispatched', icon: Truck },
    { title: 'Delivered', icon: MapPin },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header bar with summary badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-400 flex items-center justify-center font-bold">
            <Disc className="w-4 h-4 text-brand-blue dark:text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-dark dark:text-white block">
              Order Lifecycle Tracking
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
              Live status: <strong className="uppercase text-brand-blue dark:text-blue-400">{order.status}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            Placed {formatDateUK(order.created_at)}
          </span>
          {order.status === 'delivered' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand-blue dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          ) : order.status === 'cancelled' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-red-soft dark:bg-brand-red/20 text-brand-red dark:text-red-300 border border-brand-red/30">
              <Clock className="w-3 h-3" />
              Cancelled / Expired
            </span>
          ) : isBankAwaiting ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-red-soft dark:bg-brand-red/20 text-brand-red dark:text-red-300 border border-brand-red/30 animate-pulse">
              <Clock className="w-3 h-3" />
              Awaiting Transfer
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand-blue dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* Interactive Animated Stepper */}
      <Stepper
        currentStep={currentStep}
        stepCircleContainerClassName="border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] rounded-xl shadow-xs"
        stepContainerClassName="px-4 py-4 sm:px-6"
        contentClassName="px-2"
        hideFooter={true}
        renderStepIndicator={({ step, currentStep: activeStep, onStepClick }) => {
          const isDone = activeStep > step;
          const isCurrent = activeStep === step;
          const StepIcon = stepLabels[step - 1]?.icon || CheckCircle2;

          return (
            <div
              onClick={() => onStepClick(step)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
              title={`Step ${step}: ${stepLabels[step - 1]?.title}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : isCurrent
                    ? 'bg-brand-blue text-white ring-4 ring-blue-100 dark:ring-blue-900/40 shadow-sm'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-white/15 group-hover:text-gray-600 dark:group-hover:text-gray-200'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-tight hidden min-[400px]:inline-block ${
                  isCurrent
                    ? 'text-brand-blue dark:text-blue-400 font-extrabold'
                    : isDone
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {stepLabels[step - 1]?.title}
              </span>
            </div>
          );
        }}
      >
        {/* Step 1: Order Confirmed */}
        <Step>
          <div className="bg-gray-50/70 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Step 1 of 5
              </span>
              <h4 className="font-bold text-dark dark:text-white text-sm">Order Placed &amp; Confirmed</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Order reference <span className="font-mono font-bold text-dark dark:text-white">{order.order_number}</span> has been authenticated and recorded.
              </p>
            </div>
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-[#141A26] px-2.5 py-1 rounded border border-gray-200 dark:border-white/10">
              {formatDateUK(order.created_at)}
            </span>
          </div>
        </Step>

        {/* Step 2: Payment Received */}
        <Step>
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              isBankAwaiting
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                : 'bg-gray-50/70 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Step 2 of 5
              </span>
              <h4 className="font-bold text-dark dark:text-white text-sm">
                {isBankAwaiting ? 'Awaiting Bank Transfer Payment' : 'Payment Verified & Captured'}
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                {isBankAwaiting
                  ? `Please transfer total amount to Barclays account with reference ${order.order_number}.`
                  : `Transaction confirmed via ${order.payment_method === 'paypal' ? 'PayPal' : 'Stripe Secure Infrastructure'}.`}
              </p>
            </div>
            <span
              className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${
                isBankAwaiting
                  ? 'bg-brand-red-soft dark:bg-brand-red/20 text-brand-red dark:text-red-300 border border-brand-red/30'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-brand-blue dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
              }`}
            >
              {order.payment_status.replace('_', ' ')}
            </span>
          </div>
        </Step>

        {/* Step 3: Packing & Quality Inspection */}
        <Step>
          <div className="bg-gray-50/70 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Step 3 of 5
              </span>
              <h4 className="font-bold text-dark dark:text-white text-sm">Physical Media Quality Check &amp; Packing</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Collector editions retrieved from warehouse archives, inspected for BBFC compliance, and safely packed in protective transit cartons.
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase text-brand-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-900/40">
              Studio Verification
            </span>
          </div>
        </Step>

        {/* Step 4: Dispatched (Royal Mail) */}
        <Step>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue dark:text-blue-400">
                Step 4 of 5
              </span>
              <h4 className="font-bold text-dark dark:text-white text-sm">Dispatched with Royal Mail Tracked 48</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Parcel is in transit across the UK postal network.
              </p>
              {order.tracking_number && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="font-mono font-bold text-dark dark:text-white text-sm">{order.tracking_number}</span>
                  <a
                    href={`https://www.royalmail.com/track-your-item#/tracking-results/${order.tracking_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue dark:text-blue-400 hover:underline bg-white dark:bg-[#141A26] px-2 py-0.5 rounded border border-brand-blue/30 dark:border-brand-blue/50"
                  >
                    <span>Track Live</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-[#141A26] px-2.5 py-1 rounded border border-gray-200 dark:border-white/10">
              Royal Mail Tracked
            </span>
          </div>
        </Step>

        {/* Step 5: Delivered */}
        <Step>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue dark:text-blue-400">
                Step 5 of 5
              </span>
              <h4 className="font-bold text-dark dark:text-white text-sm">Delivered to Recipient Address</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Successfully delivered to {order.shipping_address?.full_name}, {order.shipping_address?.postcode}.
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase text-brand-blue dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200/60 dark:border-blue-900/40">
              Package Delivered
            </span>
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
