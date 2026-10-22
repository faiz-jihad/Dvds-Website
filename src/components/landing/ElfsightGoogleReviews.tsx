import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';

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

export const DEFAULT_ELFSIGHT_APP_ID = '2cb5859b-9d80-46cf-b70f-f54b84bb69c0';
export const DEFAULT_GOOGLE_REVIEW_URL = 'https://g.page/r/CcbYihBj8jECEBM/review';
const ELFSIGHT_SCRIPT_SRC = 'https://elfsightcdn.com/platform.js';

export interface ElfsightGoogleReviewsProps {
  /** Optional Elfsight Widget App ID override */
  appId?: string | null;
  /** Optional Google Review URL override for "Write a Google Review" button */
  reviewUrl?: string | null;
  /** Section heading */
  title?: string;
  /** Section subtitle/description */
  subtitle?: string;
  /** Optional CSS class */
  className?: string;
  /** Whether to show the custom outer header (false by default to prevent duplicate title/button with Elfsight's built-in header) */
  showCustomHeader?: boolean;
  /** Whether to show the outer header CTA button */
  showCta?: boolean;
}

/**
 * ElfsightGoogleReviews
 *
 * Official Elfsight Google Reviews widget integration for DVDs Zone.
 *
 * Features & Compliance:
 * 1. Authenticity: Displays only genuine Google reviews fetched via the verified Elfsight widget.
 *    NEVER fabricates reviewer names, star counts, or fake testimonials.
 * 2. SPA & Re-render Safe: Checks for existing platform.js to prevent duplicate injection,
 *    and safely triggers window.Eapps.initialize() upon mounting or route changes.
 * 3. Graceful Resilience: If the widget fails to load (e.g. adblocker, offline, network outage),
 *    it degrades gracefully into a clean review invitation without breaking the page.
 * 4. CTA: Direct link to write a review at https://g.page/r/CcbYihBj8jECEBM/review with safe attributes.
 */
export const ElfsightGoogleReviews: React.FC<ElfsightGoogleReviewsProps> = ({
  appId,
  reviewUrl,
  title = 'What Our Customers Say',
  subtitle = 'Authentic feedback and experiences from film collectors and entertainment enthusiasts across the United Kingdom.',
  className,
  showCustomHeader = false,
  showCta = false,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  // Resolve widget App ID (prop -> env -> default)
  const envAppId = typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env.VITE_ELFSIGHT_APP_ID as string | undefined)
    : undefined;
  const resolvedAppId = (appId && appId.trim().length > 0)
    ? appId.trim()
    : (envAppId && envAppId.trim().length > 0)
    ? envAppId.trim()
    : DEFAULT_ELFSIGHT_APP_ID;

  // Resolve Review URL (prop -> env -> default)
  const envReviewUrl = typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env.VITE_GOOGLE_REVIEW_URL as string | undefined)
    : undefined;
  const resolvedReviewUrl = (reviewUrl && reviewUrl.trim().length > 0)
    ? reviewUrl.trim()
    : (envReviewUrl && envReviewUrl.trim().length > 0)
    ? envReviewUrl.trim()
    : DEFAULT_GOOGLE_REVIEW_URL;

  const isConfigured = Boolean(resolvedReviewUrl && /^https?:\/\//i.test(resolvedReviewUrl));

  useEffect(() => {
    let isMounted = true;

    const triggerElfsightInit = () => {
      if (typeof window !== 'undefined' && (window as any).Eapps && typeof (window as any).Eapps.initialize === 'function') {
        try {
          (window as any).Eapps.initialize();
        } catch (err) {
          console.warn('[Elfsight] Initialization note:', err);
        }
      }
    };

    // 1. Check if platform.js is already in the document
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src*="elfsightcdn.com/platform.js"]`);

    if (existingScript) {
      if (isMounted) setScriptLoaded(true);
      triggerElfsightInit();
      const timer = setTimeout(triggerElfsightInit, 300);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    // 2. Inject official script as singleton
    const script = document.createElement('script');
    script.src = ELFSIGHT_SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      if (!isMounted) return;
      setScriptLoaded(true);
      setLoadError(false);
      triggerElfsightInit();
      setTimeout(triggerElfsightInit, 350);
    };

    script.onerror = () => {
      if (!isMounted) return;
      setLoadError(true);
      console.warn('[Elfsight] Failed to load platform script. Gracefully displaying fallback review CTA.');
    };

    document.head.appendChild(script);

    return () => {
      isMounted = false;
    };
  }, [resolvedAppId]);

  return (
    <section
      id="google-reviews-section"
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border transition-all duration-300 select-none shadow-sm',
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

      <div className="relative z-10 p-5 sm:p-7 md:p-8 space-y-6">
        {/* Optional Custom Header Block (disabled by default to prevent duplicate title and button with Elfsight's widget) */}
        {showCustomHeader && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200/60 dark:border-white/10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider',
                  isDark ? 'bg-white/10 text-blue-400 border border-white/10' : 'bg-blue-50 text-blue-700 border border-blue-100'
                )}>
                  <GoogleGLogo size={14} />
                  <span>Verified Google Reviews</span>
                </span>
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  isDark ? 'text-gray-400 bg-white/5' : 'text-gray-600 bg-gray-100'
                )}>
                  Independent Customer Feedback
                </span>
              </div>

              <h2 className={cn('text-2xl sm:text-3xl font-black tracking-tight leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
                {title}
              </h2>

              <p className={cn('text-xs sm:text-sm leading-relaxed max-w-xl', isDark ? 'text-gray-300' : 'text-gray-600')}>
                {subtitle}
              </p>
            </div>

            {/* Right Action: Write a Google Review CTA */}
            {showCta && (
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
                    <ExternalLink size={15} className="opacity-75 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-80"
                    title="Google Review link coming soon"
                    aria-disabled="true"
                  >
                    <GoogleGLogo size={16} />
                    <span>Write a Google Review</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Official Elfsight Widget Container ── */}
        <div className="min-h-[160px] w-full" ref={containerRef}>
          {loadError ? (
            /* Graceful fallback if third-party CDN is blocked or offline */
            <div
              className={cn(
                'rounded-xl p-6 sm:p-8 text-center space-y-3 border border-dashed',
                isDark ? 'border-white/15 bg-white/5 text-gray-300' : 'border-blue-200 bg-blue-50/50 text-gray-700'
              )}
            >
              <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-white/10 shadow-xs">
                <GoogleGLogo size={28} />
              </div>
              <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                Customer Reviews on Google
              </h3>
              <p className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                {subtitle}
              </p>
              {isConfigured && (
                <div className="pt-2">
                  <a
                    id="write-google-review-cta"
                    href={resolvedReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4285F4] hover:bg-[#1a6de0] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    aria-label="Write a Google Review for DVDs Zone (opens Google in a new tab)"
                  >
                    <GoogleGLogo size={16} />
                    <span>Write a Google Review</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* Official Elfsight Google Reviews widget target (renders single clean header, title, and "Review us on Google" button) */
            <div
              className={`elfsight-app-${resolvedAppId} w-full transition-opacity duration-300`}
              data-elfsight-app-lazy
            />
          )}
        </div>

        {/* Bottom Trust & Compliance Footer */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-[11px]',
            isDark ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'
          )}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
            <span>Reviews provided by verified customers via Google Business Profile</span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-[#4285F4] shrink-0" aria-hidden="true" />
            <span>Opens Google in a secure, new browser tab</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ElfsightGoogleReviews;
