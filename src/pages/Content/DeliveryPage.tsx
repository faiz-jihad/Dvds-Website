import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Truck,
  Clock,
  ShieldCheck,
  Mail,
  Phone,
  ChevronDown,
  ArrowRight,
  HelpCircle,
  Package,
  MapPin,
  Check
} from 'lucide-react';
import { publicApi } from '../../lib/publicApi';
import { formatGBP } from '../../lib/formatters';
import { StoreDataState } from '../../components/common/StoreDataState';
import { Seo } from '../../components/common/Seo';

export const DeliveryPage: React.FC = () => {
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => publicApi.getStoreSettings() });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (settingsQuery.isLoading || settingsQuery.error || !settingsQuery.data) {
    return (
      <StoreDataState
        loading={settingsQuery.isLoading}
        error={settingsQuery.error || (!settingsQuery.data ? new Error('Delivery information is currently unavailable.') : null)}
        retry={() => settingsQuery.refetch()}
      />
    );
  }

  const settings = settingsQuery.data;

  const faqs = [
    {
      q: 'Is standard delivery really 100% free on every order?',
      a: 'Yes. Every order to any UK postal address qualifies for free standard Royal Mail delivery. There is no minimum spend and no hidden packaging surcharge at checkout.',
    },
    {
      q: 'When will my order arrive?',
      a: 'Orders placed on weekdays before 2:00 PM are dispatched the same day. Royal Mail delivers to your address within 2 working days.',
    },
    {
      q: 'Do I need to be home to receive my DVDs?',
      a: 'Single and double DVDs are packed in slim, protective bubble mailers designed to fit neatly through standard UK letterboxes, so you don’t need to wait in for the postie. Larger TV box sets may require someone to be in or will be left in a safe place / local delivery office.',
    },
    {
      q: 'Do you deliver to Northern Ireland, the Scottish Highlands & Islands?',
      a: 'Yes, 100% free delivery covers the entire United Kingdom — England, Scotland, Wales, Northern Ireland, the Channel Islands, and the Isle of Man.',
    },
    {
      q: 'What happens if my disc or case arrives damaged?',
      a: 'We inspect every item before packaging, but transit accidents happen. If a case or disc arrives damaged, email azrayanltd@gmail.com with your order number and we will arrange a quick replacement or refund.',
    },
  ];

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-8 sm:py-16 text-dark dark:text-white transition-colors">
      <Seo
        title="Delivery Information — 100% Free UK Delivery | DVD ZONE"
        description="All orders 100% free standard delivery across United Kingdom. Dispatched same day, delivered to your address within 2 working days via Royal Mail."
        canonicalPath="/delivery"
        siteName="DVD ZONE"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6 stroke-[1.75]" />
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
            POSTAGE &amp; DISPATCH
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-dark dark:text-white tracking-tight">
            UK Delivery Information
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
            All orders include 100% free standard UK delivery via Royal Mail, dispatched the same working day.
          </p>
        </div>


        {/* Delivery Options */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 shadow-xs space-y-5">
          <h2 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
            Delivery Options &amp; Rates
          </h2>

          <div className="space-y-3">
            {/* Free Standard Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-dark dark:text-white text-sm">
                    {settings.standard_shipping_name || 'Standard UK Delivery (Royal Mail)'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    Free on all orders
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {settings.standard_shipping_eta || 'Delivered within 2 working days'}. Orders placed before {settings.dispatch_cutoff_time || '2:00 PM'} are dispatched the same day.
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="font-display font-extrabold text-base text-emerald-700 dark:text-emerald-400">
                  {settings.free_shipping_threshold != null && settings.free_shipping_threshold > 0
                    ? `FREE over ${formatGBP(settings.free_shipping_threshold)}`
                    : 'FREE'}
                </span>
              </div>
            </div>

            {/* Express Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-dark dark:text-white text-sm">
                    {settings.express_shipping_name || 'Express Next Working Day'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                    Optional
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {settings.express_shipping_eta || '1 working day'} (Order by {settings.dispatch_cutoff_time || '2:00 PM'}).
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0 font-mono font-bold text-dark dark:text-white text-sm">
                {formatGBP(settings.express_shipping_fee || 4.99)}
              </div>
            </div>
          </div>
        </div>

        {/* Practical Delivery Details: Letterbox Packaging & Dispatch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-dark dark:text-white text-sm">
              Letterbox-Friendly Packaging
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Standard 1–2 disc orders are sent in reinforced, bubble-lined mailers that slide right through regular UK letterboxes. No waiting around at home for the delivery.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-dark dark:text-white text-sm">
              Same-Day Dispatch Cut-Off
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              We dispatch Monday to Friday. Orders received before {settings.dispatch_cutoff_time || '2:00 PM'} are carefully packed and handed to Royal Mail that afternoon. Weekend orders leave first thing Monday.
            </p>
          </div>
        </div>

        {/* Dispatch Hub & Customer Contact */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 sm:p-6 shadow-xs space-y-3">
          <h3 className="font-display font-bold text-sm sm:text-base text-dark dark:text-white">
            Dispatch Hub &amp; Customer Support
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600 dark:text-gray-300 pt-1">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-dark dark:text-white">
                <MapPin className="w-3.5 h-3.5 text-brand-blue dark:text-blue-400" />
                <span>Headquarter &amp; Vault</span>
              </div>
              <p>{settings.store_name || 'DVD ZONE'}</p>
              <p>{settings.warehouse_location || settings.registered_office_address || 'West Midlands, Birmingham, United Kingdom'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-dark dark:text-white">
                <Mail className="w-3.5 h-3.5 text-brand-blue dark:text-blue-400" />
                <span>Email Inquiries</span>
              </div>
              <a href={`mailto:${settings.support_email || 'azrayanltd@gmail.com'}`} className="text-brand-blue dark:text-blue-400 hover:underline block font-mono">
                {settings.support_email || 'azrayanltd@gmail.com'}
              </a>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Replies usually within a few hours</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-dark dark:text-white">
                <Phone className="w-3.5 h-3.5 text-brand-blue dark:text-blue-400" />
                <span>Customer Line</span>
              </div>
              <a href={`tel:${settings.support_phone || '00447400320038'}`} className="text-brand-blue dark:text-blue-400 hover:underline block font-mono">
                {settings.support_phone || '00447400320038'}
              </a>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Mon–Fri 9:00 AM – 5:00 PM</p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-blue dark:text-blue-400" />
            <h2 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-white/10 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#0E131F] overflow-hidden shadow-xs">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-dark dark:text-white hover:text-brand-blue dark:hover:text-blue-400 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-brand-blue' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shop CTA */}
        <div className="text-center pt-2">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-xs sm:text-sm shadow-xs transition-transform active:scale-[0.98]"
          >
            <span>Browse DVD Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            100% free Royal Mail standard delivery is applied automatically to your cart.
          </p>
        </div>
      </div>
    </div>
  );
};

