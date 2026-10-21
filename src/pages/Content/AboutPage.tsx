import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Disc,
  ShieldCheck,
  Film,
  Award,
  Truck,
  Mail,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Tv,
  CheckCircle2,
  ExternalLink,
  Flame,
  HeartHandshake
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { publicApi } from '../../lib/publicApi';
import { Seo, toAbsoluteUrl } from '../../components/common/Seo';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';

export const AboutPage: React.FC = () => {
  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 60_000,
  });

  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;
  const storeName = settings.store_name || 'DVDs Zone';
  const companyName = settings.registered_company_name || 'AZRAYAN LTD';
  const companyNumber = settings.company_number || '13894195';

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-10 sm:py-16 transition-colors duration-200 relative overflow-hidden">
      {/* Ambient background glow matching homepage design */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(23,105,224,0.15),transparent)] pointer-events-none" />

      <Seo
        title={`About ${storeName} — UK Physical Media Vault & Official DVD Retailer`}
        description={
          settings.seo_organization_description ||
          `${storeName} is an official UK physical media retailer active since 2021, operated by ${companyName}. Specialising in authentic UK PAL DVDs, TV Box Sets, and restored cinema releases.`
        }
        canonicalPath="/about"
        keywords={`about ${storeName}, UK DVD shop, physical media UK, authentic PAL DVDs, British film store, DVD collector UK`}
        siteName={storeName}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: `About ${storeName}`,
          description:
            settings.seo_organization_description ||
            `Official UK physical media retailer specialising in PAL Region 2 DVDs and Box Sets, operated by ${companyName}.`,
          url: toAbsoluteUrl('/about'),
          publisher: { '@type': 'Organization', name: storeName, url: toAbsoluteUrl('/') },
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 relative z-10">
        {/* ── 1. Hero Section ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 text-brand-blue dark:text-blue-400 text-xs font-mono font-semibold tracking-wider uppercase shadow-2xs">
            <Disc className="w-3.5 h-3.5 animate-spin [animation-duration:12s]" />
            <span>ESTABLISHED 2021 · UNITED KINGDOM</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-dark dark:text-white tracking-tight leading-[1.1]">
            Dedicated to the Art &amp; Permanence of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              Physical Cinema
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            {storeName} is an independent British physical entertainment specialist operated by{' '}
            <strong className="text-dark dark:text-white font-semibold">{companyName}</strong>.
            We curate genuine, factory-sealed DVD releases, complete television seasons, and definitive box sets for dedicated collectors across the UK.
          </p>
        </div>

        {/* ── 2. Four Pillars of Excellence ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F]/90 backdrop-blur-md shadow-xs hover:border-brand-blue/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
              100% Authentic UK PAL
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Official Region 2 &amp; Region 0 releases with genuine studio sleeves, BBFC age ratings, and original inlay artwork.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F]/90 backdrop-blur-md shadow-xs hover:border-brand-blue/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Truck className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
              Free Royal Mail Delivery
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              100% Free UK standard delivery on every order with no minimum spend required. Dispatched same-day from our UK vault.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F]/90 backdrop-blur-md shadow-xs hover:border-brand-blue/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
              30-Day Guarantee
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Complete peace of mind. Faulty or damaged disc in transit? We arrange an immediate replacement or full refund without hassle.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F]/90 backdrop-blur-md shadow-xs hover:border-brand-blue/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
              Collector Care Vault
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Every box set and disc is hand-inspected and shipped in puncture-resistant protective packaging to ensure pristine arrival.
            </p>
          </div>
        </div>

        {/* ── 3. Why Physical Media Matters Feature Story ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-10 shadow-xs space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
              OUR PHILOSOPHY
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight">
              Why Physical DVDs Matter in the Streaming Era
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <div className="space-y-4">
              <p>
                In an era dominated by subscription algorithms and transient digital licensing, films and beloved TV seasons vanish overnight without warning. Mergers, expired distribution deals, and remote server edits regularly deprive audiences of the films they love.
              </p>
              <p>
                A physical disc in your collection is permanent. It cannot be altered remotely, censored, or made inaccessible by internet blackouts or recurring monthly paywalls. When you own a physical DVD, you truly own your cinema library.
              </p>
            </div>
            <div className="space-y-4">
              <p>
                Beyond true ownership, physical media preserves historical artifacts: audio commentaries by directors and cast, uncompressed stereo and 5.1 surround tracks, deleted scenes, behind-the-scenes documentaries, and physical printed booklets that are omitted from digital streams.
              </p>
              <p>
                At {storeName}, we take pride in connecting cinephiles, nostalgic viewers, and physical media advocates with the definitive physical editions they cherish.
              </p>
            </div>
          </div>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100 dark:border-white/10 text-center">
            <div className="p-3">
              <div className="font-display font-black text-2xl sm:text-3xl text-brand-blue dark:text-blue-400">2021</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-mono mt-0.5">Founded in UK</div>
            </div>
            <div className="p-3">
              <div className="font-display font-black text-2xl sm:text-3xl text-brand-blue dark:text-blue-400">100%</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-mono mt-0.5">Free UK Delivery</div>
            </div>
            <div className="p-3">
              <div className="font-display font-black text-2xl sm:text-3xl text-brand-blue dark:text-blue-400">2 Days</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-mono mt-0.5">Average Royal Mail ETA</div>
            </div>
            <div className="p-3">
              <div className="font-display font-black text-2xl sm:text-3xl text-brand-blue dark:text-blue-400">500+</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-mono mt-0.5">Curated Titles</div>
            </div>
          </div>
        </div>

        {/* ── 4. Verified Legal Operator & Contact Card ── */}
        <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/50 to-indigo-50/20 dark:from-[#0E131F] dark:to-[#141A26] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-100 dark:border-white/10">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
                LEGAL OPERATOR &amp; UK HEADQUARTERS
              </span>
              <h3 className="font-display font-bold text-xl text-dark dark:text-white mt-0.5">
                {companyName}
              </h3>
            </div>
            <a
              href={settings.companies_house_url || 'https://find-and-update.company-information.service.gov.uk/company/13894195'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue/90 transition-colors shrink-0 shadow-2xs"
            >
              <span>Companies House Record</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600 dark:text-gray-300">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-dark dark:text-white font-semibold">
                <MapPin className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Headquarters &amp; Dispatch Vault</span>
              </div>
              <p className="leading-relaxed pl-6">
                {storeName} — {settings.warehouse_location || settings.registered_office_address || 'United Kingdom'}
              </p>
              <p className="text-[11px] text-gray-400 pl-6">Company No. {companyNumber}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-dark dark:text-white font-semibold">
                <Mail className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Customer Support</span>
              </div>
              <p className="pl-6">
                <a href={`mailto:${settings.support_email || 'azrayanltd@gmail.com'}`} className="text-brand-blue dark:text-blue-400 hover:underline font-mono">
                  {settings.support_email || 'azrayanltd@gmail.com'}
                </a>
              </p>
              <p className="text-[11px] text-gray-400 pl-6">Mon–Sat · Replies within 3 business hours</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-dark dark:text-white font-semibold">
                <Phone className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Direct Customer Line</span>
              </div>
              <p className="pl-6">
                <a href={`tel:${settings.support_phone || '00447400320038'}`} className="text-brand-blue dark:text-blue-400 hover:underline font-mono font-bold">
                  {settings.support_phone || '00447400320038'}
                </a>
              </p>
              <p className="text-[11px] text-gray-400 pl-6">UK telephone enquiries &amp; order tracking</p>
            </div>
          </div>
        </div>

        {/* ── 5. Bottom Cinema Exploration CTA ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-8 sm:p-10 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-400 flex items-center justify-center mx-auto">
            <Film className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight">
            Ready to Build Your Home Collection?
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Explore our curated catalog of restored film editions, cult cinema, and definitive TV box sets with 100% Free UK Delivery.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/shop">
              <Button variant="primary" size="lg" className="inline-flex items-center gap-2">
                <span>Browse Complete Vault</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="secondary" size="lg">
                Contact Customer Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
