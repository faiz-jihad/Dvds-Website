import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../lib/publicApi';
import { StoreSettings } from '../../types';
import { Seo } from '../../components/common/Seo';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';

interface LegalPageProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  children: (settings: StoreSettings) => React.ReactNode;
}

const LegalPage: React.FC<LegalPageProps> = ({ title, description, canonicalPath, children }) => {
  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 60_000,
  });

  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-8 sm:py-16 text-dark dark:text-white transition-colors">
      <Seo
        title={`${title} — DVDs Zone`}
        description={description || `DVDs Zone legal document: ${title}.`}
        canonicalPath={canonicalPath}
        keywords="DVDs Zone legal, terms and conditions, privacy policy, UK consumer rights, distance selling regulations"
        siteName="DVDs Zone"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
        <span className="font-mono text-brand-blue uppercase tracking-widest text-[11px]">LEGAL NOTICE</span>
        <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-dark dark:text-white">{title}</h1>
        {children(settings)}
        <aside className="mt-10 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 space-y-1.5 shadow-xs">
          <strong className="block text-dark dark:text-white font-bold">Legal Operator &amp; Heritage</strong>
          <p><strong>DVDS Zone</strong> (trading brand <strong>DVD ZONE</strong>) is active since <strong>2021</strong>.</p>
          <p>Operating entity: <strong>{settings.registered_company_name || 'AZRAYAN LTD'}</strong>, registered in England and Wales.</p>
          <p>Company number: {settings.company_number || '13894195'}</p>
          <p>Official Website: <a href="https://dvds-zone.co.uk" className="text-brand-blue dark:text-blue-400 hover:underline font-mono">https://dvds-zone.co.uk</a></p>
          <p>{settings.warehouse_location || 'United Kingdom'}</p>
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
    description="DVDS Zone Privacy Policy — comprehensive data protection, Google OAuth user data handling, limited use disclosures, and UK GDPR compliance."
    canonicalPath="/privacy"
  >
    {(settings) => (
      <>
        {/* Heritage & Operating Entity Highlight Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-gray-700 dark:text-gray-300 space-y-2 mb-6">
          <p className="font-display font-bold text-sm text-dark dark:text-white">
            Company Establishment &amp; Trading Identity
          </p>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white dark:bg-[#141A26] rounded-lg border border-blue-100/80 dark:border-blue-900/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-blue dark:text-blue-400 block font-semibold">Store &amp; Application Name</span>
              <strong className="text-dark dark:text-white text-sm block mt-0.5">DVDS Zone</strong>
              <span className="text-[11px] text-gray-600 dark:text-gray-300">Website: https://dvds-zone.co.uk</span>
            </div>
            <div className="p-3 bg-white dark:bg-[#141A26] rounded-lg border border-blue-100/80 dark:border-blue-900/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-blue dark:text-blue-400 block font-semibold">Operating Entity</span>
              <strong className="text-dark dark:text-white text-sm block mt-0.5">{settings.registered_company_name || 'AZRAYAN LTD'}</strong>
              <span className="text-[11px] text-gray-600 dark:text-gray-300">Company No. {settings.company_number || '13894195'} (England &amp; Wales)</span>
            </div>
          </div>
        </div>

        <p>
          <strong>Last updated:</strong> October 2026. This Privacy Policy applies to the website, online storefront, and applications operating under <strong>DVDS Zone</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), accessible at <a href="https://dvds-zone.co.uk" className="text-brand-blue dark:text-blue-400 hover:underline font-mono">https://dvds-zone.co.uk</a>, operated by <strong>{settings.registered_company_name || 'AZRAYAN LTD'}</strong> (Company Registered in England and Wales No. {settings.company_number || '13894195'}, active since 2021).
        </p>

        <p>
          We are committed to respecting your privacy, protecting your personal data, and maintaining strict compliance with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018, and relevant international consumer privacy standards.
        </p>

        {/* 1. GOOGLE USER DATA & OAUTH POLICY (Explicit Google Verification Section) */}
        <section className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-100/80 dark:bg-blue-900/40 text-brand-blue dark:text-blue-400 font-mono text-[11px] font-semibold">
            Google Sign-In &amp; OAuth 2.0 User Data Disclosures
          </div>
          <h2 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
            1. Google OAuth &amp; Google User Data Policy
          </h2>
          <p>
            DVDS Zone offers customers the option to create an account and authenticate using <strong>Google Sign-In (Google OAuth 2.0)</strong>. When you choose to sign in or register with Google, we access and process specific information from your Google account strictly as outlined below:
          </p>

          <div className="space-y-2 pl-3 border-l-2 border-brand-blue">
            <p><strong>A. What Google Data We Access:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Your Name:</strong> Used to display your customer name on your account dashboard and shipping labels.</li>
              <li><strong>Your Email Address:</strong> Used as your unique account username to send transactional purchase receipts, order tracking updates, and customer support replies.</li>
              <li><strong>Your Profile Picture URL:</strong> Used to render your user avatar in the navigation bar and account profile page.</li>
              <li><strong>Google User ID (sub identifier):</strong> A unique technical string provided by Google to securely authenticate and link your account sessions.</li>
            </ul>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
              Note: We only request standard basic profile and email scopes (openid, profile, email). We do NOT request or access your Google contacts, Google Drive files, calendar, location history, or any other sensitive or restricted Google user data.
            </p>
          </div>

          <div className="space-y-2 pl-3 border-l-2 border-green-500">
            <p><strong>B. How We Use Google User Data:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To securely authenticate and log you into your DVDS Zone account without requiring a separate password.</li>
              <li>To associate your purchase history, physical DVD orders, shipping addresses, and saved items with your profile.</li>
              <li>To provide seamless customer care and support regarding your orders.</li>
            </ul>
          </div>

          <div className="space-y-2 pl-3 border-l-2 border-amber-500">
            <p><strong>C. Non-Sale &amp; Protection of Google User Data:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>No Sale of Data:</strong> DVDS Zone never sells, rents, leases, or trades Google user data to any third party, data broker, or marketing entity.</li>
              <li><strong>No Advertising Use:</strong> We do NOT share your Google user data with advertising platforms or track you across third-party websites.</li>
              <li><strong>No AI Model Training:</strong> Google user data is never used to train generalized artificial intelligence or machine learning models.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[11px] leading-relaxed">
            <strong className="block text-dark dark:text-white font-semibold mb-1">
              Google API Services User Data Policy Compliance Statement:
            </strong>
            DVDS Zone&apos;s use and transfer to any other app of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue dark:text-blue-400 underline font-medium"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </div>

          <div className="space-y-2 pl-3 border-l-2 border-purple-500">
            <p><strong>D. Google User Data Retention &amp; Permanent Deletion:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Retention:</strong> Your Google profile information is retained only as long as you maintain an active customer account with DVDS Zone.
              </li>
              <li>
                <strong>User-Requested Deletion:</strong> You have the absolute right to request the deletion of your account and all associated Google user data at any time. Simply send an email to <a href="mailto:azrayanltd@gmail.com" className="text-brand-blue dark:text-blue-400 font-mono underline">azrayanltd@gmail.com</a> with the subject line <em>&quot;Delete My Account &amp; Google Data&quot;</em>. All account profile records and authentication tokens will be permanently and irreversibly purged from our databases within 30 days.
              </li>
              <li>
                <strong>Revoking Google Access:</strong> You can also immediately revoke DVDS Zone&apos;s permission to access your Google account at any time directly through your Google Security settings at{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue dark:text-blue-400 underline font-mono"
                >
                  https://myaccount.google.com/permissions
                </a>.
              </li>
            </ul>
          </div>
        </section>

        {/* 2. ORDER FULFILLMENT & PAYMENT PROCESSING */}
        <section className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <h2 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
            2. Physical Order Fulfilment &amp; Payment Processing
          </h2>
          <p>
            When purchasing physical DVD box sets, films, or merchandise from DVDS Zone, we collect necessary transactional information:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Delivery Information:</strong> Full recipient name, physical delivery address, and contact phone number. This information is shared strictly with postal carriers (Royal Mail) solely to fulfill shipping and track physical deliveries across the UK and internationally.</li>
            <li><strong>Payment Information:</strong> All card payments and digital wallets (Apple Pay, Google Pay, PayPal) are processed directly by PCI-DSS certified payment processors (Stripe Payments Europe, Ltd. and PayPal Holdings, Inc.). <strong>DVDS Zone never views, handles, or stores your raw credit or debit card numbers, CVC codes, or banking credentials.</strong></li>
            <li><strong>Invoicing &amp; Statutory Accounting:</strong> Basic order receipts (items purchased, total amount, delivery address) are retained for 6 years in accordance with UK statutory tax and HMRC accounting laws.</li>
          </ul>
        </section>

        {/* 3. TECHNICAL SECURITY & INFRASTRUCTURE */}
        <section className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <h2 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
            3. Data Security &amp; Storage Architecture
          </h2>
          <p>
            We implement robust administrative, technical, and physical security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Encryption in Transit:</strong> All website traffic and API transactions are enforced via HTTPS / TLS 1.3 encryption with strict HTTP Strict Transport Security (HSTS).</li>
            <li><strong>Database Isolation:</strong> User profiles and database records are hosted on hardened PostgreSQL infrastructure with Row Level Security (RLS) policies, preventing unauthorized cross-tenant data access.</li>
            <li><strong>Storage at Rest:</strong> Database backups and sensitive system configurations are protected with AES-256 encryption.</li>
          </ul>
        </section>

        {/* 4. COOKIES & LOCAL STORAGE */}
        <section className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <h2 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
            4. Cookies &amp; Local Storage
          </h2>
          <p>
            DVDS Zone uses strictly necessary cookies and browser local storage solely to provide core website functionality, including:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Maintaining items in your shopping basket as you browse catalogue categories.</li>
            <li>Storing your secure authentication session when you log in.</li>
            <li>Remembering your visual interface preference (light or dark mode).</li>
          </ul>
          <p>We do not use invasive third-party cross-site behavioral tracking cookies.</p>
        </section>

        {/* 5. YOUR STATUTORY UK GDPR RIGHTS */}
        <section className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <h2 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
            5. Your Statutory Rights Under UK GDPR
          </h2>
          <p>
            Under the UK General Data Protection Regulation and the Data Protection Act 2018, you possess comprehensive rights over your personal data:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete personal details.</li>
            <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request the permanent deletion of your customer account and personal data.</li>
            <li><strong>Right to Restriction:</strong> Request the temporary restriction of processing your personal data.</li>
            <li><strong>Right to Data Portability:</strong> Receive your personal information in a structured, commonly used, machine-readable format.</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate business interests.</li>
            <li><strong>Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with the UK Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-brand-blue dark:text-blue-400 underline font-mono">ico.org.uk</a> or by telephone on 0303 123 1113.</li>
          </ul>
        </section>

        {/* 6. CONTACT & DATA CONTROLLER */}
        <section className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <h2 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
            6. Contact Our Data Controller
          </h2>
          <p>
            If you have questions about this Privacy Policy, wish to exercise your data protection rights, or submit a data deletion request, please reach out to our dedicated privacy contact:
          </p>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-1 text-xs">
            <p><strong>Operating Brand:</strong> DVDS Zone</p>
            <p><strong>Website:</strong> <a href="https://dvds-zone.co.uk" className="text-brand-blue dark:text-blue-400 font-mono hover:underline">https://dvds-zone.co.uk</a></p>
            <p><strong>Registered Entity:</strong> {settings.registered_company_name || 'AZRAYAN LTD'} (Company No. {settings.company_number || '13894195'})</p>
            <p><strong>Jurisdiction:</strong> England and Wales, United Kingdom</p>
            <p><strong>Privacy &amp; Data Rights Email:</strong> <a href="mailto:azrayanltd@gmail.com" className="text-brand-blue dark:text-blue-400 font-mono hover:underline font-medium">azrayanltd@gmail.com</a></p>
            <p><strong>Customer Telephone Hotline:</strong> <a href="tel:+447400320038" className="text-brand-blue dark:text-blue-400 font-mono hover:underline font-medium">00447400320038</a></p>
          </div>
        </section>
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
