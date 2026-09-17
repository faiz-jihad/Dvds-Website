import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Disc, Shield, Film, Award } from 'lucide-react';
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
    <div className="bg-white min-h-screen py-8 sm:py-16">
      <Seo
        title="About DVDs Zone — UK Physical DVD Retailer | Our Story"
        description="DVDs Zone is a boutique UK physical media retailer specialising in TV box sets, restored British cinema and collector optical editions. Learn about our heritage and mission."
        canonicalPath="/about"
        siteName="DVDs Zone"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About DVDs Zone',
          description: 'Boutique UK physical media retailer specialising in TV box sets, classic cinema, and collector editions.',
          url: 'https://dvdszone.co.uk/about',
          publisher: { '@type': 'Organization', name: 'DVDs Zone', url: 'https://dvdszone.co.uk' },
        }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-blue-soft text-brand-blue flex items-center justify-center mx-auto">
            <Disc className="w-6 h-6 sm:w-8 sm:h-8 stroke-[1.75]" />
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            REGISTERED IN ENGLAND AND WALES
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-dark tracking-tight">
            Films Worth Owning.
          </h1>
          <p className="text-base text-gray-600 leading-relaxed font-light max-w-xl mx-auto">
            {settings.store_name} is operated by {settings.registered_company_name}, company number {settings.company_number}. We believe physical media creates a lasting connection between filmmakers and audiences.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 leading-relaxed">
          <h2 className="font-display font-bold text-base text-dark mb-2">Registered company information</h2>
          <p>{settings.registered_company_name} · Company no. {settings.company_number}</p>
          <p>Registered office: {settings.registered_office_address}</p>
          <a
            href={settings.companies_house_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-semibold text-brand-blue hover:underline"
          >
            View the official Companies House record
          </a>
        </div>

        <div className="border-t border-b border-gray-100 py-10 space-y-8 text-gray-700 text-sm leading-relaxed">
          <div className="space-y-3">
            <h2 className="font-display font-bold text-xl text-dark">The Permanence of Physical Discs</h2>
            <p>
              In an age of streaming fragmentation, film lovers frequently discover that their favourite titles have disappeared from subscription platforms due to licensing changes, regional lockouts, or studio mergers.
            </p>
            <p>
              A physical DVD or Blu-ray in your collection cannot be edited remotely, deleted from a server, or rendered inaccessible by an internet outage. It is yours to cherish for decades.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-bold text-xl text-dark">Uncompressed Cinema Audio & Special Features</h2>
            <p>
              Each listing records the physical format, region, soundtrack, subtitles and edition details that have been verified for that specific item.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <Film className="w-5 h-5 text-brand-blue mb-2" />
              <h4 className="font-bold text-xs text-dark mb-1">Clear Disc Specifications</h4>
              <p className="text-xs text-gray-500">Region, language and classification are shown per verified listing.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <Shield className="w-5 h-5 text-brand-blue mb-2" />
              <h4 className="font-bold text-xs text-dark mb-1">Strict Quality Check</h4>
              <p className="text-xs text-gray-500">Each case and disc undergoes optical inspection prior to dispatch.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <Award className="w-5 h-5 text-brand-blue mb-2" />
              <h4 className="font-bold text-xs text-dark mb-1">Tracked Dispatch</h4>
              <p className="text-xs text-gray-500">Carefully packaged in reinforced mailers to preserve slipcovers.</p>
            </div>
          </div>
        </div>

        <div className="text-center pt-4">
          <Link to="/shop">
            <Button variant="primary" size="lg">
              Explore Our Curated DVD Vault
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
