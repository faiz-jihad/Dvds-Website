import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { StoreDataState } from '../../components/common/StoreDataState';
import { publicApi } from '../../lib/publicApi';
import { StoreSettings } from '../../types';
import { Seo } from '../../components/common/Seo';

interface LegalPageProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  children: (settings: StoreSettings) => React.ReactNode;
}

const LegalPage: React.FC<LegalPageProps> = ({ title, description, canonicalPath, children }) => {
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: publicApi.getStoreSettings });

  if (settingsQuery.isLoading || settingsQuery.error || !settingsQuery.data) {
    return <StoreDataState loading={settingsQuery.isLoading} error={settingsQuery.error || (!settingsQuery.data ? new Error('Legal company information is unavailable.') : null)} retry={() => settingsQuery.refetch()} />;
  }

  const settings = settingsQuery.data;

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-8 sm:py-16 text-dark dark:text-white transition-colors">
      <Seo
        title={`${title} — DVDs Zone`}
        description={description || `DVDs Zone legal document: ${title}.`}
        canonicalPath={canonicalPath}
        siteName="DVDs Zone"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
        <span className="font-mono text-brand-blue uppercase tracking-widest text-[11px]">LEGAL NOTICE</span>
        <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-dark dark:text-white">{title}</h1>
        {children(settings)}
        <aside className="mt-10 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 space-y-1.5 shadow-xs">
          <strong className="block text-dark dark:text-white font-bold">Legal Operator &amp; Heritage</strong>
          <p><strong>DVD ZONE</strong> is active since <strong>2021</strong>.</p>
          <p>Company based in 2022: <strong>AZ Rayan LTD &amp; DVD Zone</strong>, registered in England and Wales.</p>
          <p>Company number: {settings.company_number || '13894195'}</p>
          <p>{settings.warehouse_location || 'West Midlands, Birmingham, United Kingdom'}</p>
          <p>Customer service &amp; inquiry email: <a href="mailto:azrayanltd@gmail.com" className="text-brand-blue dark:text-blue-400 hover:underline font-mono">azrayanltd@gmail.com</a> • Customer Line: <a href="tel:+447400320038" className="text-brand-blue dark:text-blue-400 hover:underline font-mono">00447400320038</a></p>
          <a
            href={settings.companies_house_url || 'https://find-and-update.company-information.service.gov.uk/company/13894195'}
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
  <LegalPage
    title="Privacy Policy"
    description="DVD ZONE Privacy Policy — company based in 2022 AZ Rayan LTD & DVD Zone. DVD ZONE is active since 2021. UK GDPR compliance."
    canonicalPath="/privacy"
  >
    {(settings) => (
      <>
        {/* Heritage & Operating Entity Highlight Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-gray-700 dark:text-gray-300 space-y-2 mb-6">
          <p className="font-display font-bold text-sm text-dark dark:text-white">
            Company Establishment &amp; Trading Heritage
          </p>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white dark:bg-[#141A26] rounded-lg border border-blue-100/80 dark:border-blue-900/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-blue dark:text-blue-400 block font-semibold">Store Brand</span>
              <strong className="text-dark dark:text-white text-sm block mt-0.5">DVD ZONE</strong>
              <span className="text-[11px] text-gray-600 dark:text-gray-300">Active since 2021</span>
            </div>
            <div className="p-3 bg-white dark:bg-[#141A26] rounded-lg border border-blue-100/80 dark:border-blue-900/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-blue dark:text-blue-400 block font-semibold">Operating Entity</span>
              <strong className="text-dark dark:text-white text-sm block mt-0.5">AZ Rayan LTD &amp; DVD Zone</strong>
              <span className="text-[11px] text-gray-600 dark:text-gray-300">Company based in 2022 (No. {settings.company_number || '13894195'})</span>
            </div>
          </div>
        </div>

        <p>
          Last updated: September 2026. <strong>DVD ZONE is active since 2021</strong>, operated by company based in 2022 <strong>AZ Rayan LTD &amp; DVD Zone</strong> (Company No. {settings.company_number || '13894195'}, West Midlands, Birmingham, United Kingdom).
        </p>
        <p>
          AZ Rayan LTD &amp; DVD Zone respects your privacy and is committed to protecting your personal data in full compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
        </p>

        <h3 className="font-display font-bold text-sm text-dark dark:text-white pt-2">Data Collection &amp; Use</h3>
        <p>We collect personal information needed to fulfil physical-media orders, provide customer support, prevent fraud, and process payments. We do not sell personal data to third parties.</p>

        <h3 className="font-display font-bold text-sm text-dark dark:text-white pt-2">Customer Service &amp; Inquiries</h3>
        <p>
          Privacy enquiries and data rights requests can be sent to our customer service and inquiry email address: <a href="mailto:azrayanltd@gmail.com" className="text-brand-blue dark:text-blue-400 hover:underline font-mono font-medium">azrayanltd@gmail.com</a>, or via our Customer Line: <a href="tel:+447400320038" className="text-brand-blue dark:text-blue-400 hover:underline font-mono font-medium">00447400320038</a>.
        </p>
      </>
    )}
  </LegalPage>
);

export const TermsPage: React.FC = () => (
  <LegalPage
    title="Terms & Conditions"
    description="DVD ZONE Terms & Conditions — our terms of sale, pricing, and customer support commitments."
    canonicalPath="/terms"
  >
    {(settings) => (
      <>
        <p>These terms govern purchases made from {settings.store_name}, operated by {settings.registered_company_name}.</p>
        <h3 className="font-display font-bold text-sm text-dark dark:text-white pt-2">Orders & Pricing</h3>
        <p>Prices are shown in GBP (£). The total price, delivery charge and any discount are displayed before payment. Obvious pricing or stock errors may be corrected before dispatch, with the customer notified where an order is affected.</p>
        <h3 className="font-display font-bold text-sm text-dark dark:text-white pt-2">Customer Support</h3>
        <p>Questions about an order can be sent to {settings.support_email || 'azrayanltd@gmail.com'}. The registered office is a legal correspondence address and is not automatically the returns address.</p>
      </>
    )}
  </LegalPage>
);

export const RefundPolicyPage: React.FC = () => (
  <LegalPage
    title="Refund Policy"
    description="DVD ZONE Refund Policy — 30-day returns, cancellation rights and statutory protections for UK consumers."
    canonicalPath="/refund-policy"
  >
    {(settings) => (
      <>
        <p>{settings.store_name} handles returns and refunds in accordance with applicable UK consumer law.</p>
        <h3 className="font-display font-bold text-sm text-dark dark:text-white pt-2">Cancellation and Returns</h3>
        <p>For eligible distance purchases, customers may tell us they wish to cancel within 14 days after receiving the goods, then have a further 14 days to return them. The cancellation right does not normally apply to sealed audio or video recordings once they have been unsealed. Faulty or misdescribed goods remain covered by statutory rights.</p>
        <h3 className="font-display font-bold text-sm text-dark dark:text-white pt-2">Before Sending a Return</h3>
        <p>Contact {settings.support_email || 'azrayanltd@gmail.com'} for the correct returns address and instructions. Do not send returns to the registered office unless customer support explicitly confirms it.</p>
      </>
    )}
  </LegalPage>
);
