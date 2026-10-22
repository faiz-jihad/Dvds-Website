import React, { useState } from 'react';
import { Star, ExternalLink, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';

/**
 * GoogleReviewsBanner
 *
 * Configurable Google Reviews call-to-action banner for DVDs Zone.
 *
 * CONFIGURATION:
 * 1. Environment Variable (.env):
 *    VITE_GOOGLE_REVIEW_URL=https://g.page/r/YOUR_PLACE_ID/review
 * 2. Store Settings (CMS):
 *    Passed via `reviewUrl` prop (e.g. settings?.google_review_url)
 *
 * COMPLIANCE & INTEGRITY:
 * - Does NOT display fabricated ratings, review counts, or testimonials.
 * - If `verifiedRating` and `verifiedReviewCount` are not provided, no rating/stars are fabricated.
 * - Safe link attributes (`target="_blank"`, `rel="noopener noreferrer"`).
 * - When no URL is configured, link is not clickable / broken.
 */

export const GoogleGLogo: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
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

export interface GoogleReviewsBannerProps {
  /** Optional review URL override. Falls back to import.meta.env.VITE_GOOGLE_REVIEW_URL */
  reviewUrl?: string | null;
  /** Layout style: 'section' (full-width homepage banner) or 'compact' (footer / sidebar card) */
  variant?: 'section' | 'compact';
  /** Only displayed if verified numeric rating exists (1.0 - 5.0). NEVER fabricate. */
  verifiedRating?: number | null;
  /** Only displayed if verified count exists. NEVER fabricate. */
  verifiedReviewCount?: number | null;
  /** Custom wrapper class */
  className?: string;
}

export const GoogleReviewsBanner: React.FC<GoogleReviewsBannerProps> = ({
  reviewUrl,
  variant = 'section',
  verifiedRating,
  verifiedReviewCount,
  className,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [hovered, setHovered] = useState(false);

  const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env.VITE_GOOGLE_REVIEW_URL as string | undefined)
    : undefined;

  const resolvedUrl = (reviewUrl && reviewUrl.trim().length > 0)
    ? reviewUrl.trim()
    : (envUrl && envUrl.trim().length > 0)
    ? envUrl.trim()
    : null;

  const isConfigured = Boolean(resolvedUrl && /^https?:\/\//i.test(resolvedUrl));

  // Verified rating display helper (strictly only if verifiedRating is provided and valid)
  const hasVerifiedRating = typeof verifiedRating === 'number' && verifiedRating > 0 && verifiedRating <= 5;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all duration-200',
          isDark
            ? 'bg-[#0B1120]/80 border-white/10 hover:border-white/20'
            : 'bg-white border-gray-200 hover:border-blue-200 shadow-xs',
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            isDark ? 'bg-white/10' : 'bg-blue-50'
          )}>
            <GoogleGLogo size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-bold truncate', isDark ? 'text-white' : 'text-gray-900')}>
                Google Reviews
              </span>
              {hasVerifiedRating && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span>{verifiedRating.toFixed(1)}</span>
                  {typeof verifiedReviewCount === 'number' && (
                    <span className="text-gray-400 font-normal">({verifiedReviewCount})</span>
                  )}
                </div>
              )}
            </div>
            <p className={cn('text-[11px] truncate', isDark ? 'text-gray-400' : 'text-gray-600')}>
              Share your feedback with UK physical media collectors
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {isConfigured ? (
            <a
              href={resolvedUrl!}
              target="_blank"
              rel="noopener noreferrer"
              id="google-review-compact-cta"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4285F4] hover:bg-[#1a6de0] text-white text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:ring-offset-2"
              aria-label="Write a Google Review for DVDs Zone (opens Google in a new tab)"
            >
              <MessageSquarePlus size={14} aria-hidden="true" />
              <span>Review Us</span>
              <ExternalLink size={12} className="opacity-80" aria-hidden="true" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-medium cursor-not-allowed opacity-75"
              title="Google Review URL not configured in VITE_GOOGLE_REVIEW_URL"
            >
              <MessageSquarePlus size={13} aria-hidden="true" />
              <span>Review Link Coming Soon</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border transition-all duration-300 select-none shadow-sm',
        isDark
          ? 'bg-gradient-to-br from-[#0B1120] via-[#0D1526] to-[#070B14] border-white/10 text-white'
          : 'bg-gradient-to-br from-[#F5F8FF] via-[#FFFFFF] to-[#EFF4FE] border-blue-100 text-gray-900',
        className
      )}
      aria-label="Google Customer Reviews call-to-action"
    >
      {/* Subtle ambient Google-branded radial glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-12 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #4285F4 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-12 w-80 h-80 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #34A853 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-6 sm:px-10 py-8 sm:py-10">
        {/* Left Side: Google branding & invitation */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left max-w-2xl">
          <div
            className={cn(
              'shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-300',
              isDark
                ? 'bg-white/10 backdrop-blur-md border border-white/10'
                : 'bg-white border border-blue-50 shadow-blue-100/50',
              hovered && 'scale-105'
            )}
            aria-hidden="true"
          >
            <GoogleGLogo size={36} />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#4285F4]">
                Google Customer Reviews
              </span>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                isDark ? 'bg-white/10 text-gray-300' : 'bg-blue-100 text-blue-700'
              )}>
                Verified Platform
              </span>
            </div>

            <h2 className={cn('text-xl sm:text-2xl font-black tracking-tight leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
              Enjoyed your DVDs Zone order?{' '}
              <span className="text-[#4285F4]">Share your experience.</span>
            </h2>

            <p className={cn('text-xs sm:text-sm leading-relaxed max-w-xl', isDark ? 'text-gray-300' : 'text-gray-600')}>
              Your feedback helps film collectors across the UK discover restored editions, TV box sets, and authentic physical entertainment releases.
            </p>

            {hasVerifiedRating && (
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <div className="flex items-center gap-0.5" aria-label={`${verifiedRating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i <= Math.round(verifiedRating!) ? 'text-[#FBBC05] fill-[#FBBC05]' : 'text-gray-400'}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className="text-xs font-bold">{verifiedRating!.toFixed(1)} / 5.0</span>
                {typeof verifiedReviewCount === 'number' && (
                  <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    ({verifiedReviewCount} verified reviews)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="shrink-0 flex flex-col items-center gap-2.5 w-full sm:w-auto">
          {isConfigured ? (
            <a
              id="google-review-section-cta"
              href={resolvedUrl!}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-md bg-[#4285F4] hover:bg-[#1a6de0] text-white hover:shadow-[0_0_24px_rgba(66,133,244,0.45)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:ring-offset-2"
              aria-label="Write a Google Review for DVDs Zone (opens Google in a new tab)"
            >
              <GoogleGLogo size={18} />
              <span>Write a Google Review</span>
              <ExternalLink size={15} className="opacity-75 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            </a>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-80"
                title="Google Review link not yet configured. Set VITE_GOOGLE_REVIEW_URL in .env to enable."
                aria-disabled="true"
              >
                <GoogleGLogo size={18} />
                <span>Write a Google Review</span>
              </button>
              <p className={cn('text-[11px] font-medium text-center', isDark ? 'text-gray-400' : 'text-gray-500')}>
                Review link coming soon (configure <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">VITE_GOOGLE_REVIEW_URL</code>)
              </p>
            </div>
          )}

          <p className={cn('text-[11px] text-center flex items-center gap-1.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" aria-hidden="true" />
            <span>Opens Google Reviews in a secure tab</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviewsBanner;
