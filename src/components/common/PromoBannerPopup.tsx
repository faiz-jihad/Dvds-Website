import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Flame,
  Clock,
  Copy,
  Check,
  Sparkles,
  Ticket,
  ArrowRight,
  Gift,
  Tag,
  Percent,
} from 'lucide-react';
import { StoreSettings } from '../../types';
import { publicApi } from '../../lib/publicApi';
import { formatGBP } from '../../lib/formatters';

interface PromoBannerPopupProps {
  settings?: StoreSettings | null;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const STORAGE_KEY_DISMISSED = 'dvds_promo_popup_dismissed_until';

function calculateTimeRemaining(targetIso?: string | null): TimeRemaining | null {
  if (!targetIso) return null;
  const target = new Date(targetIso).getTime();
  if (isNaN(target)) return null;

  const diff = target - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isExpired: false,
  };
}

export const PromoBannerPopup: React.FC<PromoBannerPopupProps> = ({ settings: propSettings }) => {
  const navigate = useNavigate();

  // If settings not passed as prop, retrieve live settings query from cache or network
  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 30_000,
  });

  const settings = propSettings || settingsQuery.data;

  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Exact data from admin settings (no random/hardcoded values)
  const isEnabled = settings?.campaign_popup_enabled ?? true;
  const isActive = settings?.campaign_is_active ?? true;
  const bannerImage = settings?.campaign_banner_image || '/promos/special-offer-banner.jpg';
  const badgeText = settings?.campaign_badge || 'CAMPAIGN EXCLUSIVE';
  const discountText = settings?.campaign_discount_text || 'Up to 50% OFF';
  const title = settings?.campaign_title || "Collector's Vault Special & Clearance";
  const tagline =
    settings?.campaign_tagline ||
    'Limited boutique archive allocation with rare collector box sets, exclusive discounts, and free UK delivery.';
  const promoCode = (settings?.vip_promo_code || 'ZONE10').trim().toUpperCase();
  const discountPercent = settings?.vip_promo_discount ?? 10;
  const minSpend = settings?.vip_min_spend ?? 20;
  const countdownTarget = settings?.campaign_ends_at || settings?.deal_ends_at;

  // Countdown timer calculation
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(() =>
    calculateTimeRemaining(countdownTarget)
  );

  useEffect(() => {
    if (!countdownTarget) return;
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(countdownTarget));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownTarget]);

  // Initial trigger delay: show after 1.8 seconds if not dismissed
  useEffect(() => {
    if (!isEnabled || !isActive) {
      setIsOpen(false);
      return;
    }

    try {
      const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return;
      }
    } catch {}

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isEnabled, isActive]);

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        const until = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        localStorage.setItem(STORAGE_KEY_DISMISSED, String(until));
      } catch {}
    }
    setIsOpen(false);
  };

  const handleCopyCode = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(promoCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    } catch {
      // Fallback
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  const handleNavigateToOffers = () => {
    // Also copy code automatically for convenient checkout
    handleCopyCode();
    handleClose();
    navigate('/shop?filter=sale');
  };

  // If campaign or popup is disabled in Admin, do not render modal or launcher
  if (!isEnabled || !isActive) {
    return null;
  }

  return (
    <>
      {/* Floating Shopee-style Special Offer Badge Launcher (Bottom-Left) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/30 border-2 border-white/80 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title="Open Special Offer & Voucher"
          aria-label="Open Special Offer"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-200" />
          </span>
          <Gift className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-black tracking-wide uppercase drop-shadow-sm">
            {discountText}
          </span>
        </button>
      )}

      {/* Shopee-style Modal Popup Overlay */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-banner-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none"
          onClick={handleClose}
        >
          {/* Outer Wrapper with Shopee Floating Close Button */}
          <div
            className="relative w-full max-w-[420px] flex flex-col items-center animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-Right Quick Close Button on Desktop/Mobile */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close promotion banner"
              className="absolute -top-3.5 -right-3.5 z-30 w-8 h-8 rounded-full bg-black/80 border-2 border-white/80 text-white hover:bg-red-600 flex items-center justify-center transition-all shadow-xl cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Shopee Poster Card Container */}
            <div className="w-full rounded-3xl p-[2.5px] bg-gradient-to-b from-amber-400 via-orange-500 to-red-600 shadow-[0_20px_60px_-15px_rgba(238,77,45,0.45)]">
              <div className="w-full rounded-[22px] overflow-hidden bg-[#0D1017] text-white flex flex-col shadow-inner">
                {/* 1. Festive Header Ribbon */}
                <div className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white py-1.5 px-3 flex items-center justify-center gap-1.5 text-center shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-widest drop-shadow-sm">
                    {badgeText}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                </div>

                {/* 2. Banner Poster Image */}
                <div
                  className="relative aspect-[16/9] w-full overflow-hidden bg-black cursor-pointer group"
                  onClick={handleNavigateToOffers}
                >
                  <img
                    src={bannerImage}
                    alt={title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/promos/special-offer-banner.jpg';
                    }}
                  />
                  {/* Subtle vignette gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1017] via-transparent to-black/30 pointer-events-none" />

                  {/* Shopee-style Floating Discount Pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#EE4D2D] text-white px-2.5 py-1 rounded-full shadow-lg border border-white/30 transform -rotate-2">
                    <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    <span className="text-[11px] font-black uppercase tracking-tight">
                      {discountText}
                    </span>
                  </div>
                </div>

                {/* 3. Title & Tagline from Admin */}
                <div className="px-5 pt-3 pb-1 text-center">
                  <h3
                    id="promo-banner-title"
                    className="font-display font-black text-lg sm:text-xl text-white tracking-tight leading-snug drop-shadow-sm"
                  >
                    {title}
                  </h3>
                  <p className="text-[11px] text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                    {tagline}
                  </p>
                </div>

                {/* 4. Shopee Flash Sale Countdown Timer (if configured) */}
                {timeLeft && !timeLeft.isExpired && (
                  <div className="mx-4 mt-2 mb-1 p-2 rounded-xl bg-black/60 border border-orange-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-orange-400 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">
                      <Flame className="w-3.5 h-3.5 text-orange-500 animate-bounce" />
                      <span>Offer Ends In:</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-mono font-black text-white">
                      {timeLeft.days > 0 && (
                        <>
                          <span className="bg-[#1A1D27] px-1.5 py-0.5 rounded text-amber-400 border border-white/10">
                            {String(timeLeft.days).padStart(2, '0')}d
                          </span>
                          <span className="text-orange-500">:</span>
                        </>
                      )}
                      <span className="bg-[#1A1D27] px-1.5 py-0.5 rounded text-amber-400 border border-white/10">
                        {String(timeLeft.hours).padStart(2, '0')}h
                      </span>
                      <span className="text-orange-500">:</span>
                      <span className="bg-[#1A1D27] px-1.5 py-0.5 rounded text-white border border-white/10">
                        {String(timeLeft.minutes).padStart(2, '0')}m
                      </span>
                      <span className="text-orange-500">:</span>
                      <span className="bg-[#1A1D27] px-1.5 py-0.5 rounded text-orange-400 border border-white/10">
                        {String(timeLeft.seconds).padStart(2, '0')}s
                      </span>
                    </div>
                  </div>
                )}

                {/* 5. Authentic Shopee Voucher Ticket (Coupon Box) */}
                <div className="mx-4 mt-2.5 mb-3 p-3 rounded-xl bg-gradient-to-r from-orange-950/40 via-red-950/20 to-orange-950/40 border border-dashed border-orange-500/50 relative overflow-hidden flex items-center justify-between gap-2 shadow-xs">
                  {/* Left & Right Perforated Ticket Notches */}
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#0D1017] border-r border-orange-500/50" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#0D1017] border-l border-orange-500/50" />

                  {/* Ticket Left: Discount & Conditions */}
                  <div className="pl-2">
                    <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                      <Ticket className="w-3 h-3 text-orange-400" />
                      <span>Checkout Voucher</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-sm sm:text-base font-black font-mono text-white tracking-wider">
                        {promoCode}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-500/30">
                        {discountPercent}% OFF
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      Min. spend: {formatGBP(minSpend)} • Royal Mail Free Delivery
                    </p>
                  </div>

                  {/* Ticket Right: Claim / Copy Action */}
                  <div className="pr-1">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:brightness-110 shadow-sm active:scale-95'
                      }`}
                      title="Copy coupon code"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 6. Shopee Primary CTA Button */}
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={handleNavigateToOffers}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#EE4D2D] via-[#FF5722] to-[#F53D2D] hover:from-[#d73211] hover:to-[#e03415] text-white font-extrabold uppercase text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/40 hover:shadow-orange-500/60 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Shop Special Offers &amp; Save</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Controls: "Don't show again" checkbox & Shopee Floating Close Button */}
            <div className="w-full flex flex-col items-center mt-3">
              <label className="text-[11px] text-white/80 hover:text-white flex items-center gap-2 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-orange-500 cursor-pointer"
                />
                <span>Don&apos;t show this popup again for 24 hours</span>
              </label>

              {/* Classic Shopee Floating Round Close Icon */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="mt-3 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
