import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Truck,
  Disc,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { publicApi } from '../../lib/publicApi';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';
import { Seo, toAbsoluteUrl } from '../../components/common/Seo';
import { cn } from '../../lib/formatters';

interface FaqItem {
  category: 'delivery' | 'formats' | 'payments' | 'returns';
  q: string;
  a: string;
  badge?: string;
}

export const FaqPage: React.FC = () => {
  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: () => publicApi.getStoreSettings(),
    staleTime: 60_000,
  });

  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;
  const storeName = settings.store_name || 'DVDs Zone';
  const cutoffTime = settings.dispatch_cutoff_time || '2:00 PM';
  const supportEmail = settings.support_email || 'info@dvds-zone.co.uk';
  const supportPhone = settings.support_phone || '00447400320038';

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const allFaqs: FaqItem[] = useMemo(
    () => [
      // Delivery & Postage
      {
        category: 'delivery',
        badge: 'UK Postage',
        q: 'Is standard delivery really 100% free on every UK order?',
        a: `Yes, absolutely. Every order to any UK postal address qualifies for 100% Free Standard UK Delivery via Royal Mail. There is no minimum spend threshold and no hidden packaging surcharge added at checkout.`,
      },
      {
        category: 'delivery',
        badge: 'Dispatch Speed',
        q: 'How fast is dispatch and delivery across the United Kingdom?',
        a: `Orders placed on working days before ${cutoffTime} are prepared and dispatched the same day from our UK vault. Royal Mail 48 delivers within 2–3 working days, while Royal Mail 24 arrives within 1–2 working days.`,
      },
      {
        category: 'delivery',
        badge: 'Packaging',
        q: 'Do I need to stay home to receive my parcel?',
        a: `Single and double DVD releases are packaged in puncture-resistant, slim bubble mailers engineered to slide effortlessly through standard UK letterboxes. You don’t need to wait in for the postie. Larger box sets are packaged in sturdy corrugated boxes and left in a safe place or local delivery office if you are out.`,
      },
      {
        category: 'delivery',
        badge: 'UK Coverage',
        q: 'Do you deliver to Northern Ireland, the Scottish Highlands & the Channel Islands?',
        a: `Yes! Free UK delivery covers the entire United Kingdom without geographic surcharges — including England, Scotland, Wales, Northern Ireland, the Scottish Highlands & Islands, the Isle of Man, and the Channel Islands.`,
      },
      {
        category: 'delivery',
        badge: 'Tracking',
        q: 'How can I track my Royal Mail shipment?',
        a: `Once your parcel has been dispatched from our vault, its carrier tracking reference is logged against your order. You can view real-time tracking from your Account Order History or via the Royal Mail online tracking portal.`,
      },

      // DVD Formats & Regions
      {
        category: 'formats',
        badge: 'UK PAL',
        q: 'Are your DVDs compatible with UK DVD players?',
        a: `Yes, 100%. All of our standard releases are official PAL Region 2 (UK & Europe) or Region 0 (All Region) titles. They play seamlessly in all standard standalone UK DVD players, PlayStation 4/5, Xbox consoles, and PC/Mac external DVD drives.`,
      },
      {
        category: 'formats',
        badge: 'Authenticity',
        q: 'Are the DVD covers authentic original studio editions?',
        a: `Yes. We strictly stock genuine UK retail editions in their original studio cases with official British Board of Film Classification (BBFC) age certification logos, barcodes, and inlay booklets where produced. We do not sell bootlegs or uncertified copies.`,
      },
      {
        category: 'formats',
        badge: 'Audio & Subtitles',
        q: 'Do your releases include English audio and English subtitles?',
        a: `All UK retail editions include original English audio soundtracks (stereo or 5.1 Dolby Digital surround) and English SDH subtitles for the hard of hearing, unless specifically stated as an international art-house release.`,
      },
      {
        category: 'formats',
        badge: 'Condition',
        q: 'What condition are the physical discs supplied in?',
        a: `Our catalog consists of pristine physical media releases, securely factory sealed in original cellophane. Each disc is held securely on its hub and inspected before fulfillment to prevent loose disc transit rattling.`,
      },

      // Ordering & Payments
      {
        category: 'payments',
        badge: 'Security',
        q: 'What payment methods do you accept?',
        a: `We accept all major debit and credit cards (Visa, Mastercard, American Express, Apple Pay, Google Pay) powered by Stripe with 256-bit SSL encryption. We also support PayPal Express Checkout and UK Barclays Bank Transfers.`,
      },
      {
        category: 'payments',
        badge: 'Receipts',
        q: 'Will I receive an official invoice / purchase receipt?',
        a: `Yes. Immediately upon checkout completion, an official order confirmation receipt detailing item breakdown, VAT information, and delivery destination is generated. You can download or print official PDF receipts at any time from your Account Order History.`,
      },
      {
        category: 'payments',
        badge: 'Discounts',
        q: 'How do VIP promotional codes work at checkout?',
        a: `If you have a seasonal voucher or VIP promo code, simply enter it into the Promo Code field on the Cart Drawer or Checkout page. The discount amount is calculated and subtracted immediately before payment authorization.`,
      },

      // Returns & Replacements
      {
        category: 'returns',
        badge: 'Guarantee',
        q: 'What is your 30-day returns policy?',
        a: `We offer a 30-day satisfaction commitment. For change-of-mind returns, please notify us within 14 days of delivery (unopened, sealed items). For any disc that arrives damaged or displays a manufacturing defect, you are covered for a full 30 days.`,
      },
      {
        category: 'returns',
        badge: 'Damaged Transit',
        q: 'What happens if my disc or case arrives damaged in the post?',
        a: `If a case is cracked or a disc is damaged during Royal Mail transit, take a quick photo and email our support team with your Order Reference. We will dispatch a brand-new replacement copy immediately at zero extra cost to you.`,
      },
      {
        category: 'returns',
        badge: 'Refund Speed',
        q: 'How quickly are refunds credited to my bank?',
        a: `Approved refunds are processed by our accounts team within 3 working days of receiving the returned item. Depending on your bank or card issuer, the funds typically appear on your statement within 2–5 business days.`,
      },
    ],
    [cutoffTime]
  );

  // Filtered FAQs based on category and search query
  const filteredFaqs = useMemo(() => {
    return allFaqs.filter((faq) => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (faq.badge && faq.badge.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [allFaqs, activeCategory, searchQuery]);

  const categories = [
    { id: 'all', label: 'All Questions', icon: HelpCircle },
    { id: 'delivery', label: 'Delivery & Postage', icon: Truck },
    { id: 'formats', label: 'DVD Formats & Regions', icon: Disc },
    { id: 'payments', label: 'Orders & Payments', icon: CreditCard },
    { id: 'returns', label: 'Returns & Guarantee', icon: RotateCcw },
  ];

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-10 sm:py-16 text-dark dark:text-white transition-colors duration-200 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(23,105,224,0.15),transparent)] pointer-events-none" />

      <Seo
        title={`Frequently Asked Questions — DVD Regions, Delivery & Orders | ${storeName}`}
        description={`Find immediate answers about UK PAL DVD compatibility, 100% Free UK delivery via Royal Mail, same-day dispatch before ${cutoffTime}, and 30-day returns at ${storeName}.`}
        canonicalPath="/faq"
        keywords="DVD FAQ, Region 2 UK DVD player compatibility, PAL DVD playback, free Royal Mail postage UK, DVDs Zone answers"
        siteName={storeName}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: allFaqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a },
          })),
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14 relative z-10">
        {/* ── 1. Hero Section ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 text-brand-blue dark:text-blue-400 text-xs font-mono font-semibold tracking-wider uppercase shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>KNOWLEDGE ARCHIVE &amp; SUPPORT</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-dark dark:text-white tracking-tight leading-[1.1]">
            Frequently Asked{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              Questions
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            Everything you need to know about official UK Region 2 PAL formats, free Royal Mail delivery times, secure checkout, and our 30-day guarantee.
          </p>
        </div>

        {/* ── 2. Real-Time Search Bar ── */}
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics (e.g. Region 2, Royal Mail, Box sets, refund)..."
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-[#0E131F] border border-gray-200 dark:border-white/10 text-dark dark:text-white text-xs sm:text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand-blue dark:focus:border-brand-blue shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Category Filter Tabs ── */}
        <div className="flex items-center justify-center flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setOpenIdx(null);
                }}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs',
                  isActive
                    ? 'bg-brand-blue text-white shadow-brand-blue/20'
                    : 'bg-white dark:bg-[#0E131F] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-brand-blue/30 hover:text-dark dark:hover:text-white'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-brand-blue dark:text-blue-400')} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 4. Accordion List ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-4 sm:p-8 shadow-xs space-y-3">
          {filteredFaqs.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {filteredFaqs.map((faq, i) => {
                const isOpen = openIdx === i;
                return (
                  <div key={faq.q} className="py-4 sm:py-5 first:pt-2 last:pb-2">
                    <button
                      type="button"
                      onClick={() => setOpenIdx(isOpen ? null : i)}
                      className="w-full flex items-start justify-between gap-4 text-left font-display font-bold text-sm sm:text-base text-dark dark:text-white hover:text-brand-blue dark:hover:text-blue-400 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {faq.badge && (
                          <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                            {faq.badge}
                          </span>
                        )}
                        <span className="leading-snug">{faq.q}</span>
                      </div>
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200',
                          isOpen
                            ? 'rotate-180 bg-brand-blue text-white'
                            : 'bg-gray-100 dark:bg-[#141A26] text-gray-500 group-hover:text-brand-blue'
                        )}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="pt-3.5 pl-0 sm:pl-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed pr-8 animate-in fade-in duration-150">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="font-bold text-dark dark:text-white text-base">No matching questions found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Try searching with different keywords, or switch the category filter to view all available questions.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 rounded-lg bg-brand-blue text-white text-xs font-bold cursor-pointer hover:bg-brand-blue/90"
              >
                Reset Search &amp; Filters
              </button>
            </div>
          )}
        </div>

        {/* ── 5. Still Have Questions Card ── */}
        <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/50 to-indigo-50/20 dark:from-[#0E131F] dark:to-[#141A26] p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-400 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight">
            Still Have a Question?
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
            Our UK customer support team is available Monday to Saturday to answer queries on disc titles, parcel tracking, and custom orders.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/contact">
              <Button variant="primary" size="lg" className="inline-flex items-center gap-2">
                <span>Send Support Enquiry</span>
                <ArrowRight className="w-4 h-4" />
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
