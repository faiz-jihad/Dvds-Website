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
  Package,
  MapPin,
  CheckCircle2,
  Sparkles,
  Zap,
  Box,
  BadgeCheck
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { publicApi } from '../../lib/publicApi';
import { formatGBP } from '../../lib/formatters';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';
import { Seo, toAbsoluteUrl } from '../../components/common/Seo';

export const DeliveryPage: React.FC = () => {
  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: () => publicApi.getStoreSettings(),
    staleTime: 60_000,
  });

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;
  const storeName = settings.store_name || 'DVDs Zone';
  const cutoffTime = settings.dispatch_cutoff_time || '2:00 PM';
  const supportEmail = settings.support_email || 'azrayanltd@gmail.com';
  const supportPhone = settings.support_phone || '00447400320038';

  const faqs = [
    {
      q: 'Is standard delivery really 100% free on every UK order?',
      a: 'Yes. Every order to any UK postal address qualifies for free standard Royal Mail delivery. There is no minimum spend and no hidden packaging surcharge at checkout.',
    },
    {
      q: 'When will my order arrive?',
      a: `Orders placed on working days before ${cutoffTime} are dispatched the same afternoon. Royal Mail 48 delivers to your address within 2 working days.`,
    },
    {
      q: 'Do I need to be home to receive my DVDs?',
      a: 'Single and double DVDs are packed in slim, protective bubble mailers designed to fit neatly through standard UK letterboxes, so you don’t need to wait in for the postie. Larger TV box sets are securely boxed and left in a safe place or at your local delivery office if you are out.',
    },
    {
      q: 'Do you deliver to Northern Ireland, the Scottish Highlands & Islands?',
      a: 'Yes, 100% free delivery covers the entire United Kingdom — England, Scotland, Wales, Northern Ireland, the Scottish Highlands & Islands, the Channel Islands, and the Isle of Man with zero geographic surcharges.',
    },
    {
      q: 'What happens if my disc or case arrives damaged?',
      a: `We inspect every item before packaging, but transit accidents happen. If a case or disc arrives damaged, email ${supportEmail} with your order reference and we will arrange an immediate replacement or refund.`,
    },
  ];

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-10 sm:py-16 text-dark dark:text-white transition-colors duration-200 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(23,105,224,0.15),transparent)] pointer-events-none" />

      <Seo
        title={`Delivery Information — 100% Free UK Delivery | ${storeName}`}
        description={`All orders qualify for 100% free standard UK delivery via Royal Mail. Dispatched same day before ${cutoffTime}, delivered in 2 working days.`}
        canonicalPath="/delivery"
        keywords={`free UK delivery DVDs, Royal Mail DVD shipping, same day DVD dispatch, UK postage rates, fast DVD shipping UK, ${storeName}`}
        siteName={storeName}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${storeName} UK Delivery Information`,
          description: 'Free standard UK delivery on all DVD purchases via Royal Mail.',
          url: toAbsoluteUrl('/delivery'),
          provider: {
            '@type': 'Organization',
            name: storeName,
            url: toAbsoluteUrl('/'),
          },
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 relative z-10">
        {/* ── 1. Hero Header ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase shadow-2xs">
            <BadgeCheck className="w-3.5 h-3.5" />
            <span>100% FREE UK POSTAGE ON ALL ORDERS · NO MINIMUM SPEND</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-dark dark:text-white tracking-tight leading-[1.1]">
            Fast, Free &amp; Reliable{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              UK Delivery
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            Every physical release leaves our UK vault carefully packaged for pristine transit. Orders placed before {cutoffTime} on weekdays are handed directly to Royal Mail that afternoon.
          </p>
        </div>

        {/* ── 2. Delivery Options Tiers ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tier 1: Free Standard (Royal Mail 48) */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-white dark:bg-[#0E131F] p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white font-mono font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-xs">
              Default Option
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Truck className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-dark dark:text-white">
                    {settings.standard_shipping_name || 'Standard UK Tracked (Royal Mail)'}
                  </h3>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    100% Free on all UK orders
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <div className="font-display font-black text-3xl sm:text-4xl text-emerald-600 dark:text-emerald-400">
                  FREE
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Estimated Delivery: {settings.standard_shipping_eta || '2 working days'}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-white/10">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>No minimum purchase required</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dispatched same day before {cutoffTime}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Full coverage: England, Scotland, Wales &amp; NI</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Letterbox-friendly bubble mailer</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4 border-t border-gray-100 dark:border-white/10">
              <Link to="/shop" className="block w-full">
                <Button variant="primary" className="w-full justify-center">
                  Shop Vault with Free Delivery
                </Button>
              </Link>
            </div>
          </div>

          {/* Tier 2: Express Tracked 24 */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center">
                  <Zap className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-dark dark:text-white">
                    {settings.express_shipping_name || 'Express Next Working Day'}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Priority Royal Mail 24 Tracked
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <div className="font-display font-black text-3xl sm:text-4xl text-dark dark:text-white font-mono">
                  {formatGBP(settings.express_shipping_fee || 4.99)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Estimated Delivery: {settings.express_shipping_eta || '1 working day'}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-white/10">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0" />
                  <span>Priority packing &amp; express sorting queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0" />
                  <span>Dispatched same day when ordered before {cutoffTime}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0" />
                  <span>Full doorstep tracking with SMS / email updates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0" />
                  <span>Selectable during checkout</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4 border-t border-gray-100 dark:border-white/10">
              <Link to="/shop" className="block w-full">
                <Button variant="secondary" className="w-full justify-center">
                  Explore Cinema Catalogue
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 3. Four Guarantees Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center">
              <Package className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h4 className="font-display font-bold text-sm text-dark dark:text-white">Letterbox Friendly</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Slim reinforced packaging slides right through standard UK letterboxes without you needing to wait at home.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Clock className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h4 className="font-display font-bold text-sm text-dark dark:text-white">{cutoffTime} Cut-Off</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Orders placed before {cutoffTime} Monday to Friday leave our UK fulfillment facility on the same afternoon.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MapPin className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h4 className="font-display font-bold text-sm text-dark dark:text-white">Full UK Coverage</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Zero remote surcharges. England, Wales, Scotland, NI, Highlands, Islands &amp; Channel Islands are all 100% free.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h4 className="font-display font-bold text-sm text-dark dark:text-white">Transit Guarantee</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Every shipment is covered. In the rare event of transit damage, an immediate replacement is provided free of charge.
            </p>
          </div>
        </div>

        {/* ── 4. Dispatch Vault Details & Customer Line ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
              UK WAREHOUSE &amp; DISPATCH VAULT
            </span>
            <h3 className="font-display font-bold text-xl text-dark dark:text-white">
              Packaging &amp; Fulfillment Integrity
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-white/10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-dark dark:text-white">
                <MapPin className="w-4 h-4 text-brand-blue" />
                <span>UK Dispatch Hub</span>
              </div>
              <p className="leading-relaxed pl-6">
                {storeName} — {settings.warehouse_location || settings.registered_office_address || 'United Kingdom'}
              </p>
              <p className="text-[11px] text-gray-400 pl-6">Dispatched via Royal Mail Hubs</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-dark dark:text-white">
                <Mail className="w-4 h-4 text-brand-blue" />
                <span>Delivery Support</span>
              </div>
              <p className="pl-6">
                <a href={`mailto:${supportEmail}`} className="text-brand-blue dark:text-blue-400 hover:underline font-mono">
                  {supportEmail}
                </a>
              </p>
              <p className="text-[11px] text-gray-400 pl-6">Tracking lookups &amp; address adjustments</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-dark dark:text-white">
                <Phone className="w-4 h-4 text-brand-blue" />
                <span>Customer Helpline</span>
              </div>
              <p className="pl-6">
                <a href={`tel:${supportPhone}`} className="text-brand-blue dark:text-blue-400 hover:underline font-mono font-bold">
                  {supportPhone}
                </a>
              </p>
              <p className="text-[11px] text-gray-400 pl-6">Monday–Friday 9:00 AM – 5:00 PM</p>
            </div>
          </div>
        </div>

        {/* ── 5. Delivery FAQs ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-10 shadow-xs space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
              POSTAGE INQUIRIES
            </span>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-dark dark:text-white">
              Delivery Frequently Asked Questions
            </h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-white/10 border-y border-gray-100 dark:border-white/10">
            {faqs.map((faq, i) => (
              <div key={faq.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left font-display font-bold text-sm sm:text-base text-dark dark:text-white hover:text-brand-blue dark:hover:text-blue-400 transition-colors cursor-pointer py-1"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180 text-brand-blue' : 'text-gray-400'
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <p className="pt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed pr-6">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
