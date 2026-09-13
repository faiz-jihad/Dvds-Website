import React from 'react';

export const PrivacyPage: React.FC = () => (
  <div className="bg-white min-h-screen py-16">
    <div className="max-w-3xl mx-auto px-6 space-y-6 text-xs text-gray-700 leading-relaxed">
      <span className="font-mono text-brand-blue uppercase tracking-widest text-[11px]">LEGAL NOTICE</span>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark">Privacy Policy</h1>
      <p>Last updated: September 2026. AZ Rayan DVDs complies with UK GDPR and the Data Protection Act 2018.</p>
      <h3 className="font-display font-bold text-sm text-dark pt-2">Data Collection & Use</h3>
      <p>We only collect personal information required to dispatch physical media orders and process payments via Stripe. We do not sell your personal data to third parties.</p>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="bg-white min-h-screen py-16">
    <div className="max-w-3xl mx-auto px-6 space-y-6 text-xs text-gray-700 leading-relaxed">
      <span className="font-mono text-brand-blue uppercase tracking-widest text-[11px]">LEGAL NOTICE</span>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark">Terms & Conditions</h1>
      <p>These terms govern all purchases made through AZ Rayan DVDs in the United Kingdom.</p>
      <h3 className="font-display font-bold text-sm text-dark pt-2">Orders & Pricing</h3>
      <p>All prices are quoted in GBP (£) and include applicable taxes. We reserve the right to correct pricing errors prior to dispatch.</p>
    </div>
  </div>
);

export const RefundPolicyPage: React.FC = () => (
  <div className="bg-white min-h-screen py-16">
    <div className="max-w-3xl mx-auto px-6 space-y-6 text-xs text-gray-700 leading-relaxed">
      <span className="font-mono text-brand-blue uppercase tracking-widest text-[11px]">LEGAL NOTICE</span>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark">Refund Policy</h1>
      <p>Our returns and refund policy aligns with the UK Consumer Rights Act 2015.</p>
      <h3 className="font-display font-bold text-sm text-dark pt-2">30-Day Cancellation</h3>
      <p>Customers possess a statutory 14-day cancellation right, extended by AZ Rayan DVDs to 30 days for sealed physical discs.</p>
    </div>
  </div>
);
