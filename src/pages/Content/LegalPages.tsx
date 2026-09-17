import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { StoreDataState } from '../../components/common/StoreDataState';
import { publicApi } from '../../lib/publicApi';
import { StoreSettings } from '../../types';

interface LegalPageProps {
  title: string;
  children: (settings: StoreSettings) => React.ReactNode;
}

const LegalPage: React.FC<LegalPageProps> = ({ title, children }) => {
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: publicApi.getStoreSettings });

  if (settingsQuery.isLoading || settingsQuery.error || !settingsQuery.data) {
    return <StoreDataState loading={settingsQuery.isLoading} error={settingsQuery.error || (!settingsQuery.data ? new Error('Legal company information is unavailable.') : null)} retry={() => settingsQuery.refetch()} />;
  }

  const settings = settingsQuery.data;

  return (
    <div className="bg-white min-h-screen py-8 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6 text-xs text-gray-700 leading-relaxed">
        <span className="font-mono text-brand-blue uppercase tracking-widest text-[11px]">LEGAL NOTICE</span>
        <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-dark">{title}</h1>
        {children(settings)}
        <aside className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-1">
          <strong className="block text-dark">Legal operator</strong>
          <p>{settings.registered_company_name}, registered in England and Wales.</p>
          <p>Company number: {settings.company_number}</p>
          <p>Registered office: {settings.registered_office_address}</p>
          <a
            href={settings.companies_house_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block pt-1 font-semibold text-brand-blue hover:underline"
          >
            View official Companies House record
          </a>
        </aside>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => (
  <LegalPage title="Privacy Policy">
    {(settings) => (
      <>
        <p>Last updated: September 2026. {settings.registered_company_name} operates {settings.store_name} and processes personal data in accordance with UK GDPR and the Data Protection Act 2018.</p>
        <h3 className="font-display font-bold text-sm text-dark pt-2">Data Collection & Use</h3>
        <p>We collect personal information needed to fulfil physical-media orders, provide customer support, prevent fraud and process payments. We do not sell personal data to third parties.</p>
        <h3 className="font-display font-bold text-sm text-dark pt-2">Contact</h3>
        <p>Privacy enquiries can be sent to {settings.support_email}.</p>
      </>
    )}
  </LegalPage>
);

export const TermsPage: React.FC = () => (
  <LegalPage title="Terms & Conditions">
    {(settings) => (
      <>
        <p>These terms govern purchases made from {settings.store_name}, operated by {settings.registered_company_name}.</p>
        <h3 className="font-display font-bold text-sm text-dark pt-2">Orders & Pricing</h3>
        <p>Prices are shown in GBP (£). The total price, delivery charge and any discount are displayed before payment. Obvious pricing or stock errors may be corrected before dispatch, with the customer notified where an order is affected.</p>
        <h3 className="font-display font-bold text-sm text-dark pt-2">Customer Support</h3>
        <p>Questions about an order can be sent to {settings.support_email}. The registered office is a legal correspondence address and is not automatically the returns address.</p>
      </>
    )}
  </LegalPage>
);

export const RefundPolicyPage: React.FC = () => (
  <LegalPage title="Refund Policy">
    {(settings) => (
      <>
        <p>{settings.store_name} handles returns and refunds in accordance with applicable UK consumer law.</p>
        <h3 className="font-display font-bold text-sm text-dark pt-2">Cancellation and Returns</h3>
        <p>For eligible distance purchases, customers may tell us they wish to cancel within 14 days after receiving the goods, then have a further 14 days to return them. The cancellation right does not normally apply to sealed audio or video recordings once they have been unsealed. Faulty or misdescribed goods remain covered by statutory rights.</p>
        <h3 className="font-display font-bold text-sm text-dark pt-2">Before Sending a Return</h3>
        <p>Contact {settings.support_email} for the correct returns address and instructions. Do not send returns to the registered office unless customer support explicitly confirms it.</p>
      </>
    )}
  </LegalPage>
);
