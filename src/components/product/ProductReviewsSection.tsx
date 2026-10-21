import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  Star,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  PenLine,
  LogIn,
  X,
  Sparkles,
} from 'lucide-react';
import { Product, Review, ReviewSummary, ReviewEligibility } from '../../types';
import { publicApi } from '../../lib/publicApi';
import { StarRating } from '../common/StarRating';
import { Button } from '../common/Button';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useUiStore } from '../../stores/useUiStore';
import { formatDateUK, cn } from '../../lib/formatters';

interface ProductReviewsSectionProps {
  product: Product;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 Star — Disappointing / Poor',
  2: '2 Stars — Fair / Below Average',
  3: '3 Stars — Good Standard Release',
  4: '4 Stars — Very Good / Highly Recommended',
  5: '5 Stars — Masterpiece / Essential Cinema',
};

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ product }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { customer, isAuthenticated } = useCustomerAuth();
  const addToast = useUiStore((state) => state.addToast);

  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState(customer?.full_name || '');
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch paginated approved reviews
  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', product.id, page],
    queryFn: () => publicApi.getProductReviews(product.id, { page, limit: 6 }),
    staleTime: 30_000,
  });

  // 2. Fetch rating summary & distribution
  const summaryQuery = useQuery<ReviewSummary>({
    queryKey: ['product-review-summary', product.id],
    queryFn: () => publicApi.getProductReviewSummary(product.id),
    staleTime: 30_000,
  });

  // 3. Fetch user review eligibility & verified purchase status
  const eligibilityQuery = useQuery<ReviewEligibility>({
    queryKey: ['product-review-eligibility', product.id, customer?.id],
    queryFn: () => publicApi.checkUserReviewEligibility(product.id),
    enabled: Boolean(product.id),
    staleTime: 15_000,
  });

  // 4. Submit review mutation
  const submitMutation = useMutation({
    mutationFn: publicApi.submitProductReview,
    onSuccess: (data: Review) => {
      addToast(
        data.status === 'approved'
          ? 'Your review has been published!'
          : 'Thank you! Your review has been submitted for moderation.',
        'success'
      );
      setIsFormOpen(false);
      setTitle('');
      setComment('');
      setFormError(null);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['product-reviews', product.id] });
      queryClient.invalidateQueries({ queryKey: ['product-review-summary', product.id] });
      queryClient.invalidateQueries({ queryKey: ['product-review-eligibility', product.id] });
      queryClient.invalidateQueries({ queryKey: ['store', 'product', product.slug] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Could not submit your review. Please try again.');
    },
  });

  const reviews = reviewsQuery.data?.reviews || [];
  const totalReviews = summaryQuery.data?.total_reviews || reviewsQuery.data?.total || 0;
  const averageRating = summaryQuery.data?.average_rating || 0;
  const totalPages = Math.ceil((reviewsQuery.data?.total || 0) / 6) || 1;

  const eligibility = eligibilityQuery.data;
  const isVerifiedBuyer = eligibility?.is_verified_purchase ?? false;
  const hasReviewed = eligibility?.has_reviewed ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (rating < 1 || rating > 5) {
      setFormError('Please select a star rating between 1 and 5.');
      return;
    }
    if (!title.trim() || title.trim().length < 2) {
      setFormError('Please enter a headline of at least 2 characters.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 5) {
      setFormError('Please write a detailed review of at least 5 characters.');
      return;
    }

    submitMutation.mutate({
      productId: product.id,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      reviewerName: reviewerName.trim() || customer?.full_name || 'Customer',
    });
  };

  const getPercentage = (count: number) => {
    if (!totalReviews || totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  return (
    <section id="customer-reviews" className="mt-16 pt-10 border-t border-gray-200 dark:border-white/10 sm:mt-24 sm:pt-12 scroll-mt-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
              Customer Feedback &amp; Ratings
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Star className="w-3 h-3 fill-current" />
              Verified Authenticity
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight mt-1">
            Customer Reviews
          </h2>
        </div>

        {/* Action Button */}
        <div>
          {!isAuthenticated ? (
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0E131F] hover:bg-gray-50 dark:hover:bg-white/10 text-dark dark:text-white border border-gray-300 dark:border-white/15 text-xs font-bold transition shadow-xs"
            >
              <LogIn className="w-4 h-4 text-brand-blue dark:text-blue-400" />
              <span>Sign In to Review</span>
            </Link>
          ) : hasReviewed ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>You have reviewed this release</span>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (!reviewerName && customer?.full_name) {
                  setReviewerName(customer.full_name);
                }
                setIsFormOpen((prev) => !prev);
              }}
              className="inline-flex items-center gap-2 text-xs font-bold"
            >
              <PenLine className="w-4 h-4" />
              <span>{isFormOpen ? 'Cancel Review' : 'Write a Customer Review'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Rating Summary Card + Reviews List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Rating Scorecard & Histogram (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#0E131F] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
              Overall Rating
            </h3>

            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-black font-mono tracking-tight text-dark dark:text-white">
                {averageRating > 0 ? averageRating.toFixed(1) : '—'}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">out of 5.0</span>
                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {totalReviews} {totalReviews === 1 ? 'verified review' : 'verified reviews'}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <StarRating rating={averageRating} size="lg" />
            </div>

            {/* 5-Bar Rating Breakdown Histogram */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-white/10 text-xs">
              {[
                { stars: 5, count: summaryQuery.data?.five_star || 0 },
                { stars: 4, count: summaryQuery.data?.four_star || 0 },
                { stars: 3, count: summaryQuery.data?.three_star || 0 },
                { stars: 2, count: summaryQuery.data?.two_star || 0 },
                { stars: 1, count: summaryQuery.data?.one_star || 0 },
              ].map(({ stars, count }) => {
                const pct = getPercentage(count);
                return (
                  <div key={stars} className="flex items-center gap-2.5">
                    <span className="w-12 font-medium text-gray-600 dark:text-gray-400 shrink-0 flex items-center gap-1">
                      <span>{stars}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-9 text-right font-mono text-gray-400 dark:text-gray-500 shrink-0">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Verified Purchase Guarantee Note */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/10 flex items-start gap-2.5 text-xs text-gray-500 dark:text-gray-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>100% Verified Purchases:</strong> Only customers with completed, paid orders are awarded the Verified Buyer badge.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Review Form or Reviews List (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Write a Review Modal / Expandable Card */}
          {isFormOpen && (
            <div className="bg-white dark:bg-[#0E131F] border-2 border-brand-blue/40 rounded-2xl p-6 sm:p-8 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-brand-blue font-bold">
                    Share Your Thoughts
                  </span>
                  <h3 className="font-display font-bold text-xl text-dark dark:text-white mt-1">
                    Reviewing &ldquo;{product.title}&rdquo;
                  </h3>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
                  aria-label="Close review form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Verified Purchase Banner in form */}
              {isVerifiedBuyer ? (
                <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Verified Purchase Confirmed:</strong> We verified your order for this DVD title. Your review will display the verified buyer badge.
                  </span>
                </div>
              ) : (
                <div className="mb-6 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 text-xs text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    Your honest thoughts help the community! Reviews are subject to standard editorial moderation before appearing publicly.
                  </span>
                </div>
              )}

              {formError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Star Rating Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
                    Overall Rating <span className="text-brand-red">*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <StarRating
                      rating={rating}
                      size="lg"
                      interactive={true}
                      onRatingChange={(newRating) => setRating(newRating)}
                    />
                    <span className="text-xs font-bold text-amber-500 dark:text-amber-400 font-mono">
                      {RATING_LABELS[rating]}
                    </span>
                  </div>
                </div>

                {/* 2. Reviewer Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Your Display Name <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. John C."
                    maxLength={80}
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-[#141A26] text-sm text-dark dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-blue transition"
                  />
                </div>

                {/* 3. Review Headline */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Review Headline <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Pristine DVD pressing, superb commentary tracks!"
                    maxLength={120}
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-[#141A26] text-sm text-dark dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-blue transition"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-mono">
                    <span>Keep it punchy and concise</span>
                    <span>{title.length} / 120</span>
                  </div>
                </div>

                {/* 4. Review Comment */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Detailed Review <span className="text-brand-red">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share details about the picture quality, audio transfer, bonus features, packaging condition, or your overall cinema experience..."
                    maxLength={2000}
                    required
                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-[#141A26] text-sm text-dark dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-blue transition"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-mono">
                    <span>Minimum 5 characters</span>
                    <span>{comment.length} / 2,000</span>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitMutation.isPending}
                    className="text-xs font-bold px-6 py-2.5"
                  >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* User's existing review if pending */}
          {eligibility?.existing_review && eligibility.existing_review.status === 'pending' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Your review is in moderation:</strong> &ldquo;{eligibility.existing_review.title}&rdquo; is awaiting staff approval.
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/20">
                Pending
              </span>
            </div>
          )}

          {/* Reviews List */}
          {reviewsQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-[#0E131F] rounded-xl p-5 border border-gray-200 dark:border-white/10 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10" />
                    <div className="space-y-1.5">
                      <div className="w-24 h-3 rounded bg-gray-200 dark:bg-white/10" />
                      <div className="w-16 h-2 rounded bg-gray-200 dark:bg-white/10" />
                    </div>
                  </div>
                  <div className="w-3/4 h-4 rounded bg-gray-200 dark:bg-white/10 mb-2" />
                  <div className="w-full h-12 rounded bg-gray-200 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white dark:bg-[#0E131F] rounded-2xl p-8 sm:p-12 border border-gray-200 dark:border-white/10 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-dark dark:text-white mb-2">
                No Reviews Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
                Be the first to share your verdict on this release. Every review helps physical media enthusiasts build their definitive cinema collection.
              </p>
              {isAuthenticated && !hasReviewed && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsFormOpen(true)}
                  className="text-xs font-bold inline-flex items-center gap-2"
                >
                  <PenLine className="w-4 h-4" />
                  <span>Be the First to Review</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const isPending = review.status === 'pending';
                return (
                  <article
                    key={review.id}
                    className={cn(
                      'bg-white dark:bg-[#0E131F] rounded-2xl p-6 border transition-all duration-200 shadow-xs',
                      isPending
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-gray-200 dark:border-white/10 hover:border-blue-500/30'
                    )}
                  >
                    {/* Review Top Bar */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-dark dark:text-white">
                            {review.reviewer_name}
                          </span>

                          {review.is_verified_purchase && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                              <ShieldCheck className="w-3 h-3 shrink-0" />
                              <span>Verified Purchase</span>
                            </span>
                          )}

                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              <span>Your Review (Pending Moderation)</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono block mt-0.5">
                          Reviewed in the United Kingdom on {formatDateUK(review.created_at)}
                        </span>
                      </div>

                      {/* Stars */}
                      <StarRating rating={review.rating} size="sm" />
                    </div>

                    {/* Headline */}
                    <h4 className="font-display font-bold text-base text-dark dark:text-white mb-2 leading-snug">
                      {review.title}
                    </h4>

                    {/* Review Body */}
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal whitespace-pre-line">
                      {review.comment}
                    </p>
                  </article>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/10 text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-mono">
                    Page {page} of {totalPages}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-[#141A26] text-dark dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-[#141A26] text-dark dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
