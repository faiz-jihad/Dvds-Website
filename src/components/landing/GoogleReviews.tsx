import React, { useEffect, useRef, useState } from 'react';
import {
  Star,
  ExternalLink,
  MessageSquarePlus,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';

export const DEFAULT_REVIEWGRID_ID = '5f7dfa8a-15b8-47ea-9bb9-fe31c19cdcf7';
export const DEFAULT_REVIEWS_WIDGET_SCRIPT_URL = 'https://reviewswidget.app/embed.js';
export const DEFAULT_GOOGLE_REVIEW_URL = 'https://g.page/r/CcbYihBj8jECEBM/review';
export const DEFAULT_GOOGLE_BUSINESS_LISTING_URL =
  'https://www.google.com/maps/place/DVDs+Zone/@52.4974437,-2.0284367,11z/data=!3m1!4b1!4m14!1m7!3m6!1s0x26822c24ea01d861:0x231f263108ad8c6!2sDVDs+Zone!8m2!3d52.4973492!4d-1.8636315!16s%2Fg%2F11zzy9h3bs';

/**
 * Official Google G Logo SVG with verified 4-color branding:
 * Red (#EA4335), Blue (#4285F4), Yellow (#FBBC05), Green (#34A853).
 */
export const GoogleGLogo: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

export interface GoogleReviewsProps {
  /** ReviewsWidget data-reviewgrid ID (default: '5f7dfa8a-15b8-47ea-9bb9-fe31c19cdcf7') */
  widgetId?: string;
  /** ReviewsWidget script source URL (default: 'https://reviewswidget.app/embed.js') */
  scriptUrl?: string;
  /** Google Review URL for direct "Write a Review" CTA (falls back to VITE_GOOGLE_REVIEW_URL or verified default) */
  reviewUrl?: string | null;
  /** Section heading title */
  title?: string;
  /** Section subtitle description */
  subtitle?: string;
  /** Custom wrapper className */
  className?: string;
}

/**
 * GoogleReviews
 *
 * Production-ready, responsive Google Reviews component for DVDs Zone powered by ReviewsWidget.app.
 *
 * FEATURES:
 * 1. Safe React script loading via useEffect: checks for existing script tags to prevent duplicate injection.
 * 2. Official ReviewsWidget in-page embed container with data-reviewgrid attribute.
 * 3. Appends script to document.head exclusively, avoiding container duplication and React Strict Mode issues.
 * 4. Displays genuine customer reviews returned by the provider without simulating data.
 * 5. Direct, accessible "Write a Google Review" button pointing to DVDs Zone verified Google review page.
 * 6. DVDs Zone cinematic responsive aesthetics with seamless light & dark theme support.
 */
export const GoogleReviews: React.FC<GoogleReviewsProps> = ({
  widgetId = DEFAULT_REVIEWGRID_ID,
  scriptUrl = DEFAULT_REVIEWS_WIDGET_SCRIPT_URL,
  reviewUrl,
  title = 'What Our Customers Say',
  subtitle = 'Authentic reviews and collector experiences from DVD enthusiasts across the United Kingdom.',
  className,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptStatus, setScriptStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Resolve Review URL (prop -> env var -> verified default)
  const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env.VITE_GOOGLE_REVIEW_URL as string | undefined)
    : undefined;

  const resolvedReviewUrl = (reviewUrl && reviewUrl.trim().length > 0)
    ? reviewUrl.trim()
    : (envUrl && envUrl.trim().length > 0)
    ? envUrl.trim()
    : DEFAULT_GOOGLE_REVIEW_URL;

  const isConfigured = Boolean(resolvedReviewUrl && /^https?:\/\//i.test(resolvedReviewUrl));

  useEffect(() => {
    let isMounted = true;

    // Check if ReviewsWidget embed script is already loaded or in DOM
    const scriptSelector = `script[src="${scriptUrl}"], script[data-reviewgrid-embed]`;
    let scriptElement = document.querySelector<HTMLScriptElement>(scriptSelector);

    const handleScriptLoaded = () => {
      if (!isMounted) return;
      setScriptStatus('loaded');
    };

    const handleScriptError = () => {
      if (!isMounted) return;
      console.warn('[GoogleReviews] ReviewsWidget script failed to load. Displaying fallback view.');
      setScriptStatus('error');
    };

    if (scriptElement) {
      setScriptStatus('loaded');
      handleScriptLoaded();
    } else {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.id = 'reviewswidget-embed-script';
      script.setAttribute('data-reviewgrid-script', '1');

      script.addEventListener('load', handleScriptLoaded);
      script.addEventListener('error', handleScriptError);
      scriptElement = script;

      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (scriptElement) {
        scriptElement.removeEventListener('load', handleScriptLoaded);
        scriptElement.removeEventListener('error', handleScriptError);
      }
    };
  }, [scriptUrl, widgetId]);

  return (
    <section
      id="google-reviews-section"
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm',
        isDark
          ? 'bg-gradient-to-br from-[#0B1120] via-[#0D1526] to-[#070B14] border-white/10 text-white'
          : 'bg-gradient-to-br from-[#F8FAFC] via-[#FFFFFF] to-[#EFF4FE] border-blue-100 text-gray-900',
        className
      )}
      aria-label="Google Customer Reviews Section"
    >
      {/* DVDs Zone / Google ambient radial glow accents */}
      <div
        className="pointer-events-none absolute -top-28 -left-16 w-88 h-88 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #4285F4 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-28 -right-16 w-88 h-88 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #34A853 0%, transparent 70%)' }}
      />

      <div className="relative z-10 p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
        {/* Header Block: Title, Google Verified Badge, and Write Review CTA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200/60 dark:border-white/10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider',
                  isDark
                    ? 'bg-white/10 text-blue-400 border border-white/10'
                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                )}
              >
                <GoogleGLogo size={14} />
                <span>Verified Google Reviews</span>
              </span>
              <span
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  isDark ? 'text-gray-400 bg-white/5' : 'text-gray-600 bg-gray-100'
                )}
              >
                Customer Trust &amp; Satisfaction
              </span>
            </div>

            <h2
              className={cn(
                'text-2xl sm:text-3xl font-black tracking-tight leading-tight',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              {title}
            </h2>

            <p
              className={cn(
                'text-xs sm:text-sm leading-relaxed max-w-xl',
                isDark ? 'text-gray-300' : 'text-gray-600'
              )}
            >
              {subtitle}
            </p>
          </div>

          {/* Right Action: Write a Google Review CTA */}
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isConfigured ? (
              <a
                id="write-google-review-cta"
                href={resolvedReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-md bg-[#4285F4] hover:bg-[#1a6de0] text-white hover:shadow-[0_0_24px_rgba(66,133,244,0.45)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:ring-offset-2"
                aria-label="Write a Google Review for DVDs Zone (opens Google in a new tab)"
              >
                <GoogleGLogo size={18} />
                <span>Write a Google Review</span>
                <ExternalLink
                  size={15}
                  className="opacity-75 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-80"
                aria-disabled="true"
              >
                <GoogleGLogo size={16} />
                <span>Write a Google Review</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Widget Render Area ── */}
        <div className="relative min-h-[140px] w-full">
          {/* 1. Official ReviewsWidget in-page embed container */}
          <div
            ref={containerRef}
            className="w-full transition-opacity duration-300"
            style={{ minHeight: '120px' }}
          >
            {/* The exact official ReviewsWidget embed target div */}
            <div
              data-reviewgrid={widgetId}
              id={`reviewgrid-${widgetId}`}
              className="w-full"
            />
          </div>

          {/* 2. Loading Skeleton (shown while script is loading) */}
          {scriptStatus === 'loading' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'p-6 rounded-xl border animate-pulse space-y-4',
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-28 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="h-2.5 w-16 bg-gray-200 dark:bg-white/10 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 rounded" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded" />
                    <div className="h-3 w-4/5 bg-gray-200 dark:bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Fallback View (if script was blocked by ad-blocker or offline) */}
          {scriptStatus === 'error' && (
            <div
              className={cn(
                'rounded-xl p-6 sm:p-8 text-center space-y-4 border transition-all',
                isDark
                  ? 'bg-white/[0.03] border-white/10'
                  : 'bg-blue-50/50 border-blue-100'
              )}
            >
              <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/10">
                <GoogleGLogo size={28} />
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  DVDs Zone Customer Reviews on Google
                </h3>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  Read authentic customer feedback and ratings directly on our verified Google Business Profile.
                </p>
              </div>

              {isConfigured && (
                <div className="pt-2">
                  <a
                    href={resolvedReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-[#4285F4] hover:bg-[#1a6de0] text-white shadow-sm transition-all"
                  >
                    <MessageSquarePlus size={14} />
                    <span>View All Reviews on Google</span>
                    <ExternalLink size={12} className="opacity-80" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Trust & Compliance Strip */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t text-[11px]',
            isDark ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'
          )}
        >
          <a
            href={DEFAULT_GOOGLE_BUSINESS_LISTING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:underline hover:text-[#4285F4] transition-colors cursor-pointer group"
            aria-label="View official DVDs Zone Google Business Profile on Google Maps (opens in a new tab)"
          >
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
            <span className="group-hover:underline">Official DVDs Zone Google Business Profile</span>
            <ExternalLink size={11} className="opacity-70 group-hover:opacity-100" />
          </a>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-[#4285F4] shrink-0" aria-hidden="true" />
              <span>Verified Google Business Listing</span>
            </span>
            <span className="opacity-40">•</span>
            <span className="text-gray-400">100% Genuine Physical Media Collectors</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviews;


