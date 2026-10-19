
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
      {/* Floating Offer Pill: safe-area aware on mobile, responds to light/dark themes */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed z-40 flex items-center gap-2 rounded-full px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold shadow-xl border backdrop-blur-md transition-all duration-300 active:scale-95 hover:scale-[1.03] cursor-pointer',
            'bottom-[max(1rem,env(safe-area-inset-bottom))] left-3.5 sm:left-6',
            isDark
              ? 'bg-[#111622]/95 text-white border-white/15 hover:bg-[#182030] shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
              : 'bg-white/95 text-gray-900 border-gray-200/90 hover:bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]'
          )}
          aria-label="View special offer"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-500 shrink-0">
            <Tag size={12} className="text-amber-500" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-300 overflow-y-auto overscroll-contain"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'relative w-full max-w-[420px] max-h-[92dvh] sm:max-h-[88vh] my-auto flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-2xl transition-all duration-300',
              isDark
                ? 'bg-[#111622] text-white border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]'
                : 'bg-white text-gray-900 border-gray-200/90 shadow-2xl'
            )}
          >
            {/* Close Button - Contrast safe with backdrop-blur */}
            <button
              type="button"
              onClick={closePopup}
              aria-label="Close offer"
              className="absolute right-3 top-3 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <X size={16} strokeWidth={2} />
            </button>

            {/* Banner Image Header - Responsive height so it never cuts off mobile CTA */}
            <div className="relative shrink-0 h-32 sm:h-44 w-full overflow-hidden bg-slate-950">
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover object-center"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/promos/special-offer-banner.jpg';
                }}
              />
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-t pointer-events-none',
                  isDark
                    ? 'from-[#111622] via-[#111622]/40 to-transparent'
                    : 'from-white via-white/30 to-transparent'
                )}
              />
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              <div>
                <p className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5',
                  isDark ? 'text-blue-400' : 'text-brand-blue'
                )}>
                  {(settings?.store_name || 'DVDs Zone')} · {(settings?.campaign_badge || discountText)}
                </p>

                <h2
                  id="promo-title"
                  className={cn(
                    'text-xl sm:text-2xl font-black leading-tight tracking-tight',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}
                >
                  {title}
                </h2>

                <p className={cn(
                  'mt-1.5 text-xs sm:text-sm leading-relaxed',
                  isDark ? 'text-gray-300' : 'text-gray-600'
                )}>
                  {tagline}
                </p>

                {timeLeft && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    <Clock size={12} className="shrink-0" />
                    <span>Offer ends soon · {timeLeft}</span>
                  </div>
                )}
              </div>

              {/* Offer Code & Instant Copy Card */}
              <div className={cn(
                'flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-colors',
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-gray-50 border-gray-200/80'
              )}>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-[10px] uppercase font-bold tracking-[0.15em]',
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    Your offer code
                  </p>
                  <p className={cn(
                    'mt-0.5 font-mono text-base sm:text-lg font-black tracking-wider truncate',
                    isDark ? 'text-blue-400' : 'text-brand-blue'
                  )}>
                    {promoCode}
                  </p>
                  <p className={cn(
                    'mt-0.5 text-[11px]',
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  )}>
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
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isDark
                        ? 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white px-4 py-3 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Explore the offer</span>
                <ArrowRight size={15} />
              </button>

              {/* Dismissal / Storage Preferences */}
              <div className={cn(
                'flex items-center justify-between gap-3 text-xs pt-1',
                isDark ? 'text-gray-400' : 'text-gray-500'
              )}>
                <label className="flex cursor-pointer items-center gap-2 select-none text-[11px] sm:text-xs">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(event) => setDontShowAgain(event.target.checked)}
                    className="accent-brand-blue h-3.5 w-3.5 rounded"
                  />
                  <span>Hide for 24 hours</span>
                </label>

                <button
                  type="button"
                  onClick={closePopup}
                  className={cn(
                    'text-[11px] sm:text-xs font-medium underline-offset-2 hover:underline transition-colors cursor-pointer',
                    isDark ? 'hover:text-white' : 'hover:text-gray-900'
                  )}
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
