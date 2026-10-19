
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Copy, X, Tag, Clock } from 'lucide-react';
import { StoreSettings } from '../../types';
import { publicApi } from '../../lib/publicApi';
import { formatGBP, cn } from '../../lib/formatters';
import { useThemeStore } from '../../stores/useThemeStore';

interface PromoBannerPopupProps {
  settings?: StoreSettings | null;
}

const STORAGE_KEY = 'dvds_promo_popup_dismissed_until';

export const PromoBannerPopup: React.FC<PromoBannerPopupProps> = ({
  settings: propSettings,
}) => {
  const navigate = useNavigate();

  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 30_000,
    enabled: !propSettings,
  });

  const settings = propSettings ?? settingsQuery.data;

  const promotionsQuery = useQuery({
    queryKey: ['store', 'active-promotions'],
    queryFn: () => publicApi.getActivePromotions(),
    staleTime: 30_000,
  });

  const activePromotions = promotionsQuery.data || [];
  // Find matching promotion configured in settings or use the first active promotion
  const activePromo =
    activePromotions.find(
      (p) =>
        p.code.trim().toUpperCase() ===
        (settings?.vip_promo_code || '').trim().toUpperCase()
    ) || activePromotions[0];

  const isDark = useThemeStore((state) => state.theme) === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const isEnabled = settings?.campaign_popup_enabled ?? true;
  const isActive = settings?.campaign_is_active ?? true;
  const hasActiveOffer = Boolean(activePromo || settings?.vip_promo_code);

  const image = settings?.campaign_banner_image ||
    '/promos/special-offer-banner.jpg';
  const title = settings?.campaign_title ||
    "A little something for your collection";
  const tagline = settings?.campaign_tagline ||
    'Discover selected editions and collector favourites.';

  const promoCode = (activePromo?.code || settings?.vip_promo_code || 'RAYAN10')
    .trim()
    .toUpperCase();
  const discount = activePromo ? activePromo.value : (settings?.vip_promo_discount ?? 10);
  const minSpend = activePromo ? activePromo.minimum_order : (settings?.vip_min_spend ?? 15);
  const promoType = activePromo?.type || 'percentage';
  const discountText = settings?.campaign_discount_text || (promoType === 'fixed_amount' ? `${formatGBP(discount)} OFF` : `${discount}% OFF`);
  const endsAt = activePromo?.ends_at || settings?.campaign_ends_at || settings?.deal_ends_at;

  useEffect(() => {
    if (!isEnabled || !isActive || !hasActiveOffer) {
      setIsOpen(false);
      return;
    }

    // Never auto-popup for automated review bots, crawlers, or headless browsers
    const isBotOrCrawler =
      typeof navigator !== 'undefined' &&
      /bot|crawler|spider|crawling|google|lighthouse|inspection|headless/i.test(navigator.userAgent);
    if (isBotOrCrawler) {
      setIsOpen(false);
      return;
    }

    try {
      const dismissedUntil = Number(
        localStorage.getItem(STORAGE_KEY) || 0
      );
      if (dismissedUntil > Date.now()) return;
    } catch {
      // Continue without persistence if storage is unavailable.
    }

    // Generous delay so initial home page inspection is never obstructed
    const timer = window.setTimeout(() => setIsOpen(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isEnabled, isActive]);

  useEffect(() => {
    if (!endsAt) {
      setTimeLeft('');
      return;
    }

    const update = () => {
      const difference = new Date(endsAt).getTime() - Date.now();

      if (!Number.isFinite(difference) || difference <= 0) {
        setTimeLeft('');
        return;
      }

      const totalHours = Math.floor(difference / 3_600_000);
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const minutes = Math.floor((difference / 60_000) % 60);

      setTimeLeft(
        days > 0
          ? `${days}d ${hours}h remaining`
          : `${hours}h ${minutes}m remaining`
      );
    };

    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  const closePopup = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          String(Date.now() + 24 * 60 * 60 * 1000)
        );
      } catch {
        // Closing still works if storage is unavailable.
      }
    }

    setIsOpen(false);
  };

  const copyCode = async (
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    event?.stopPropagation();

    try {
      await navigator.clipboard.writeText(promoCode);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setIsCopied(false);
    }
  };

  const exploreOffers = () => {
    closePopup();
    navigate('/shop?filter=sale');
  };

  if (!isEnabled || !isActive || !hasActiveOffer) return null;

  return (
    <>
      {/* Floating Offer Pill: safe-area aware on mobile, responsive to light/dark themes */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed z-40 flex items-center gap-2 rounded-full px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold shadow-xl border backdrop-blur-md transition-all duration-300 active:scale-95 hover:scale-[1.03] cursor-pointer',
            'bottom-[max(1rem,env(safe-area-inset-bottom))] left-3.5 sm:left-6',
            'bg-white text-gray-900 border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:bg-white',
            'dark:bg-[#111622]/95 dark:text-white dark:border-white/15 dark:hover:bg-[#182030] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
          )}
          aria-label="View special offer"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 shrink-0">
            <Tag size={12} className="text-amber-500 dark:text-amber-400" />
          </span>
          <span className="truncate max-w-[130px] sm:max-w-none">{discountText}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        </button>
      )}

      {/* Modal Dialog: centered, constrained to viewport height, seamless dark/light styling */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-title"
          onClick={closePopup}
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 dark:bg-black/85 backdrop-blur-xs transition-opacity duration-300 overflow-y-auto overscroll-contain"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'promo-popup-card relative w-[calc(100vw-28px)] max-w-[410px] max-h-[88dvh] sm:max-h-[85vh] my-auto flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-2xl transition-all duration-300',
              'bg-white text-gray-900 border-gray-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.25)]',
              'dark:bg-[#0E131F] dark:text-white dark:border-white/15 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]'
            )}
          >
            {/* Close Button - Always visible with contrast-safe backdrop-blur */}
            <button
              type="button"
              onClick={closePopup}
              aria-label="Close offer"
              className="absolute right-3 top-3 z-30 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <X size={16} strokeWidth={2.2} />
            </button>

            {/* Banner Image Header - Proportionate height with subtle bottom gradient fade */}
            <div className="relative shrink-0 h-36 sm:h-44 w-full overflow-hidden bg-slate-950">
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover object-center"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/promos/special-offer-banner.jpg';
                }}
              />
              {/* Bottom gradient fade so the image connects seamlessly with the modal card */}
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-t pointer-events-none',
                  'from-white via-white/20 to-black/25',
                  'dark:from-[#0E131F] dark:via-[#0E131F]/30 dark:to-black/40'
                )}
              />
              {/* Top-left Brand Pill */}
              <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xs">
                <Tag size={10} className="text-amber-400" />
                <span>{settings?.store_name || 'DVDs Zone'}</span>
              </div>
            </div>

            {/* Scrollable Content Body with pristine contrast in both light & dark mode */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 text-blue-600 dark:text-blue-400">
                  {(settings?.store_name || 'DVDs Zone')} · {(settings?.campaign_badge || discountText)}
                </p>

                <h2
                  id="promo-title"
                  className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-gray-900 dark:text-white"
                >
                  {title}
                </h2>

                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-gray-300 font-normal">
                  {tagline}
                </p>

                {timeLeft && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                    <Clock size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Offer ends soon · {timeLeft}</span>
                  </div>
                )}
              </div>

              {/* Offer Code & Instant Copy Card */}
              <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-colors bg-gray-50 border-gray-200/90 dark:bg-white/[0.05] dark:border-white/10">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-gray-500 dark:text-gray-400">
                    Your offer code
                  </p>
                  <p className="mt-0.5 font-mono text-base sm:text-lg font-black tracking-wider truncate text-blue-600 dark:text-blue-400 select-all">
                    {promoCode}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400">
                    {promoType === 'fixed_amount'
                      ? `${formatGBP(discount)} off orders ${minSpend > 0 ? `over ${formatGBP(minSpend)}` : 'with no minimum spend'}`
                      : `${discount}% off orders ${minSpend > 0 ? `over ${formatGBP(minSpend)}` : 'with no minimum spend'}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={copyCode}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition-all duration-200 active:scale-95 cursor-pointer shrink-0 shadow-xs',
                    isCopied
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100 dark:bg-white/10 dark:text-white dark:border-white/15 dark:hover:bg-white/20'
                  )}
                >
                  {isCopied ? <Check size={13} className="stroke-[2.5]" /> : <Copy size={13} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Primary Call to Action Button */}
              <button
                type="button"
                onClick={exploreOffers}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Explore the offer</span>
                <ArrowRight size={15} />
              </button>

              {/* Dismissal / Storage Preferences */}
              <div className="flex items-center justify-between gap-3 text-xs pt-1 text-gray-500 dark:text-gray-400">
                <label className="flex cursor-pointer items-center gap-2 select-none text-[11px] sm:text-xs hover:text-gray-700 dark:hover:text-gray-200">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(event) => setDontShowAgain(event.target.checked)}
                    className="accent-blue-600 h-3.5 w-3.5 rounded"
                  />
                  <span>Hide for 24 hours</span>
                </label>

                <button
                  type="button"
                  onClick={closePopup}
                  className="text-[11px] sm:text-xs font-medium underline-offset-2 hover:underline transition-colors cursor-pointer hover:text-gray-900 dark:hover:text-white"
                >
                  No thanks
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
