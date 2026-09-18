import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Star,
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
  const featured = products.slice(0, 5);
  const addItem = useCartStore((s) => s.addItem);
  const { openCartDrawer, addToast } = useUiStore();
  const { toggleFavourite, isFavourite } = useFavouritesStore();

  const goto = useCallback(
    (index: number) => {
      if (animating || index === activeIndex) return;
      setAnimating(true);
      setTimeout(() => {
        setActiveIndex(index);
        setAnimating(false);
      }, 300);
    },
    [animating, activeIndex]
  );

  const prev = () => goto((activeIndex - 1 + featured.length) % featured.length);
  const next = () => goto((activeIndex + 1) % featured.length);

  // Auto-advance every 6s
  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setTimeout(next, 6000);
    return () => clearTimeout(timer);
  }, [activeIndex, featured.length]);

  if (!featured.length) return null;

  const product = featured[activeIndex];
  const nextProduct = featured[(activeIndex + 1) % featured.length];
  const favourite = isFavourite(product.id);

  const handleAddToCart = () => {
    addItem(product);
    addToast(`"${product.title}" added to basket`, 'success');
    openCartDrawer();
  };

  const handleToggleFav = () => {
    const added = toggleFavourite(product.id);
    addToast(added ? 'Added to favourites' : 'Removed from favourites', 'info');
  };

  const formatBadges = () => {
    const badges: string[] = [];
    if (product.runtime_minutes) badges.push(formatRuntime(product.runtime_minutes));
    if (product.genres?.[0]?.name) badges.push(product.genres[0].name);
    badges.push(product.format === 'Box Set' ? 'Box Set' : 'DVD-9');
    badges.push(String(product.release_year));
    if (product.age_rating) badges.push(product.age_rating);
    return badges;
  };

  return (
    <div className="relative flex gap-4 h-[340px] sm:h-[380px] lg:h-[420px] select-none">
      {/* Main Hero Card */}
      <div className="relative flex-1 rounded-2xl overflow-hidden bg-[#0d0f14] shadow-2xl group">
        {/* Background Poster */}
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            animating ? 'opacity-0' : 'opacity-100'
          )}
        >
          <img
            src={product.cover_image_url}
            alt={product.title}
            className="w-full h-full object-cover scale-[1.02] group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </div>

        {/* Top badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 z-10">
          {formatBadges().map((badge, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Bottom overlay content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Title */}
          <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight mb-1 drop-shadow-lg line-clamp-2">
            {product.title}
          </h2>

          {/* Rating + Price row */}
          <div className="flex items-center gap-3 mb-3">
            {product.imdb_rating && (
              <span className="flex items-center gap-1 text-[#f5c518] text-sm font-semibold">
                <Star size={13} fill="#f5c518" />
                {product.imdb_rating.toFixed(1)}
              </span>
            )}
            <span className="text-white/50 text-xs">{product.release_year}</span>
            <span className="text-white font-bold">{formatGBP(product.price)}</span>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2">
            <Link
              to={`/product/${product.slug}`}
              className="flex items-center gap-2 bg-white text-black hover:bg-white/90 active:scale-[0.98] rounded-lg px-4 py-2.5 text-sm font-bold transition-all shadow-lg"
            >
              <Play size={14} fill="black" />
              Quick View
              <span className="hidden sm:inline text-white/40 font-normal text-xs ml-1">
                {product.runtime_minutes ? formatRuntime(product.runtime_minutes) : ''}
              </span>
            </Link>
            <button
              onClick={handleAddToCart}
              disabled={product.stock_quantity === 0}
              className="flex items-center gap-2 bg-[#f5c518] hover:bg-[#f5c518]/90 disabled:opacity-40 text-black active:scale-[0.98] rounded-lg px-4 py-2.5 text-sm font-bold transition-all shadow-lg"
            >
              <ShoppingCart size={14} />
              <span className="hidden sm:inline">
                {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Basket'}
              </span>
              <span className="sm:hidden">Basket</span>
            </button>
            <button
              onClick={handleToggleFav}
              className={cn(
                'w-10 h-10 rounded-lg border flex items-center justify-center transition-all',
                favourite
                  ? 'bg-[#f5c518]/15 border-[#f5c518]/40 text-[#f5c518]'
                  : 'bg-white/10 border-white/15 text-white/60 hover:text-white hover:bg-white/15'
              )}
              aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Heart size={16} fill={favourite ? '#f5c518' : 'none'} />
            </button>
          </div>
        </div>

        {/* Prev / Next arrow buttons */}
        {featured.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dots */}
        {featured.length > 1 && (
          <div className="absolute top-4 right-4 flex gap-1.5 z-20">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => goto(i)}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-300',
                  i === activeIndex ? 'bg-white w-4' : 'bg-white/30 hover:bg-white/60'
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Next Peek Card — visible on large screens */}
      {featured.length > 1 && (
        <button
          onClick={next}
          className="hidden lg:flex flex-col w-[140px] shrink-0 rounded-2xl overflow-hidden bg-[#0d0f14] border border-white/[0.07] hover:border-white/20 transition-all group relative"
          aria-label="Next title"
        >
          <img
            src={nextProduct.cover_image_url}
            alt={nextProduct.title}
            className="w-full flex-1 object-cover scale-105 group-hover:scale-110 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
            <p className="text-white/80 text-[11px] font-semibold leading-tight line-clamp-2">
              {nextProduct.title}
            </p>
            <p className="text-white/35 text-[10px] mt-0.5">{nextProduct.release_year}</p>
          </div>
        </button>
      )}
    </div>
  );
};

export default SeriviaHeroBanner;
