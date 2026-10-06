import React, { useEffect, useState } from 'react';
import { Sparkles, Clock, Flame, ShieldCheck, Truck, ArrowRight, Tag, Star, Percent } from 'lucide-react';
import { StoreSettings, Product } from '../../types';
import { formatGBP } from '../../lib/formatters';

interface ExclusiveCampaignBannerProps {
  settings?: StoreSettings | null;
  dealProduct?: Product | null;
  saleCount?: number;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

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

export const ExclusiveCampaignBanner: React.FC<ExclusiveCampaignBannerProps> = ({
  settings,
  dealProduct,
  saleCount = 0,
}) => {
  const endsAt = settings?.campaign_ends_at || settings?.deal_ends_at;
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(() => calculateTimeRemaining(endsAt));

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const title = settings?.campaign_title || "Collector's Vault Special & Clearance";
  const badge = settings?.campaign_badge || 'CAMPAIGN EXCLUSIVE';
  const tagline =
    settings?.campaign_tagline ||
    'Limited boutique physical archive allocation with rare editions, special discounts, and same-day UK dispatch.';
  const discountText = settings?.campaign_discount_text || 'Up to 50% OFF';

  return (
    <section
      aria-label="Exclusive Campaign"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B0F19] via-[#0E1526] to-[#141C33] text-white p-6 sm:p-8 border border-amber-500/30 shadow-xl mb-8 group"
    >
      {/* Ambient background glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Subtle Grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
        aria-hidden="true"
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
        {/* Left Column: Campaign Identity & Value Props */}
        <div className="space-y-3">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
              <Flame size={12} className="text-amber-400 fill-amber-400 animate-pulse" />
              <span>{badge}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-red text-white shadow-xs">
              <Percent size={11} />
              <span>{discountText}</span>
            </span>

            {saleCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-gray-300 border border-white/10">
                <Tag size={10} className="text-amber-300" />
                <span>{saleCount} Curated Deals Available</span>
              </span>
            )}
          </div>

          {/* Headline */}
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug">
            {title}
          </h2>

          {/* Tagline */}
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
            {tagline}
          </p>

          {/* Perks Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-gray-300">
            <span className="inline-flex items-center gap-1.5">
              <Truck size={13} className="text-emerald-400" />
              <span>Free Royal Mail Tracked 48 UK Delivery</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-blue-400" />
              <span>Brand New &amp; Sealed Media Guarantee</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" />
              <span>Same-Day Dispatch Before 2PM</span>
            </span>
          </div>
        </div>

        {/* Right Column: Live Countdown Box or Deal of the Day Card */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-center lg:items-end gap-3 shrink-0">
          {/* Live Countdown Timer if endsAt is specified */}
          {timeLeft && !timeLeft.isExpired ? (
            <div className="w-full sm:w-auto p-3.5 bg-black/40 backdrop-blur-md rounded-xl border border-amber-500/30 text-center shadow-lg">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-2">
                <Clock size={12} className="animate-spin text-amber-400" style={{ animationDuration: '6s' }} />
                <span>Campaign Event Ends In</span>
              </div>
              <div className="flex items-center justify-center gap-2 font-mono">
                <div className="flex flex-col items-center bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg min-w-[48px]">
                  <span className="text-lg sm:text-xl font-black text-amber-400 leading-none">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-0.5">Days</span>
                </div>
                <span className="text-amber-400/60 font-black text-sm">:</span>
                <div className="flex flex-col items-center bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg min-w-[48px]">
                  <span className="text-lg sm:text-xl font-black text-white leading-none">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-0.5">Hours</span>
                </div>
                <span className="text-amber-400/60 font-black text-sm">:</span>
                <div className="flex flex-col items-center bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg min-w-[48px]">
                  <span className="text-lg sm:text-xl font-black text-white leading-none">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-0.5">Mins</span>
                </div>
                <span className="text-amber-400/60 font-black text-sm">:</span>
                <div className="flex flex-col items-center bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg min-w-[48px]">
                  <span className="text-lg sm:text-xl font-black text-amber-400 leading-none">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-0.5">Secs</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full sm:w-auto px-4 py-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1.5">
                <Sparkles size={12} />
                <span>Special Clearance Allocation</span>
              </span>
              <p className="text-xs text-gray-300 font-semibold mt-0.5">While Limited Vault Stock Lasts</p>
            </div>
          )}

          {/* Spotlight Deal product preview if active */}
          {dealProduct && settings?.deal_is_active && (
            <div className="w-full sm:w-auto flex items-center gap-3 p-2.5 bg-white/5 rounded-xl border border-amber-500/20 text-xs">
              <img
                src={dealProduct.cover_image_url}
                alt={dealProduct.title}
                className="w-10 h-14 object-cover rounded bg-dark border border-white/10 shrink-0"
              />
              <div className="min-w-0 pr-2">
                <span className="text-[9px] font-bold uppercase text-amber-400 block tracking-wider">
                  Featured Deal Spotlight
                </span>
                <p className="font-bold text-white text-xs truncate max-w-[160px]">{dealProduct.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-extrabold text-amber-400 text-sm">
                    {formatGBP(settings.deal_discount_price || dealProduct.price)}
                  </span>
                  {dealProduct.compare_at_price && (
                    <span className="text-[10px] text-gray-400 line-through">
                      {formatGBP(dealProduct.compare_at_price)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
