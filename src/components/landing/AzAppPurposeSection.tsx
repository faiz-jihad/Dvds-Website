import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Disc, UserCheck, ExternalLink, ArrowRight, Building2, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { StoreSettings } from '../../types';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';

interface AzAppPurposeSectionProps {
  settings?: StoreSettings | null;
}

export const AzAppPurposeSection: React.FC<AzAppPurposeSectionProps> = ({ settings }) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const companyName = settings?.registered_company_name || 'AZRAYAN LTD';
  const companyNumber = settings?.company_number || '13894195';
  const supportEmail = settings?.support_email || 'info@dvds-zone.co.uk';
  const companiesHouseUrl = settings?.companies_house_url || 'https://find-and-update.company-information.service.gov.uk/company/13894195';

  return (
    <section
      id="app-purpose-section"
      aria-labelledby="app-purpose-heading"
      className={cn(
        'w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-y transition-colors',
        isDark ? 'bg-[#090D16] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
      )}
    >
      <div className="max-w-[1400px] mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <ShieldCheck size={14} className="shrink-0" />
            <span>Store Transparency &amp; Application Purpose</span>
          </div>
          <h2
            id="app-purpose-heading"
            className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight"
          >
            About DVDs Zone &amp; Our Application Purpose
          </h2>
          <p className={cn('text-sm sm:text-base leading-relaxed', isDark ? 'text-gray-300' : 'text-gray-600')}>
            <strong>DVDS Zone</strong> is an online e-commerce platform and physical media archive operated by{' '}
            <strong>{companyName}</strong> (Company No. {companyNumber}, registered in England &amp; Wales, active since 2021).
            Our storefront is completely open to the public without requiring an account or login.
          </p>
        </div>

        {/* 3 Core Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Application Purpose & Service */}
          <div
            className={cn(
              'p-6 rounded-2xl border transition-all flex flex-col justify-between',
              isDark ? 'bg-[#0E1422] border-white/10' : 'bg-white border-gray-200 shadow-xs'
            )}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-brand-blue flex items-center justify-center">
                <Disc size={22} />
              </div>
              <h3 className="text-lg font-bold font-display">1. What DVDs Zone Does</h3>
              <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-gray-300' : 'text-gray-600')}>
                We operate a specialised e-commerce catalogue for physical entertainment media: DVD box sets, Blu-ray collections, cinema releases, and television series.
              </p>
              <ul className="space-y-2 text-xs pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>Real-time stock availability and regional disc format details.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>Fulfillment from UK warehouse via Royal Mail tracked delivery.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>Secure checkout via Stripe (Cards, Apple Pay, Google Pay) and PayPal.</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-white/10 mt-4">
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
              >
                <span>Read our company story</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Card 2: Public Access — No Login Required */}
          <div
            className={cn(
              'p-6 rounded-2xl border transition-all flex flex-col justify-between',
              isDark ? 'bg-[#0E1422] border-white/10' : 'bg-white border-gray-200 shadow-xs'
            )}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                <Lock size={20} />
              </div>
              <h3 className="text-lg font-bold font-display">2. 100% Public &amp; Open Access</h3>
              <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-gray-300' : 'text-gray-600')}>
                <strong>No login is required to use this website.</strong> All visitors enjoy complete, unrestricted public access to browse films, search categories, and order physical discs.
              </p>
              <ul className="space-y-2 text-xs pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>Browse full film summaries, audio specs, and pricing freely.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>Guest checkout supported — buy without creating an account.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>Zero paywalls, zero authentication gates, and zero hidden sections.</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-white/10 mt-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
              >
                <span>Browse public shop catalogue</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Card 3: Why Sign In with Google? (OAuth Usage & Limited Use) */}
          <div
            className={cn(
              'p-6 rounded-2xl border transition-all flex flex-col justify-between',
              isDark ? 'bg-[#0E1422] border-white/10' : 'bg-white border-gray-200 shadow-xs'
            )}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <h3 className="text-lg font-bold font-display">3. Why Sign In With Google?</h3>
              <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-gray-300' : 'text-gray-600')}>
                Google Sign-In is an <strong>optional feature</strong> provided strictly for customer convenience and security:
              </p>
              <ul className="space-y-2 text-xs pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>One-Click Sign In:</strong> Secure authentication without remembering passwords.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Wishlist &amp; Favourites:</strong> Keep saved box sets synced across your devices.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Order History &amp; Royal Mail Tracking:</strong> Instant access to past orders and tracking.</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-white/10 mt-4 space-y-1">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Data used: Name, Email &amp; Avatar only. Never sold, never used for ads or AI training.
              </p>
              <Link
                to="/privacy"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
              >
                <span>Read Google User Data disclosures</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Operating Entity & Verification Bar */}
        <div
          className={cn(
            'p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 text-xs',
            isDark ? 'bg-[#0B0F19] border-white/10' : 'bg-blue-50/50 border-blue-100'
          )}
        >
          <div className="flex items-center gap-3">
            <Building2 size={24} className="text-brand-blue shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                Official Registered Operator: {companyName}
              </p>
              <p className={cn('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-600')}>
                Registered in England &amp; Wales (Company No. {companyNumber}) &bull; Active since 2021 &bull; Contact: {supportEmail}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={companiesHouseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                isDark ? 'border-white/15 bg-white/5 hover:bg-white/10 text-white' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-800'
              )}
            >
              <span>Companies House</span>
              <ExternalLink size={12} />
            </a>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/90 transition-colors shadow-xs"
            >
              <FileText size={12} />
              <span>Privacy Policy</span>
            </Link>
            <Link
              to="/terms"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                isDark ? 'border-white/15 bg-white/5 hover:bg-white/10 text-white' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-800'
              )}
            >
              <span>Terms of Service</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
export default AzAppPurposeSection;
