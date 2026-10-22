import React, { useState } from 'react';
import {
  Star,
  ExternalLink,
  MessageSquarePlus,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Quote,
  Sparkles,
  Info,
} from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';
import { VERIFIED_GOOGLE_REVIEWS, VerifiedGoogleReview } from '../../data/verifiedGoogleReviews';

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

export const DEFAULT_GOOGLE_REVIEW_URL = 'https://g.page/r/CcbYihBj8jECEBM/review';

export interface CustomGoogleReviewsSectionProps {
  /** Optional review URL override. Falls back to VITE_GOOGLE_REVIEW_URL or verified default */
  reviewUrl?: string | null;
  /** Verified customer reviews list. NEVER fabricate. */
  reviews?: VerifiedGoogleReview[];
  /** Section heading */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Optional CSS class */
  className?: string;
}

/**
 * CustomGoogleReviewsSection
 *
 * Lightweight, native React Google Reviews component for DVDs Zone.
 *
 * KEY FEATURES:
 * 1. Zero Third-Party Widgets: No Elfsight script, no subscription fees, no monthly impression limits.
 * 2. Absolute Authenticity: Only genuine reviews are displayed. Never fabricates names, stars, or testimonials.
 * 3. Graceful Empty / Invitation State: If no verified reviews are populated yet, it renders an
 *    accessible invitation card with a direct "Write a Google Review" CTA.
 * 4. Safe Links: Outgoing review links use target="_blank" and rel="noopener noreferrer".
 */
