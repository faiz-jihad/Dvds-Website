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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center font-bold">
            <Disc className="w-4 h-4 text-brand-blue" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-dark block">
              Order Lifecycle Tracking
            </span>
            <span className="text-[11px] text-gray-500 font-mono">
              Live status: <strong className="uppercase text-brand-blue">{order.status}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">
            Placed {formatDateUK(order.created_at)}
          </span>
          {order.status === 'delivered' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          ) : isBankAwaiting ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
              <Clock className="w-3 h-3" />
              Awaiting Transfer
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900">
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* Interactive Animated Stepper */}
      <Stepper
        currentStep={currentStep}
        stepCircleContainerClassName="border border-gray-200 bg-white rounded-xl shadow-xs"
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
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : isCurrent
                    ? 'bg-brand-blue text-white ring-4 ring-blue-100 shadow-sm'
                    : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
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
                    ? 'text-brand-blue font-extrabold'
                    : isDone
                    ? 'text-gray-900'
                    : 'text-gray-400'
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
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Step 1 of 5
              </span>
              <h4 className="font-bold text-dark text-sm">Order Placed & Confirmed</h4>
              <p className="text-gray-600">
                Order reference <span className="font-mono font-bold text-dark">{order.order_number}</span> has been authenticated and recorded.
              </p>
            </div>
            <span className="text-[11px] font-mono text-gray-500 bg-white px-2.5 py-1 rounded border border-gray-200">
              {formatDateUK(order.created_at)}
            </span>
          </div>
        </Step>

        {/* Step 2: Payment Received */}
        <Step>
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              isBankAwaiting
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-gray-50/70 border-gray-200 text-gray-700'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Step 2 of 5
              </span>
              <h4 className="font-bold text-dark text-sm">
                {isBankAwaiting ? 'Awaiting Bank Transfer Payment' : 'Payment Verified & Captured'}
              </h4>
              <p className="text-gray-600">
                {isBankAwaiting
                  ? `Please transfer total amount to Barclays account with reference ${order.order_number}.`
                  : `Transaction confirmed via ${order.payment_method === 'paypal' ? 'PayPal' : 'Stripe Secure Infrastructure'}.`}
              </p>
            </div>
            <span
              className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${
                isBankAwaiting ? 'bg-amber-200/80 text-amber-950' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {order.payment_status.replace('_', ' ')}
            </span>
          </div>
        </Step>

        {/* Step 3: Packing & Quality Inspection */}
        <Step>
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Step 3 of 5
              </span>
              <h4 className="font-bold text-dark text-sm">Physical Media Quality Check & Packing</h4>
              <p className="text-gray-600">
                Collector editions retrieved from warehouse archives, inspected for BBFC compliance, and safely packed in protective transit cartons.
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase text-brand-blue bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              Studio Verification
            </span>
          </div>
        </Step>

        {/* Step 4: Dispatched (Royal Mail) */}
        <Step>
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                Step 4 of 5
              </span>
              <h4 className="font-bold text-dark text-sm">Dispatched with Royal Mail Tracked 48</h4>
              <p className="text-gray-600">
                Parcel is in transit across the UK postal network.
              </p>
              {order.tracking_number && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="font-mono font-bold text-dark text-sm">{order.tracking_number}</span>
                  <a
                    href={`https://www.royalmail.com/track-your-item#/tracking-results/${order.tracking_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue hover:underline bg-white px-2 py-0.5 rounded border border-brand-blue/30"
                  >
                    <span>Track Live</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
            <span className="text-[11px] font-mono text-gray-500 bg-white px-2.5 py-1 rounded border border-gray-200">
              Royal Mail Tracked
            </span>
          </div>
        </Step>

        {/* Step 5: Delivered */}
        <Step>
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Step 5 of 5
              </span>
              <h4 className="font-bold text-dark text-sm">Delivered to Recipient Address</h4>
              <p className="text-gray-600">
                Successfully delivered to {order.shipping_address?.full_name}, {order.shipping_address?.postcode}.
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              Package Delivered
            </span>
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
