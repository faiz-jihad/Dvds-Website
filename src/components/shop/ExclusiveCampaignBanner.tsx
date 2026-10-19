import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag,
  Percent,
  Truck,
  ShieldCheck,
  Clock,
  ShoppingBag,
  Check,
  ArrowRight,
  Sparkles,
  Layers,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { StoreSettings, Product } from '../../types';
import { formatGBP, cn } from '../../lib/formatters';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { BbfcBadge } from '../common/BbfcBadge';

interface ExclusiveCampaignBannerProps {
  settings?: StoreSettings | null;
  dealProduct?: Product | null;
  saleCount?: number;
  onSelectPriceCap?: (price: number | null) => void;
  onSelectFormat?: (format: string) => void;
  selectedPriceCap?: number | null;
  selectedFormat?: string;
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
  onSelectPriceCap,
  onSelectFormat,
  selectedPriceCap,
  selectedFormat = 'all',
}) => {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const endsAt = settings?.campaign_ends_at || settings?.deal_ends_at;
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(() => calculateTimeRemaining(endsAt));
  const [isAdded, setIsAdded] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const openCartDrawer = useUiStore((state) => state.openCartDrawer);
  const addToast = useUiStore((state) => state.addToast);

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const title = settings?.campaign_title || "Collector's Archive Special Offers";
  const badge = settings?.campaign_badge || 'ARCHIVE PROMOTIONS';
  const tagline =
    settings?.campaign_tagline ||
    'Curated physical media price drops, box set markdowns, and rare warehouse allocations. Brand new, factory sealed, with 100% free Royal Mail UK delivery.';
  const discountText = settings?.campaign_discount_text || 'Up to 50% OFF';

  // Deal of the Day calculations
  const dealPrice = settings?.deal_discount_price && settings.deal_discount_price > 0
    ? settings.deal_discount_price
    : dealProduct?.price ?? 0;
  const dealOriginalPrice = dealProduct?.compare_at_price || dealProduct?.price || 0;
  const dealSavings = dealOriginalPrice > dealPrice ? dealOriginalPrice - dealPrice : 0;
  const dealSavingsPercent = dealOriginalPrice > 0 && dealSavings > 0
    ? Math.round((dealSavings / dealOriginalPrice) * 100)
    : null;

  const handleAddDealToBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!dealProduct) return;
    addItem({ ...dealProduct, price: dealPrice }, 1);
    setIsAdded(true);
    addToast(`Added "${dealProduct.title}" to basket at spotlight price ${formatGBP(dealPrice)}`, 'success');
    openCartDrawer();
    setTimeout(() => setIsAdded(false), 2000);
  };

  const isDealActive = Boolean(
    dealProduct &&
    settings?.deal_is_active &&
    (!settings?.deal_ends_at || Date.parse(settings.deal_ends_at) > Date.now()) &&
    Number(settings?.deal_discount_price || 0) > 0
  );

  return (
    <section
      aria-label="Exclusive Campaign"
      className={cn(
        'relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-7 border mb-8 group transition-all',
        isDark
          ? 'bg-[#0C101A] text-white border-white/10 shadow-2xl'
          : 'bg-gradient-to-br from-[#0E131F] via-[#0C101A] to-[#080B12] text-white border-gray-300/40 shadow-xl'
      )}
    >
      {/* Visual Campaign Banner Backdrop (Object Storage Promo Image) */}
      {(settings?.campaign_banner_image || '/promos/special-offer-banner.jpg') && (
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
          <img
            src={settings?.campaign_banner_image || '/promos/special-offer-banner.jpg'}
            alt="Promotional Campaign Banner"
            className="w-full h-full object-cover object-center opacity-25 scale-105 group-hover:scale-100 transition-transform duration-700 blur-[0.5px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C101A] via-[#0C101A]/90 to-[#0C101A]/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C101A] via-transparent to-[#0C101A]/60" />
        </div>
      )}

      {/* Subtle top amber hairline accent */}
      <div className="relative z-10 absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      {/* Top Bar: Badges & Live Status */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Campaign Eyebrow Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Tag size={11} className="text-amber-400" />
            <span>{badge}</span>
          </span>

          {/* Discount Text Pill */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-extrabold uppercase tracking-wider bg-brand-red text-white shadow-xs">
            <Percent size={11} />
            <span>{discountText}</span>
          </span>

          {/* Active Deals Count */}
          {saleCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-medium bg-white/5 text-gray-300 border border-white/10">
              <span className="font-bold text-white">{saleCount}</span> Curated Deals Available
            </span>
          )}
        </div>

        {/* Live Event Timer or Delivery Guarantee Pill */}
        {timeLeft && !timeLeft.isExpired ? (
          <div className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-400 mr-1 hidden sm:inline">
              Offer Window:
            </span>
            <div className="flex items-center gap-1 text-white font-bold">
              <span className="text-amber-400">{String(timeLeft.days).padStart(2, '0')}d</span>
              <span className="text-gray-500">:</span>
              <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
              <span className="text-gray-500">:</span>
              <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
              <span className="text-gray-500">:</span>
              <span className="text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}s</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 px-2.5 py-1 rounded-sm border border-white/10">
            <Truck size={13} className="text-emerald-400" />
            <span className="text-[11px] font-medium">Free Royal Mail Tracked 48 UK Delivery</span>
          </div>
        )}
      </div>

      {/* Main Content: Campaign Narrative + Spotlight Deal Showcase */}
      <div className="relative z-10 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Editorial Headline, Narrative & Quick Filter Shortcuts */}
        <div className={cn(isDealActive ? 'lg:col-span-7' : 'lg:col-span-12', 'space-y-4')}>
          <div>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-1.5 sm:mt-2 leading-relaxed max-w-2xl font-normal">
              {tagline}
            </p>
          </div>

          {/* Quick Filter Shortcuts for Sale Shoppers */}
          {onSelectPriceCap && (
            <div className="pt-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-2">
                Quick Deal Filters:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectPriceCap(null)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border',
                    selectedPriceCap === null
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  )}
                >
                  All Sale Titles
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPriceCap(10)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border',
                    selectedPriceCap === 10
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  )}
                >
                  Under £10
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPriceCap(15)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border',
                    selectedPriceCap === 15
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  )}
                >
                  Under £15
                </button>
                {onSelectFormat && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectFormat(selectedFormat === 'Box Set' ? 'all' : 'Box Set')}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border',
                        selectedFormat === 'Box Set'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      )}
                    >
                      Box Sets
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectFormat(selectedFormat === 'Blu-ray' ? 'all' : 'Blu-ray')}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border',
                        selectedFormat === 'Blu-ray'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      )}
                    >
                      Blu-ray &amp; 4K
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Trust Guarantee Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-gray-300 border-t border-white/5">
            <span className="inline-flex items-center gap-1.5">
              <Truck size={13} className="text-emerald-400 shrink-0" />
              <span>Royal Mail Tracked 48 • 100% Free UK Delivery</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-blue-400 shrink-0" />
              <span>Brand New &amp; Factory Sealed Guarantee</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400 shrink-0" />
              <span>Same-Day Dispatch Before 2PM GMT</span>
            </span>
          </div>
        </div>

        {/* Right Column: Spotlight Deal of the Day (Collector Showcase) */}
        {isDealActive && dealProduct && (
          <div className="lg:col-span-5 w-full">
            <div className="bg-white/[0.04] backdrop-blur-xs rounded-xl p-3.5 sm:p-4 border border-amber-500/30 hover:border-amber-500/50 transition shadow-lg">
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" />
                  <span>Spotlight Deal of the Day</span>
                </span>
                {dealSavingsPercent && dealSavingsPercent > 0 && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-brand-red text-white px-2 py-0.5 rounded-sm">
                    Save {dealSavingsPercent}%
                  </span>
                )}
              </div>

              {/* Product Artwork + Details Layout */}
              <div className="flex items-start gap-3.5">
                <Link
                  to={`/product/${dealProduct.slug}`}
                  className="block shrink-0 w-20 sm:w-24 aspect-[2/3] rounded overflow-hidden bg-black/40 border border-white/15 relative group/img shadow-md"
                >
                  <img
                    src={dealProduct.cover_image_url}
                    alt={dealProduct.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                  />
                  {dealProduct.spine_number && (
                    <div className="absolute top-1 left-1 bg-black/90 text-white font-mono text-[8px] font-bold px-1 rounded-2xs border border-white/20">
                      #{dealProduct.spine_number}
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch">
                  <div>
                    {/* Format + Rating badges */}
                    <div className="flex items-center gap-1.5 mb-1">
                      {dealProduct.age_rating && dealProduct.age_rating !== 'All' && (
                        <BbfcBadge rating={dealProduct.age_rating} size="xs" />
                      )}
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-gray-200 px-1.5 py-0.5 rounded-2xs">
                        {dealProduct.format || 'DVD'}
                      </span>
                    </div>

                    {/* Title */}
                    <Link
                      to={`/product/${dealProduct.slug}`}
                      className="font-display font-bold text-sm text-white hover:text-amber-300 transition-colors line-clamp-2 leading-snug"
                    >
                      {dealProduct.title}
                    </Link>

                    {dealProduct.director && (
                      <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                        Dir. {dealProduct.director}
                      </span>
                    )}
                  </div>

                  {/* Pricing + Add to Basket Action */}
                  <div className="pt-2">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-lg sm:text-xl font-extrabold text-brand-red dark:text-red-400 font-mono">
                        {formatGBP(dealPrice)}
                      </span>
                      {dealOriginalPrice > dealPrice && (
                        <span className="text-xs text-gray-400 line-through font-mono">
                          {formatGBP(dealOriginalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddDealToBasket}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition shadow-xs cursor-pointer',
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-brand-blue hover:bg-brand-blue-hover text-white'
                        )}
                      >
                        {isAdded ? (
                          <>
                            <Check size={13} className="stroke-[2.5]" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={13} />
                            <span>Add to Basket</span>
                          </>
                        )}
                      </button>

                      <Link
                        to={`/product/${dealProduct.slug}`}
                        className="py-1.5 px-2.5 rounded-md text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition inline-flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