export const CustomGoogleReviewsSection: React.FC<CustomGoogleReviewsSectionProps> = ({
  reviewUrl,
  reviews = VERIFIED_GOOGLE_REVIEWS,
  title = 'What Our Customers Say',
  subtitle = 'Authentic experiences and reviews from film collectors and entertainment enthusiasts across the United Kingdom.',
  className,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [currentPage, setCurrentPage] = useState(0);

  // Resolve Review URL
  const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env.VITE_GOOGLE_REVIEW_URL as string | undefined)
    : undefined;

  const resolvedReviewUrl = (reviewUrl && reviewUrl.trim().length > 0)
    ? reviewUrl.trim()
    : (envUrl && envUrl.trim().length > 0)
    ? envUrl.trim()
    : DEFAULT_GOOGLE_REVIEW_URL;

  const isConfigured = Boolean(resolvedReviewUrl && /^https?:\/\//i.test(resolvedReviewUrl));

  // Genuine reviews filtering (must have author and valid rating 1-5)
  const validReviews = Array.isArray(reviews)
    ? reviews.filter((r) => r && r.author_name && r.rating >= 1 && r.rating <= 5)
    : [];

  const hasReviews = validReviews.length > 0;

  // Pagination for reviews grid/carousel (3 per page on desktop)
  const pageSize = 3;
  const totalPages = Math.ceil(validReviews.length / pageSize);
  const displayedReviews = validReviews.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // Calculate verified average only if genuine reviews exist
  const averageRating = hasReviews
    ? validReviews.reduce((sum, r) => sum + r.rating, 0) / validReviews.length
    : null;

  return (
    <section
      id="custom-google-reviews-section"
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

      <div className="relative z-10 p-6 sm:p-8 md:p-10 space-y-8">
        {/* Header Block: Title, Google Verified Badge, Optional Rating & Review CTA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200/60 dark:border-white/10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider',
                isDark ? 'bg-white/10 text-blue-400 border border-white/10' : 'bg-blue-50 text-blue-700 border border-blue-100'
              )}>
                <GoogleGLogo size={14} />
                <span>Verified Google Reviews</span>
              </span>
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                isDark ? 'text-gray-400 bg-white/5' : 'text-gray-600 bg-gray-100'
              )}>
                Customer Experience &amp; Trust
              </span>
            </div>

            <h2 className={cn('text-2xl sm:text-3xl font-black tracking-tight leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
              {title}
            </h2>

            <p className={cn('text-xs sm:text-sm leading-relaxed max-w-xl', isDark ? 'text-gray-300' : 'text-gray-600')}>
              {subtitle}
            </p>

            {hasReviews && averageRating && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-0.5" aria-label={`Average rating: ${averageRating.toFixed(1)} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= Math.round(averageRating) ? 'text-[#FBBC05] fill-[#FBBC05]' : 'text-gray-400'}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className="text-xs font-bold">{averageRating.toFixed(1)} / 5.0</span>
                <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  ({validReviews.length} {validReviews.length === 1 ? 'verified review' : 'verified reviews'})
                </span>
              </div>
            )}
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
        </div>

        {/* ── Content Area: Reviews Cards Grid OR Clean Community Invitation State ── */}
        {hasReviews ? (
          <div className="space-y-6">
            {/* Review Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {displayedReviews.map((review) => (
                <div
                  key={review.id}
                  className={cn(
                    'flex flex-col justify-between p-5 sm:p-6 rounded-xl border transition-all duration-200 shadow-2xs',
                    isDark
                      ? 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                      : 'bg-white border-gray-200/80 hover:border-blue-200 hover:shadow-xs'
                  )}
                >
                  <div className="space-y-3">
                    {/* Author & Rating Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {review.author_photo_url ? (
                          <img
                            src={review.author_photo_url}
                            alt={review.author_name}
                            className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 shadow-2xs',
                              'bg-gradient-to-br from-[#4285F4] to-[#1a6de0]'
                            )}
                          >
                            {review.author_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className={cn('text-sm font-bold truncate leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
                            {review.author_name}
                          </h4>
                          {(review.relative_time_description || review.review_date) && (
                            <span className={cn('text-[11px] block truncate', isDark ? 'text-gray-400' : 'text-gray-500')}>
                              {review.relative_time_description || review.review_date}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Google G source badge */}
                      <div
                        className={cn(
                          'p-1.5 rounded-lg shrink-0',
                          isDark ? 'bg-white/10' : 'bg-gray-100'
                        )}
                        title="Posted on Google"
                      >
                        <GoogleGLogo size={16} />
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1" aria-label={`Rating: ${review.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={15}
                          className={star <= review.rating ? 'text-[#FBBC05] fill-[#FBBC05]' : 'text-gray-300 dark:text-gray-600'}
                          aria-hidden="true"
                        />
                      ))}
                    </div>

                    {/* Review Content */}
                    <p className={cn('text-xs sm:text-sm leading-relaxed line-clamp-4', isDark ? 'text-gray-200' : 'text-gray-700')}>
                      "{review.text}"
                    </p>
                  </div>

                  {/* Card Footer: Verified Badge & Optional Link */}
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>Verified Customer</span>
                    </span>
                    {review.source_url && (
                      <a
                        href={review.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4285F4] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <span>View Source</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls if more than 3 reviews */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className={cn(
                    'p-2 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                    isDark ? 'border-white/10 hover:bg-white/10 text-white' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                  )}
                  aria-label="Previous reviews page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={cn('text-xs font-semibold', isDark ? 'text-gray-400' : 'text-gray-600')}>
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className={cn(
                    'p-2 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                    isDark ? 'border-white/10 hover:bg-white/10 text-white' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                  )}
                  aria-label="Next reviews page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Clean, Native Community Invitation Card (Zero Fabricated Reviews) */
          <div
            className={cn(
              'rounded-2xl p-6 sm:p-10 text-center space-y-6 border transition-all',
              isDark
                ? 'bg-gradient-to-b from-white/[0.04] to-transparent border-white/10'
                : 'bg-gradient-to-b from-blue-50/60 to-white border-blue-100'
            )}
          >
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/10">
              <GoogleGLogo size={36} />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <h3 className={cn('text-xl sm:text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
                Share Your DVDs Zone Experience
              </h3>
              <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-gray-300' : 'text-gray-600')}>
                As an independent UK physical media retailer, authentic feedback from fellow collectors means the world to us. Received your DVD box set or cinematic edition? Leave a review on our verified Google Business Profile.
              </p>
            </div>

            {/* 3 Authentic Trust Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2">
              <div className={cn(
                'p-3.5 rounded-xl border text-center space-y-1',
                isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200/70 shadow-2xs'
              )}>
                <ShieldCheck size={18} className="mx-auto text-emerald-500" />
                <p className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>100% Genuine Media</p>
                <p className={cn('text-[11px]', isDark ? 'text-gray-400' : 'text-gray-500')}>Original UK releases &amp; box sets</p>
              </div>

              <div className={cn(
                'p-3.5 rounded-xl border text-center space-y-1',
                isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200/70 shadow-2xs'
              )}>
                <CheckCircle2 size={18} className="mx-auto text-[#4285F4]" />
                <p className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>Same-Day Dispatch</p>
                <p className={cn('text-[11px]', isDark ? 'text-gray-400' : 'text-gray-500')}>Royal Mail 48 tracked delivery</p>
              </div>

              <div className={cn(
                'p-3.5 rounded-xl border text-center space-y-1',
                isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200/70 shadow-2xs'
              )}>
                <Sparkles size={18} className="mx-auto text-amber-500" />
                <p className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>Collector Care</p>
                <p className={cn('text-[11px]', isDark ? 'text-gray-400' : 'text-gray-500')}>Carefully packed bubble protection</p>
              </div>
            </div>

            {/* Action Call */}
            {isConfigured && (
              <div className="pt-2">
                <a
                  href={resolvedReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide bg-[#4285F4] hover:bg-[#1a6de0] text-white shadow-md hover:shadow-[0_0_24px_rgba(66,133,244,0.45)] active:scale-95 transition-all cursor-pointer"
                  aria-label="Write a Google Review for DVDs Zone (opens Google in a new tab)"
                >
                  <MessageSquarePlus size={16} />
                  <span>Write a Google Review</span>
                  <ExternalLink size={14} className="opacity-80" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Bottom Trust & Compliance Strip */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t text-[11px]',
            isDark ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'
          )}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
            <span>Direct link to official DVDs Zone Google Business Profile</span>
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

export default CustomGoogleReviewsSection;
