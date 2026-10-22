import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Disc,
  ArrowLeft,
  Send,
  ExternalLink,
  Lock,
  ShoppingBag,
} from 'lucide-react';
import { publicApi } from '../lib/publicApi';
import { useThemeStore } from '../stores/useThemeStore';
import { cn } from '../lib/formatters';
import { GoogleGLogo } from '../components/landing/GoogleReviews';

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Poor — Disappointed with the product or service',
  2: 'Fair — Below expectations',
  3: 'Good — Standard satisfactory experience',
  4: 'Great — Very pleased with the DVD and delivery',
  5: 'Exceptional — Flawless quality, pristine packaging!',
};

export const ReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || '';
  const productId = searchParams.get('product_id') || searchParams.get('productId') || '';
  const token = searchParams.get('token') || '';

  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // State
  const [pageState, setPageState] = useState<'checking' | 'eligible' | 'ineligible' | 'submitted'>('checking');
  const [ineligibleReason, setIneligibleReason] = useState<string>('');
  const [alreadyReviewed, setAlreadyReviewed] = useState<boolean>(false);

  // Product & Order info
  const [productInfo, setProductInfo] = useState<{
    id: string;
    title: string;
    cover_image_url?: string;
    format?: string;
    slug?: string;
  } | null>(null);
  const [orderInfo, setOrderInfo] = useState<{ id: string; order_number: string } | null>(null);

  // Form inputs
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Google review link for optional post-submission step
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);

  // Fetch eligibility and store settings on mount
  useEffect(() => {
    let isMounted = true;

    // Fetch store settings to get optional Google review URL
    publicApi
      .getStoreSettings()
      .then((settings) => {
        if (!isMounted) return;
        if (settings?.google_review_url) {
          setGoogleReviewUrl(settings.google_review_url);
        }
      })
      .catch(() => {});

    // Check eligibility
    publicApi
      .checkReviewEligibilityWithToken({
        orderId: orderId || undefined,
        productId: productId || undefined,
        token: token || undefined,
      })
      .then((res) => {
        if (!isMounted) return;

        if (res.has_reviewed) {
          setAlreadyReviewed(true);
          setPageState('ineligible');
          setIneligibleReason('You have already submitted a review for this purchase.');
          if (res.product) setProductInfo(res.product);
          return;
        }

        if (!res.eligible) {
          setPageState('ineligible');
          setIneligibleReason(
            res.reason || 'This order or product is not currently eligible for review.'
          );
          return;
        }

        // Eligible!
        setPageState('eligible');
        if (res.product) setProductInfo(res.product);
        if (res.order) setOrderInfo(res.order);
        if (res.suggested_name) setReviewerName(res.suggested_name);
      })
      .catch((err) => {
        if (!isMounted) return;
        setPageState('ineligible');
        setIneligibleReason(err.message || 'Unable to verify review authorization.');
      });

    return () => {
      isMounted = false;
    };
  }, [orderId, productId, token]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (rating < 1 || rating > 5) {
      setFormError('Please select a star rating between 1 and 5.');
      return;
    }

    if (!title.trim() || title.trim().length < 2) {
      setFormError('Please provide a brief headline for your review (at least 2 characters).');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setFormError('Please share a few words about your experience (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      await publicApi.submitPostPurchaseReview({
        orderId: orderId || orderInfo?.id,
        productId: productId || productInfo?.id,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        reviewerName: reviewerName.trim() || undefined,
        token: token || undefined,
      });

      setPageState('submitted');
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white py-8 sm:py-12 px-4 transition-colors">
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/account/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-dark dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to My Orders</span>
          </Link>
        </div>

        {/* ── STATE 1: CHECKING ELIGIBILITY ── */}
        {pageState === 'checking' && (
          <div className="bg-white dark:bg-[#0F1523] border border-gray-200 dark:border-white/10 rounded-2xl p-10 text-center shadow-lg">
            <div className="w-10 h-10 rounded-full border-3 border-brand-blue border-t-transparent animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold">Verifying Order Details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Checking verified purchase status and review permissions...
            </p>
          </div>
        )}

        {/* ── STATE 2: INELIGIBLE OR ALREADY REVIEWED ── */}
        {pageState === 'ineligible' && (
          <div className="bg-white dark:bg-[#0F1523] border border-gray-200 dark:border-white/10 rounded-2xl p-8 sm:p-10 text-center shadow-lg">
            <div
              className={cn(
                'w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center',
                alreadyReviewed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-500'
              )}
            >
              {alreadyReviewed ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
            </div>

            <h2 className="text-xl sm:text-2xl font-black mb-2">
              {alreadyReviewed ? 'Review Already Submitted' : 'Review Not Available'}
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed mb-6">
              {ineligibleReason ||
                'To maintain genuine feedback, reviews can only be submitted for verified, completed orders.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/account/orders"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold text-xs transition-all shadow-sm"
              >
                <span>View Order History</span>
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-dark dark:text-white font-semibold text-xs transition-all"
              >
                <ShoppingBag size={14} />
                <span>Browse Store</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── STATE 3: REVIEW FORM (ELIGIBLE) ── */}
        {pageState === 'eligible' && (
          <div className="bg-white dark:bg-[#0F1523] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-[#0A0F1D] text-white p-6 sm:p-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider mb-3">
                <ShieldCheck size={14} />
                <span>Verified UK Customer Review</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Rate Your DVD Purchase
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/90 mt-1 max-w-lg">
                Your genuine experience helps fellow movie and television collectors make informed choices.
              </p>
            </div>

            {/* Product Snapshot Card */}
            {productInfo && (
              <div className="p-5 sm:p-6 bg-gray-50/70 dark:bg-[#131B2E]/60 border-b border-gray-200 dark:border-white/10 flex items-center gap-4">
                <div className="w-14 h-20 rounded-lg bg-gray-200 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                  {productInfo.cover_image_url ? (
                    <img
                      src={productInfo.cover_image_url}
                      alt={productInfo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Disc size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue block">
                    {productInfo.format || 'DVD Title'}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-dark dark:text-white truncate">
                    {productInfo.title}
                  </h3>
                  {orderInfo?.order_number && (
                    <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">
                      Order Reference: #{orderInfo.order_number}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-2">
                  Overall Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      aria-label={`Rate ${star} out of 5 stars`}
                      className="p-1 rounded-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    >
                      <Star
                        size={32}
                        className={cn(
                          'transition-colors',
                          star <= activeRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-gray-300 dark:text-gray-600'
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-bold text-dark dark:text-white">
                    {activeRating} / 5
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                  {RATING_DESCRIPTIONS[activeRating]}
                </p>
              </div>

              {/* Review Headline */}
              <div>
                <label
                  htmlFor="review-title"
                  className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1.5"
                >
                  Review Headline <span className="text-red-500">*</span>
                </label>
                <input
                  id="review-title"
                  type="text"
                  maxLength={120}
                  required
                  placeholder="e.g., Pristine disc condition, excellent UK delivery!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] text-dark dark:text-white text-xs sm:text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1">
                  <span>Summarise your experience in a headline</span>
                  <span>{title.length}/120</span>
                </div>
              </div>

              {/* Written Feedback */}
              <div>
                <label
                  htmlFor="review-comment"
                  className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1.5"
                >
                  Detailed Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  maxLength={2000}
                  required
                  placeholder="How was the video & audio quality? How did the disc arrive? Would you recommend this title to other film collectors?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] text-dark dark:text-white text-xs sm:text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                />
                <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1">
                  <span>Minimum 5 characters</span>
                  <span>{comment.length}/2000</span>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label
                  htmlFor="reviewer-name"
                  className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1.5"
                >
                  Display Name
                </label>
                <input
                  id="reviewer-name"
                  type="text"
                  maxLength={40}
                  placeholder="e.g. Sarah J."
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] text-dark dark:text-white text-xs sm:text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Only your first name and initial will be shown publicly to protect your privacy.
                </p>
              </div>

              {/* Privacy Notice Banner */}
              <div className="rounded-xl p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs flex items-start gap-3 text-blue-950 dark:text-blue-200">
                <Lock size={16} className="text-brand-blue shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Privacy Guarantee</p>
                  <p className="leading-relaxed text-[11px] text-blue-800 dark:text-blue-300">
                    We never publish your email address, billing address, or payment details. Your review is authenticated against your verified order to guarantee genuine feedback.
                  </p>
                </div>
              </div>

              {/* Form Error */}
              {formError && (
                <div className="rounded-xl p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Submitting Review...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit Verified Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STATE 4: SUBMITTED SUCCESS ── */}
        {pageState === 'submitted' && (
          <div className="bg-white dark:bg-[#0F1523] border border-gray-200 dark:border-white/10 rounded-2xl p-8 sm:p-10 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Thank You for Your Feedback!
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                Your review has been submitted and is currently in moderation. Once approved by our team, it will appear on the DVD title page and our verified customer testimonials.
              </p>
            </div>

            {/* Optional Google Review Step */}
            {googleReviewUrl && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-white/5 dark:to-white/5 border border-blue-100 dark:border-white/10 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <GoogleGLogo size={18} />
                  <span className="font-bold text-xs uppercase tracking-wider text-dark dark:text-white">
                    Share on Google (Optional)
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Enjoyed ordering from DVDs Zone? If you have a minute, we would greatly appreciate a quick review on our Google Business Profile to support our small UK warehouse.
                </p>
                <div>
                  <a
                    href={googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#141A26] hover:bg-gray-50 dark:hover:bg-white/10 text-brand-blue border border-blue-200 dark:border-white/20 shadow-2xs transition-all"
                  >
                    <span>Write Google Review</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to="/account/orders"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold text-xs shadow-sm transition-all"
              >
                <span>Return to Orders</span>
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-dark dark:text-white font-semibold text-xs transition-all"
              >
                <ShoppingBag size={14} />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
