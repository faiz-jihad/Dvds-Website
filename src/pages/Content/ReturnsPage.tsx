import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Truck,
  Mail,
  Phone,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  PackageCheck,
  FileCheck2,
  CreditCard
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { publicApi } from '../../lib/publicApi';
import { Seo, toAbsoluteUrl } from '../../components/common/Seo';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';

export const ReturnsPage: React.FC = () => {
  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 60_000,
  });

  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;
  const storeName = settings.store_name || 'DVDs Zone';
  const supportEmail = settings.support_email || 'azrayanltd@gmail.com';
  const supportPhone = settings.support_phone || '00447400320038';

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const returnFaqs = [
    {
      q: 'What is the return window for purchased DVDs?',
      a: 'Under UK Distance Selling and Consumer Rights legislation, you have 14 calendar days from the day your parcel is delivered to notify us of your intent to return an eligible item, and a further 14 days to dispatch it back to our UK vault. We extend this up to a full 30 days for damaged or faulty items.',
    },
    {
      q: 'Can I return a DVD that has already been opened or unsealed?',
      a: 'In accordance with UK Consumer Contracts Regulations, returns of audio and video recordings where the factory cellophane security seal has been broken or unsealed are not eligible for a change-of-mind refund. However, if an opened disc is genuinely faulty, defective, or misdescribed, your statutory right to a free replacement or full refund remains 100% protected.',
    },
    {
      q: 'What should I do if my disc arrives cracked or damaged in transit?',
      a: 'Transit accidents are rare, but we guarantee your purchase completely. Simply take a quick photo of the damaged case or disc and email our support desk with your Order Reference. We will immediately dispatch a brand-new replacement copy via Royal Mail with no return postage fee required.',
    },
    {
      q: 'How long does it take to receive my refund?',
      a: 'Once your returned parcel is received and verified at our UK facility, your refund is credited directly to your original payment method (Stripe card, PayPal, or Bank Transfer) within 3 working days. Your issuing bank will typically reflect the funds within 2–5 business days.',
    },
    {
      q: 'Who pays for return shipping?',
      a: 'If the return is due to an error on our part, transit damage, or a defective disc, DVDs Zone covers all return postage costs. For elective change-of-mind returns on unopened, sealed items, the buyer is responsible for standard return shipping.',
    },
  ];

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-10 sm:py-16 text-dark dark:text-white transition-colors duration-200 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(23,105,224,0.15),transparent)] pointer-events-none" />

      <Seo
        title={`30-Day Hassle-Free Returns & Replacements Policy — ${storeName} UK`}
        description="DVDs Zone 30-Day Returns Policy. Faulty disc? Damaged in transit? Enjoy fast UK replacements or full refunds within 3 working days. UK statutory consumer rights protected."
        canonicalPath="/returns"
        keywords="DVD returns policy UK, 30 day returns DVDs Zone, faulty DVD replacement, money back guarantee, UK consumer rights DVDs"
        siteName={storeName}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${storeName} 30-Day Returns Policy`,
          description: 'Hassle-free 30-day return policy and replacement guarantee for physical media releases.',
          url: toAbsoluteUrl('/returns'),
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 relative z-10">
        {/* ── 1. Hero Header ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 text-brand-blue dark:text-blue-400 text-xs font-mono font-semibold tracking-wider uppercase shadow-2xs">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>30-DAY CUSTOMER COMMITMENT · ZERO RISK</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-dark dark:text-white tracking-tight leading-[1.1]">
            Hassle-Free Returns &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              Replacements
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            Every physical edition dispatched from our UK vault is inspected for quality. If transit issues occur or an item fails to meet expectations, our UK customer care team is here to make it right immediately.
          </p>
        </div>

        {/* ── 2. Four Key Guarantee Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F]/90 backdrop-blur-md shadow-xs hover:border-brand-blue/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
              30-Day Window
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              14 days to notify us under UK Distance Selling regulations, plus an additional 14 days to return eligible editions.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F]/90 backdrop-blur-md shadow-xs hover:border-brand-blue/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
              <PackageCheck className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
              Instant Replacement
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Disc cracked in post or playback error? We dispatch a brand-new replacement copy immediately via Royal Mail.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F]/90 backdrop-blur-md shadow-xs hover:border-brand-blue/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
              3-Day Refund Settlement
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Approved refunds are credited back to your original payment method within 72 hours of returned item inspection.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F]/90 backdrop-blur-md shadow-xs hover:border-brand-blue/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
              Statutory Consumer Rights
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Full compliance with the Consumer Rights Act 2015. Your right to satisfactory quality and fit-for-purpose goods is absolute.
            </p>
          </div>
        </div>

        {/* ── 3. Step-by-Step Return Process ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-10 shadow-xs space-y-8">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
              SIMPLE 4-STEP PROCEDURE
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight">
              How to Return or Replace an Item
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="space-y-3 relative">
              <div className="w-9 h-9 rounded-full bg-brand-blue text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
                01
              </div>
              <h4 className="font-display font-bold text-sm text-dark dark:text-white">Contact Returns Desk</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Send an email or message with your Order Reference (e.g. ZDV-8492) and a brief reason for return or photo of damage.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3 relative">
              <div className="w-9 h-9 rounded-full bg-brand-blue/20 text-brand-blue dark:text-blue-400 font-mono font-bold text-sm flex items-center justify-center border border-brand-blue/30">
                02
              </div>
              <h4 className="font-display font-bold text-sm text-dark dark:text-white">Receive RMA Instructions</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Our support team responds within 3 hours with return authorization details or arranges an immediate replacement dispatch.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3 relative">
              <div className="w-9 h-9 rounded-full bg-brand-blue/20 text-brand-blue dark:text-blue-400 font-mono font-bold text-sm flex items-center justify-center border border-brand-blue/30">
                03
              </div>
              <h4 className="font-display font-bold text-sm text-dark dark:text-white">Package Your Item</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Place the disc and original case securely in a protective bubble mailer to prevent any transit scuffs.
              </p>
            </div>

            {/* Step 4 */}
            <div className="space-y-3 relative">
              <div className="w-9 h-9 rounded-full bg-brand-blue/20 text-brand-blue dark:text-blue-400 font-mono font-bold text-sm flex items-center justify-center border border-brand-blue/30">
                04
              </div>
              <h4 className="font-display font-bold text-sm text-dark dark:text-white">Refund or Replacement</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Upon delivery to our UK warehouse, your refund is credited within 72 hours, or replacement tracking is shared.
              </p>
            </div>
          </div>
        </div>

        {/* ── 4. Detailed Eligibility & Policy Breakdown ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-10 shadow-xs space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
              CRITERIA &amp; GUIDELINES
            </span>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-dark dark:text-white">
              Eligibility Conditions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#141A26] border border-gray-100 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-2 font-display font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Eligible for Return or Free Replacement</span>
              </div>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 list-disc pl-4">
                <li>Factory-sealed DVDs and box sets in original cellophane packaging.</li>
                <li>Items with manufacturer playback errors or skipping layers.</li>
                <li>Cases, sleeves, or discs damaged during Royal Mail transit.</li>
                <li>Incorrect title dispatched due to a warehouse pick error.</li>
                <li>Any cancellation notified within 14 days of delivery (unopened).</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#141A26] border border-gray-100 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-2 font-display font-bold text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Exceptions Under UK Consumer Law</span>
              </div>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 list-disc pl-4">
                <li>Video and audio recordings where the factory seal has been broken (change-of-mind exemptions).</li>
                <li>Items damaged through improper player usage or customer mishandling.</li>
                <li>Discs returned without their original studio case and inlay artwork.</li>
                <li>Returns initiated after the 30-day post-delivery guarantee window without prior authorization.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── 5. Returns FAQ Accordion ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-10 shadow-xs space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
              COMMON QUESTIONS
            </span>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-dark dark:text-white">
              Returns &amp; Replacement FAQ
            </h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-white/10 border-y border-gray-100 dark:border-white/10">
            {returnFaqs.map((faq, i) => (
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

        {/* ── 6. Contact Returns Department Card ── */}
        <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/50 to-indigo-50/20 dark:from-[#0E131F] dark:to-[#141A26] p-8 text-center space-y-4 shadow-xs">
          <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight">
            Need to Arrange a Return or Replacement?
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
            Contact our dedicated UK returns desk with your Order Reference and we will guide you step-by-step through immediate replacement or refund.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/contact">
              <Button variant="primary" size="lg" className="inline-flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>Contact Returns Department</span>
              </Button>
            </Link>
            <a href={`tel:${supportPhone}`}>
              <Button variant="secondary" size="lg" className="inline-flex items-center gap-2 font-mono">
                <Phone className="w-4 h-4 text-brand-blue" />
                <span>Call {supportPhone}</span>
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
