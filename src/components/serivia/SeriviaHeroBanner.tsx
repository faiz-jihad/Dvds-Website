import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Star,
  Disc,
} from 'lucide-react';
import { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, formatRuntime, cn } from '../../lib/formatters';

interface SeriviaHeroBannerProps {
  products: Product[];
}

export const SeriviaHeroBanner: React.FC<SeriviaHeroBannerProps> = ({ products }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const featured = products.slice(0, 6);
  const addItem = useCartStore((s) => s.addItem);
  const { openCartDrawer, addToast } = useUiStore();
  const { toggleFavourite, isFavourite } = useFavouritesStore();

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const goto = useCallback(
    (index: number) => {
      if (animating || index === activeIndex) return;
      setAnimating(true);
      setTimeout(() => {
        setActiveIndex(index);
        setAnimating(false);
      }, 250);
    },
    [animating, activeIndex]
  );

  const prev = useCallback(() => {
    goto((activeIndex - 1 + featured.length) % featured.length);
  }, [activeIndex, featured.length, goto]);

  const next = useCallback(() => {
    goto((activeIndex + 1) % featured.length);
  }, [activeIndex, featured.length, goto]);

  // Auto-advance every 6s unless user interacts
  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setTimeout(next, 6500);
    return () => clearTimeout(timer);
  }, [activeIndex, featured.length, next]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      next(); // Swiped left -> next
    } else if (distance < -45) {
      prev(); // Swiped right -> prev
    }
  };

  if (!featured.length) return null;

  const product = featured[activeIndex];
  const nextProduct = featured[(activeIndex + 1) % featured.length];
  const favourite = isFavourite(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stock_quantity === 0) return;
    addItem(product);
    addToast(`"${product.title}" added to basket`, 'success');
    openCartDrawer();
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    const added = toggleFavourite(product.id);
    addToast(added ? 'Added to favourites' : 'Removed from favourites', 'info');
  };

  const formatBadge = product.format === 'Box Set' ? 'Box Set' : product.format || 'DVD';

  return (
    <section
      className="relative flex gap-4 h-[360px] sm:h-[400px] lg:h-[440px] select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured titles showcase"
    >
      {/* Main Hero Showcase Card */}
      <div className="relative flex-1 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0d0f14] border border-white/[0.08] shadow-2xl group">
        {/* Background Poster / Backdrop Image */}
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-300',
            animating ? 'opacity-30 scale-98' : 'opacity-100 scale-100'
          )}
        >
          <img
            src={product.cover_image_url}
            alt={product.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          {/* Multi-layered cinematic gradient shadows */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090e] via-[#09090e]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090e]/80 via-[#09090e]/30 to-transparent" />
        </div>

        {/* Top Badges (Protected from colliding with dots on mobile) */}
        <div className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 flex flex-wrap items-center gap-1.5 z-10 max-w-[65%] sm:max-w-[75%]">
          {/* Format Badge */}
          <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#f5c518] text-black shadow-md flex items-center gap-1">
            <Disc size={11} />
            {formatBadge}
          </span>

          {/* Release Year */}
          <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/90">
            {product.release_year}
          </span>

          {/* First Genre (if available) */}
          {product.genres?.[0]?.name && (
            <span className="hidden min-[420px]:inline-block text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/80">
              {product.genres[0].name}
            </span>
          )}

          {/* Runtime (desktop) */}
          {product.runtime_minutes && (
            <span className="hidden sm:inline-block text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/70">
              {formatRuntime(product.runtime_minutes)}
            </span>
          )}
        </div>

        {/* Slide Pagination Dots (Top Right) */}
        {featured.length > 1 && (
          <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 flex items-center gap-1.5 z-20 bg-black/40 backdrop-blur-md border border-white/10 px-2 py-1.5 rounded-full">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => goto(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === activeIndex ? 'bg-[#f5c518] w-5' : 'bg-white/30 hover:bg-white/70 w-1.5'
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Bottom Details & Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-7 z-10 flex flex-col justify-end">
          {/* Movie Title */}
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-2 drop-shadow-md line-clamp-2 max-w-2xl tracking-tight">
            {product.title}
          </h2>

          {/* Meta Info: Rating, Price, Stock status */}
          <div className="flex items-center gap-2.5 sm:gap-3 mb-3.5 sm:mb-4">
            {product.imdb_rating && (
              <span className="flex items-center gap-1 text-[#f5c518] text-xs sm:text-sm font-bold bg-[#f5c518]/15 px-2 py-0.5 rounded-md border border-[#f5c518]/30">
                <Star size={12} fill="#f5c518" />
                {product.imdb_rating.toFixed(1)} IMDb
              </span>
            )}
            <span className="text-white/60 text-xs sm:text-sm font-medium">
              {product.age_rating || 'All Ages'}
            </span>
            <span className="text-white/30">&bull;</span>
            <span className="text-base sm:text-xl font-extrabold text-white tracking-tight">
              {formatGBP(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs sm:text-sm text-white/40 line-through">
                {formatGBP(product.compare_at_price)}
              </span>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 sm:gap-3 max-w-md">
            {/* Quick View Button */}
            <Link
              to={`/product/${product.slug}`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 active:scale-95 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-lg"
            >
              <Play size={14} fill="black" />
              <span>Quick View</span>
            </Link>

            {/* Add to Basket Button */}
            <button
              onClick={handleAddToCart}
              disabled={product.stock_quantity === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#f5c518] hover:bg-[#f5c518]/90 disabled:opacity-40 text-black active:scale-95 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-lg shadow-[#f5c518]/20"
            >
              <ShoppingCart size={14} />
              <span>{product.stock_quantity === 0 ? 'Sold Out' : 'Add to Basket'}</span>
            </button>

            {/* Wishlist / Favourite Toggle */}
            <button
              onClick={handleToggleFav}
              className={cn(
                'w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-90 shrink-0',
                favourite
                  ? 'bg-[#f5c518]/20 border-[#f5c518]/50 text-[#f5c518]'
                  : 'bg-black/50 border-white/15 text-white/70 hover:text-white hover:bg-black/70'
              )}
              aria-label={favourite ? 'Remove from favourites' : 'Save to favourites'}
              title={favourite ? 'Saved in Favourites' : 'Add to Favourites'}
            >
              <Heart size={16} fill={favourite ? '#f5c518' : 'none'} />
            </button>
          </div>
        </div>

        {/* Desktop Prev / Next Chevrons */}
        {featured.length > 1 && (
          <>
            <button
              onClick={prev}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur border border-white/15 items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 shadow-xl"
              aria-label="Previous featured movie"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur border border-white/15 items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 shadow-xl"
              aria-label="Next featured movie"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Next Title Peek Thumbnail Card (Desktop Large) */}
      {featured.length > 1 && (
        <button
          onClick={next}
          className="hidden lg:flex flex-col w-[150px] shrink-0 rounded-3xl overflow-hidden bg-[#0d0f14] border border-white/[0.08] hover:border-[#f5c518]/40 transition-all group relative text-left"
          aria-label="Next title thumbnail"
        >
          <img
            src={nextProduct.cover_image_url}
            alt={nextProduct.title}
            className="w-full flex-1 object-cover scale-100 group-hover:scale-108 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090e] via-transparent to-transparent" />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold text-[#f5c518] uppercase">
            Up Next
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-[#0d0f14]/90 backdrop-blur-sm border-t border-white/[0.06]">
            <p className="text-white font-semibold text-xs leading-tight line-clamp-2 group-hover:text-[#f5c518] transition-colors">
              {nextProduct.title}
            </p>
            <p className="text-white/40 text-[10px] mt-0.5">
              {nextProduct.release_year} &bull; {formatGBP(nextProduct.price)}
            </p>
          </div>
        </button>
      )}
    </section>
  );
};

export default SeriviaHeroBanner;
