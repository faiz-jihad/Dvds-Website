import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Star,
  Disc,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, formatRuntime, cn } from '../../lib/formatters';

interface AzCinematicHeroProps {
  products: Product[];
}

export const AzCinematicHero: React.FC<AzCinematicHeroProps> = ({ products }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Take top featured or best-selling titles with stock
  const featured = React.useMemo(() => {
    const list = products.filter((p) => p.status === 'active' && p.stock_quantity > 0);
    const highlighted = list.filter((p) => p.is_featured || p.is_best_seller || p.is_new_release);
    return (highlighted.length >= 3 ? highlighted : list).slice(0, 6);
  }, [products]);

  const addItem = useCartStore((s) => s.addItem);
  const { openCartDrawer, addToast } = useUiStore();

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const gotoSlide = useCallback(
    (idx: number) => {
      if (isTransitioning || idx === activeIndex) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIndex(idx);
        setIsTransitioning(false);
      }, 300);
    },
    [isTransitioning, activeIndex]
  );

  const nextSlide = useCallback(() => {
    if (featured.length <= 1) return;
    gotoSlide((activeIndex + 1) % featured.length);
  }, [activeIndex, featured.length, gotoSlide]);

  const prevSlide = useCallback(() => {
    if (featured.length <= 1) return;
    gotoSlide((activeIndex - 1 + featured.length) % featured.length);
  }, [activeIndex, featured.length, gotoSlide]);

  // Automatic slide rotation every 7 seconds (pauses on hover)
  useEffect(() => {
    if (featured.length <= 1 || isPaused) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [featured.length, isPaused, nextSlide]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();
  };

  if (featured.length === 0) return null;

  const current = featured[activeIndex];
  const formatBadge = current.format === 'Box Set' ? 'Collector Box Set' : current.format || 'DVD Edition';

  const handleAddCurrentToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (current.stock_quantity === 0) return;
    addItem(current);
    addToast(`"${current.title}" added to basket`, 'success');
    openCartDrawer();
  };

  return (
    <section
      className="relative w-full min-h-[76vh] sm:min-h-[82vh] lg:min-h-[88vh] flex items-center overflow-hidden select-none bg-[#07090E]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured Physical DVD Premiere Showcase"
    >
      {/* ── 1. Full-bleed Cinematic Backdrop Artwork ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            'absolute inset-0 transition-all duration-700 ease-out',
            isTransitioning ? 'opacity-20 scale-105 blur-sm' : 'opacity-100 scale-100 blur-0'
          )}
        >
          <img
            src={current.cover_image_url}
            alt={current.title}
            className="w-full h-full object-cover object-center lg:object-right-top scale-105"
          />
        </div>

        {/* Multi-layered cinematic gradients to guarantee text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/90 to-transparent sm:w-4/5 lg:w-3/5" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#07090E]/40 to-[#07090E]" />
      </div>

      {/* ── 2. Content Container ── */}
      <div className="relative z-10 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        {/* LEFT COLUMN: Editorial Details & Action */}
        <div
          className={cn(
            'flex-1 max-w-2xl transition-all duration-500',
            isTransitioning ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          )}
        >
          {/* Format & Region Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue text-white text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-blue/20">
              <Disc size={13} className="animate-spin" style={{ animationDuration: '6s' }} />
              {formatBadge}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[11px] sm:text-xs font-semibold">
              <ShieldCheck size={13} className="text-emerald-400" />
              UK Certified Region 2 / PAL
            </span>

            {current.is_new_release && (
              <span className="px-2.5 py-1 rounded-full bg-brand-red text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                New Release
              </span>
            )}
          </div>

          {/* Large Movie Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight mb-3 sm:mb-4 drop-shadow-md">
            {current.title}
          </h1>

          {/* Movie Metadata Strip */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300 font-semibold mb-4 sm:mb-5">
            {current.imdb_rating && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 font-black">
                <Star size={13} fill="#fcd34d" />
                {current.imdb_rating.toFixed(1)} IMDb
              </span>
            )}

            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white font-bold text-xs">
              {current.age_rating || '15'}
            </span>

            <span>{current.release_year}</span>

            {current.runtime_minutes && (
              <>
                <span className="text-gray-500">&bull;</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-gray-400" />
                  {formatRuntime(current.runtime_minutes)}
                </span>
              </>
            )}

            {current.genres?.[0] && (
              <>
                <span className="text-gray-500">&bull;</span>
                <span className="text-brand-blue font-bold">{current.genres[0].name}</span>
              </>
            )}
          </div>

          {/* Short Synopsis */}
          <p className="text-sm sm:text-base text-gray-300 line-clamp-3 mb-6 sm:mb-8 max-w-xl leading-relaxed">
            {current.description ||
              `Experience ${current.title} in definitive physical packaging. Restored transfer with official bonus disc extras, collector art booklet, and original audio soundtrack.`}
          </p>

          {/* CTA Buttons Row */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              to={`/product/${current.slug}`}
              className="flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl bg-white text-dark hover:bg-gray-100 font-black text-xs sm:text-sm tracking-wide transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Play size={16} fill="currentColor" />
              <span>View Details</span>
            </Link>

            <button
              type="button"
              onClick={handleAddCurrentToCart}
              className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg hover:shadow-brand-blue/30 active:scale-95 cursor-pointer border border-brand-blue/40"
            >
              <ShoppingCart size={16} />
              <span>Add to Basket &bull; {formatGBP(current.price)}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Physical DVD Case Stage */}
        <div className="hidden sm:flex flex-col items-center justify-center shrink-0 relative">
          <div
            className={cn(
              'relative transition-all duration-700 ease-out transform',
              isTransitioning
                ? 'opacity-0 scale-95 rotate-y-12'
                : 'opacity-100 scale-100 rotate-y-0'
            )}
            style={{ perspective: 1000 }}
          >
            {/* 3D Physical DVD Case Container */}
            <div className="relative w-[190px] sm:w-[220px] lg:w-[250px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-2 border-white/20 group">
              <img
                src={current.cover_image_url}
                alt={current.title}
                className="w-full h-full object-cover"
              />

              {/* Spine edge gloss & highlight */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-white/30 via-white/10 to-transparent pointer-events-none" />

              {/* Diagonal plastic cover reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />

              {/* Physical DVD banner badge */}
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-between text-[11px] font-bold text-white">
                <span className="truncate">{current.format || 'DVD'}</span>
                <span className="text-emerald-400 font-mono">{formatGBP(current.price)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Slider Navigation Controls ── */}
      {featured.length > 1 && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:right-8 z-20 flex items-center justify-between pointer-events-none">
          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-2 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {featured.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => gotoSlide(idx)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300 cursor-pointer',
                  idx === activeIndex
                    ? 'w-7 bg-brand-blue'
                    : 'w-2 bg-white/30 hover:bg-white/70'
                )}
                aria-label={`Switch to movie ${idx + 1}: ${item.title}`}
              />
            ))}
          </div>

          {/* Left & Right Chevrons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={prevSlide}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-90"
              aria-label="Previous movie"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-90"
              aria-label="Next movie"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
export default AzCinematicHero;
