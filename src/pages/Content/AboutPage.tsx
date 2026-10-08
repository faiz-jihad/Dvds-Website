import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Disc, Shield, Film, Award, Truck, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { StoreDataState } from '../../components/common/StoreDataState';
import { publicApi } from '../../lib/publicApi';
import { Seo } from '../../components/common/Seo';

export const AboutPage: React.FC = () => {
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: publicApi.getStoreSettings });

  if (settingsQuery.isLoading || settingsQuery.error || !settingsQuery.data) {
    return <StoreDataState loading={settingsQuery.isLoading} error={settingsQuery.error || (!settingsQuery.data ? new Error('Company information is unavailable.') : null)} retry={() => settingsQuery.refetch()} />;
  }

  const settings = settingsQuery.data;

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-8 sm:py-16 transition-colors">
      <Seo
        title="About DVD ZONE UK Physical DVD Retailer | Our Story"
        description="DVD ZONE is active since 2021, operated by DVDs Zone, based in United Kingdom. Quality DVDs & Entertainment."
        canonicalPath="/about"
        keywords="about DVD ZONE, UK DVD shop, DVDs Zone, physical media UK, British film store, authentic PAL DVDs"
        siteName="DVD ZONE"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About DVD ZONE',
          description: 'UK physical media retailer specialising in DVDs, TV box sets, and entertainment. Based in United Kingdom.',
          url: 'https://dvdszone.co.uk/about',
          publisher: { '@type': 'Organization', name: 'DVD ZONE', url: 'https://dvdszone.co.uk' },
        }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center mx-auto">
            <Disc className="w-6 h-6 sm:w-8 sm:h-8 stroke-[1.75]" />
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
            ABOUT DVD ZONE
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-dark dark:text-white tracking-tight">
            Quality DVDs &amp; Entertainment
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed font-light max-w-xl mx-auto">
            DVD ZONE is active since 2021, operated by DVDs Zone, based in United Kingdom.
          </p>
        </div>

        {/* Company Info Card */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed shadow-xs">
          <h2 className="font-display font-bold text-base text-dark dark:text-white mb-3">Company Information</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-dark dark:text-white">Headquarter &amp; Vault:</span>
                <p>{settings.store_name || 'DVD ZONE'} — {settings.warehouse_location || settings.registered_office_address || 'United Kingdom'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-dark dark:text-white">Customer service and inquiry email address:</span>
                <br />
                <a href={`mailto:${settings.support_email || 'support@dvdszone.co.uk'}`} className="text-brand-blue dark:text-blue-400 hover:underline font-mono">
                  {settings.support_email || 'support@dvdszone.co.uk'}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-dark dark:text-white">Customer Line:</span>
                <br />
                <a href={`tel:${settings.support_phone || '00447400320038'}`} className="text-brand-blue dark:text-blue-400 hover:underline font-mono">
                  {settings.support_phone || '00447400320038'}
                </a>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  (Direct Customer Support)
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {settings.registered_company_name} · Company no. {settings.company_number}
            </p>
            <a
              href={settings.companies_house_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-semibold text-brand-blue dark:text-blue-400 hover:underline text-xs"
            >
              View the official Companies House record
            </a>
          </div>
        </div>

        <div className="border-t border-b border-gray-200 dark:border-white/10 py-10 space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <div className="space-y-3">
            <h2 className="font-display font-bold text-xl text-dark dark:text-white">Why Physical DVDs?</h2>
            <p>
              In an age of streaming fragmentation, film lovers frequently discover that their favourite titles have disappeared from subscription platforms due to licensing changes, regional lockouts, or studio mergers.
            </p>
            <p>
              A physical DVD in your collection cannot be edited remotely, deleted from a server, or rendered inaccessible by an internet outage. It is yours to keep and enjoy for years to come.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-bold text-xl text-dark dark:text-white">Our Commitment</h2>
            <p>
              We aim to provide quality DVDs at fair prices with a reliable, straightforward shopping experience. All orders include free UK standard delivery via Royal Mail with same-day dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="p-4 bg-white dark:bg-[#0E131F] rounded-lg border border-gray-200 dark:border-white/10 shadow-xs">
              <Truck className="w-5 h-5 text-brand-blue dark:text-blue-400 mb-2" />
              <h4 className="font-bold text-xs text-dark dark:text-white mb-1">Free UK Delivery</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Free standard delivery across the United Kingdom. Delivery within 2 working days via Royal Mail.</p>
            </div>
            <div className="p-4 bg-white dark:bg-[#0E131F] rounded-lg border border-gray-200 dark:border-white/10 shadow-xs">
              <Shield className="w-5 h-5 text-brand-blue dark:text-blue-400 mb-2" />
              <h4 className="font-bold text-xs text-dark dark:text-white mb-1">Quality Checked</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Each disc is inspected before dispatch to ensure quality.</p>
            </div>
            <div className="p-4 bg-white dark:bg-[#0E131F] rounded-lg border border-gray-200 dark:border-white/10 shadow-xs">
              <Award className="w-5 h-5 text-brand-blue dark:text-blue-400 mb-2" />
              <h4 className="font-bold text-xs text-dark dark:text-white mb-1">Same-Day Dispatch</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Orders are dispatched the same day, carefully packaged for safe delivery.</p>
            </div>
          </div>
        </div>

        <div className="text-center pt-4">
          <Link to="/shop">
            <Button variant="primary" size="lg">
              Browse Our DVD Collection
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
