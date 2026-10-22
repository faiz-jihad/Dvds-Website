import React from 'react';
import { Star, ExternalLink, MessageSquarePlus } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';
import {
  CustomGoogleReviewsSection,
  DEFAULT_GOOGLE_REVIEW_URL,
} from './CustomGoogleReviewsSection';

export { CustomGoogleReviewsSection };

/**
 * Official Google G Logo SVG with verified 4-color branding:
 * Red (#EA4335), Blue (#4285F4), Yellow (#FBBC05), Green (#34A853).
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

/**
 * GoogleReviewsBanner
 *
 * Configurable Google Reviews component for DVDs Zone.
 * Supports:
 * - 'section': Full-width lightweight, custom Google reviews section (zero third-party scripts).
 * - 'compact': Sleek trust bar for footers and post-checkout pages.
 *
 * CONFIGURATION:
 * 1. Environment Variable (.env):
 *    VITE_GOOGLE_REVIEW_URL=https://g.page/r/CcbYihBj8jECEBM/review
 * 2. Store Settings (CMS):
 *    Passed via `reviewUrl` prop (e.g. settings?.google_review_url)
 *
 * COMPLIANCE & INTEGRITY:
 * - Native React implementation with zero third-party widget fees or impression quotas.
 * - Displays authentic customer feedback only; never fabricates ratings, counts, or testimonials.
 * - Safe link attributes (`target="_blank"`, `rel="noopener noreferrer"`).
 * - Safe disabled state when unconfigured.
 */

export interface GoogleReviewsBannerProps {
  /** Optional review URL override. Falls back to import.meta.env.VITE_GOOGLE_REVIEW_URL or verified default */
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

  const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env.VITE_GOOGLE_REVIEW_URL as string | undefined)
    : undefined;

  const resolvedUrl = (reviewUrl && reviewUrl.trim().length > 0)
    ? reviewUrl.trim()
    : (envUrl && envUrl.trim().length > 0)
    ? envUrl.trim()
    : DEFAULT_GOOGLE_REVIEW_URL;

  const isConfigured = Boolean(resolvedUrl && /^https?:\/\//i.test(resolvedUrl));

  // Verified rating display helper (strictly only if verifiedRating is provided and valid)
  const hasVerifiedRating = typeof verifiedRating === 'number' && verifiedRating > 0 && verifiedRating <= 5;

  // Full-width homepage custom reviews section
  if (variant === 'section') {
    return (
      <CustomGoogleReviewsSection
        reviewUrl={resolvedUrl}
        className={className}
      />
    );
  }

  // Compact variant for global footers and post-checkout pages
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
            <span>Write a Google Review</span>
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
            <span>Write a Google Review</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default GoogleReviewsBanner;
