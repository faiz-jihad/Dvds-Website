import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Disc,
  Quote,
  ExternalLink,
} from 'lucide-react';
import { publicApi } from '../../lib/publicApi';
import { Review } from '../../types';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';

export interface CustomerReviewsCarouselProps {
  limit?: number;
  className?: string;
}

export const CustomerReviewsCarousel: React.FC<CustomerReviewsCarouselProps> = ({
  limit = 8,
  className,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Fetch verified approved reviews
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    publicApi
      .getHomepageTestimonials(limit)
      .then((data) => {
        if (!isMounted) return;
        setReviews(data);
      })
      .catch((err) => {
        console.warn('[CustomerReviewsCarousel] Could not load customer testimonials:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [limit]);

  const totalReviews = reviews.length;

  const nextSlide = useCallback(() => {
    if (totalReviews <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalReviews);
  }, [totalReviews]);

  const prevSlide = useCallback(() => {
    if (totalReviews <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalReviews) % totalReviews);
  }, [totalReviews]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation when user is focused inside the carousel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const isSwipeLeft = distance > 50;
    const isSwipeRight = distance < -50;

    if (isSwipeLeft) {
      nextSlide();
    } else if (isSwipeRight) {
      prevSlide();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Auto-play timer (respects prefers-reduced-motion)
  useEffect(() => {
    if (totalReviews <= 1 || isPaused) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 7000);

    return () => clearInterval(interval);
  }, [totalReviews, isPaused, nextSlide]);

  // NEVER fabricate fake reviews or social proof. If no approved reviews exist, render a subtle authentic buyer guarantee.
  if (!isLoading && totalReviews === 0) {
    return (
      <section
        id="customer-reviews-carousel"
        className={cn(
          'relative w-full overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm p-6 sm:p-8',
          isDark
            ? 'bg-gradient-to-br from-[#0B1120] via-[#0E172A] to-[#070B14] border-white/10 text-white'
            : 'bg-gradient-to-br from-[#FAFCFF] via-[#FFFFFF] to-[#F1F5F9] border-blue-100 text-gray-900',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>100% Verified Buyer Reviews</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Real Collector Experiences
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
              All customer reviews on DVD Zone are submitted directly by verified customers following order delivery. No fabricated testimonials.
            </p>
          </div>
          <Link
            to="/account/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-blue-600 text-white shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Star size={14} className="fill-amber-300 text-amber-300" />
            <span>Rate Past Purchase</span>
          </Link>
        </div>
      </section>
    );
  }

  // Format date cleanly (e.g., "18 Oct 2026")
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(isoString));
    } catch {
      return '';
    }
  };

  return (
    <section
      id="customer-reviews-carousel"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Verified Customer Reviews"
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50',
        isDark
          ? 'bg-gradient-to-br from-[#0B1120] via-[#0E172A] to-[#070B14] border-white/10 text-white'
          : 'bg-gradient-to-br from-[#FAFCFF] via-[#FFFFFF] to-[#F1F5F9] border-blue-100 text-gray-900',
        className
      )}
    >
      {/* Background cinematic glow accents */}
      <div
        className="pointer-events-none absolute -top-32 -right-16 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 w-96 h-96 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }}
      />

      <div className="relative z-10 p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-gray-200/60 dark:border-white/10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider',
                  isDark
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                )}
              >
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Verified Buyer Reviews</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'} from UK orders
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-snug">
              What Our DVD Collectors Say
            </h3>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Genuine feedback submitted by verified customers after receiving their order.
            </p>
          </div>

          {/* Carousel Arrows & Counter */}
          {totalReviews > 1 && (
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-end">
              <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500">
                {currentIndex + 1} / {totalReviews}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous customer review"
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border',
                    isDark
                      ? 'bg-white/5 hover:bg-white/10 text-white border-white/10 active:scale-95'
                      : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-200 shadow-2xs active:scale-95'
                  )}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next customer review"
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border',
                    isDark
                      ? 'bg-white/5 hover:bg-white/10 text-white border-white/10 active:scale-95'
                      : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-200 shadow-2xs active:scale-95'
                  )}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Carousel Slide Area */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
            <p className="text-xs text-gray-400">Loading verified customer reviews...</p>
          </div>
        ) : (
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {reviews.map((rev) => {
                const rating = Math.max(1, Math.min(5, rev.rating));
                const dateStr = formatDate(rev.created_at);

                return (
                  <div
                    key={rev.id}
                    className="w-full shrink-0 px-1 sm:px-2"
                    aria-roledescription="slide"
                    aria-label={`Review ${currentIndex + 1} of ${totalReviews}`}
                  >
                    <div
                      className={cn(
                        'rounded-2xl p-6 sm:p-8 border transition-all relative overflow-hidden flex flex-col justify-between min-h-[260px]',
                        isDark
                          ? 'bg-[#131C31]/70 border-white/10 backdrop-blur-md shadow-lg shadow-black/20'
                          : 'bg-white/95 border-gray-200/80 shadow-md shadow-blue-500/5'
                      )}
                    >
                      {/* Decorative quote mark */}
                      <Quote
                        size={64}
                        className="absolute right-4 top-4 text-brand-blue/10 dark:text-white/5 pointer-events-none select-none"
                      />

                      <div className="space-y-4">
                        {/* Rating Stars and Verified Tag */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={16}
                                className={cn(
                                  star <= rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-transparent text-gray-300 dark:text-gray-600'
                                )}
                              />
                            ))}
                            <span className="ml-1 text-xs font-bold text-gray-700 dark:text-gray-200">
                              {rating}.0
                            </span>
                          </div>

                          {rev.is_verified_purchase && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                                isDark
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              )}
                            >
                              <ShieldCheck size={12} className="text-emerald-500" />
                              <span>Verified Purchase</span>
                            </span>
                          )}
                        </div>

                        {/* Review Headline & Body */}
                        <div className="space-y-2">
                          {rev.title && (
                            <h4 className="text-base sm:text-lg font-bold text-dark dark:text-white leading-snug">
                              &ldquo;{rev.title}&rdquo;
                            </h4>
                          )}
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal italic">
                            {rev.comment}
                          </p>
                        </div>
                      </div>

                      {/* Footer: Customer display name + Product card */}
                      <div className="pt-6 mt-6 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Reviewer identity & date */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-blue to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {rev.reviewer_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-dark dark:text-white">
                              {rev.reviewer_name || 'Verified Collector'}
                            </p>
                            {dateStr && (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                Reviewed on {dateStr}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Associated Product Thumbnail Link */}
                        {rev.product && (
                          <Link
                            to={`/product/${rev.product.slug}`}
                            className={cn(
                              'group inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold max-w-xs',
                              isDark
                                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
                                : 'bg-gray-50 hover:bg-blue-50/70 border-gray-200 text-gray-700'
                            )}
                            title={`View ${rev.product.title}`}
                          >
                            <div className="w-7 h-9 rounded bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                              {rev.product.cover_image_url ? (
                                <img
                                  src={rev.product.cover_image_url}
                                  alt={rev.product.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Disc size={12} className="text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] text-gray-400 block font-normal uppercase tracking-wider">
                                Purchased Title
                              </span>
                              <span className="truncate block font-bold text-xs group-hover:text-brand-blue transition-colors">
                                {rev.product.title}
                              </span>
                            </div>
                            <ExternalLink size={12} className="text-gray-400 group-hover:text-brand-blue shrink-0 ml-auto" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Carousel Pagination Dots */}
        {totalReviews > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {reviews.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => goToSlide(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                aria-current={dotIdx === currentIndex ? 'true' : 'false'}
                className={cn(
                  'h-2 rounded-full transition-all cursor-pointer',
                  dotIdx === currentIndex
                    ? 'w-6 bg-brand-blue'
                    : 'w-2 bg-gray-300 dark:bg-white/20 hover:bg-gray-400 dark:hover:bg-white/40'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerReviewsCarousel;
