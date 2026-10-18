
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Copy, X } from 'lucide-react';
import { StoreSettings } from '../../types';
import { publicApi } from '../../lib/publicApi';
import { formatGBP } from '../../lib/formatters';

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
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 left-5 z-40 rounded-full border border-white/15 bg-[#101827] px-4 py-3 text-sm text-white shadow-lg transition hover:bg-[#192438]"
          aria-label="View special offer"
        >
          {discountText}
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-title"
          onClick={closePopup}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-[3px]"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-[410px] overflow-hidden rounded-2xl border border-black/5 bg-white text-[#151a23] shadow-2xl"
          >
            <button
              type="button"
              onClick={closePopup}
              aria-label="Close offer"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/70"
            >
              <X size={17} strokeWidth={1.8} />
            </button>

            <div className="aspect-[16/9] overflow-hidden bg-[#101827]">
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src =
                    '/promos/special-offer-banner.jpg';
                }}
              />
            </div>

            <div className="p-6 sm:p-7">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#60718b]">
                {(settings?.store_name || 'DVDs Zone')} · {(settings?.campaign_badge || discountText)}
              </p>

              <h2
                id="promo-title"
                className="text-2xl font-semibold leading-tight tracking-[-0.035em]"
              >
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#69717d]">
                {tagline}
              </p>

              {timeLeft && (
                <p className="mt-4 text-xs text-[#69717d]">
                  Offer ends soon · {timeLeft}
                </p>
              )}

              <div className="mt-5 flex items-center justify-between gap-3 border-y border-[#e8eaf0] py-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#79818c]">
                    Your offer code
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold tracking-wider">
                    {promoCode}
                  </p>
                  <p className="mt-1 text-xs text-[#69717d]">
                    {promoType === 'fixed_amount'
                      ? `${formatGBP(discount)} off orders ${minSpend > 0 ? `over ${formatGBP(minSpend)}` : 'with no minimum spend'}`
                      : `${discount}% off orders ${minSpend > 0 ? `over ${formatGBP(minSpend)}` : 'with no minimum spend'}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center gap-2 rounded-lg border border-[#dfe3ea] px-3 py-2 text-xs font-medium transition hover:bg-[#f5f7fa]"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  {isCopied ? 'Copied' : 'Copy code'}
                </button>
              </div>

              <button
                type="button"
                onClick={exploreOffers}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#15233a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#223652]"
              >
                Explore the offer
                <ArrowRight size={16} strokeWidth={1.8} />
              </button>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#858b95]">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(event) =>
                      setDontShowAgain(event.target.checked)
                    }
                    className="accent-[#15233a]"
                  />
                  Hide for 24 hours
                </label>

                <button
                  type="button"
                  onClick={closePopup}
                  className="transition hover:text-[#252b35]"
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
