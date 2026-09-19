import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { publicApi } from '../../lib/publicApi';
import { formatGBP } from '../../lib/formatters';
import { StoreDataState } from '../../components/common/StoreDataState';
import { Seo } from '../../components/common/Seo';

const createFaqs = (freeShippingThreshold: number, dispatchCutoff: string, standardService: string) => [
  {
    q: 'Are your DVDs compatible with UK DVD players?',
    a: 'Yes, 100%. All our standard DVD releases are official PAL Region 2 UK/European releases, or Region 0 (All Region), which play seamlessly in any standard UK DVD player, PlayStation, Xbox, or PC drive.',
  },
  {
    q: 'How fast is UK dispatch?',
    a: `Orders placed before ${dispatchCutoff} Monday to Friday are prepared for same-business-day dispatch, subject to live stock and fulfilment checks.`,
  },
  {
    q: 'How do I qualify for Free UK Delivery?',
    a:
      freeShippingThreshold <= 0
        ? `All orders shipped to any UK address qualify for 100% Free Tracked UK Delivery via ${standardService} — with no minimum spend required.`
        : `Any eligible basket total of ${formatGBP(freeShippingThreshold)} or higher automatically qualifies for ${standardService} at no charge.`,
  },
  {
    q: 'Are the DVD covers original studio artwork?',
    a: 'Yes. We supply authentic UK retail releases in their original studio cases with official BBFC age ratings, sleeves, and inlay booklets where produced.',
  },
  {
    q: 'Can I track my parcel?',
    a: 'Once a parcel is dispatched, its carrier and tracking number are recorded against the order and visible to authorised staff.',
  },
];

export const FaqPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => publicApi.getStoreSettings() });
  if (settingsQuery.isLoading || settingsQuery.error || !settingsQuery.data) {
    return <StoreDataState loading={settingsQuery.isLoading} error={settingsQuery.error || (!settingsQuery.data ? new Error('Store information is unavailable.') : null)} retry={() => settingsQuery.refetch()} />;
  }
  const faqs = createFaqs(settingsQuery.data.free_shipping_threshold, settingsQuery.data.dispatch_cutoff_time, settingsQuery.data.standard_shipping_name);

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-8 sm:py-16 text-dark dark:text-white transition-colors">
      <Seo
        title="FAQ — DVD Regions, Delivery & Returns | DVDs Zone UK"
        description="Answers to common questions about DVD regions, UK delivery times, free shipping, returns and our physical media collection at DVDs Zone."
        canonicalPath="/faq"
        siteName="DVDs Zone"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a },
          })),
        }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            KNOWLEDGE BASE
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl text-dark dark:text-white tracking-tight mt-1 mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Find immediate answers regarding physical disc formats, UK regions, dispatch times, and payments.
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-white/10 border-y border-gray-200 dark:border-white/10">
          {faqs.map((faq, i) => (
            <div key={faq.q} className="py-4">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between text-left font-display font-bold text-sm sm:text-base text-dark dark:text-white hover:text-brand-blue dark:hover:text-blue-400 transition-colors py-1 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openIdx === i ? 'rotate-180 text-brand-blue' : 'text-gray-400'}`} />
              </button>
              {openIdx === i && (
                <div className="pt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
