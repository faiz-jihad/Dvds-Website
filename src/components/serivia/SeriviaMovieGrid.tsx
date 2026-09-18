import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Package, Loader2, CheckCircle2, ArrowUp } from 'lucide-react';
import { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, cn } from '../../lib/formatters';

interface SeriviaMovieGridProps {
  products: Product[];
  loading?: boolean;
  initialBatchSize?: number;
  incrementSize?: number;
}

const MovieCard: React.FC<{ product: Product }> = ({ product }) => {
  const addItem = useCartStore((s) => s.addItem);
  const { openCartDrawer, addToast } = useUiStore();
  const { toggleFavourite, isFavourite } = useFavouritesStore();
  const favourite = isFavourite(product.id);
  const outOfStock = product.stock_quantity === 0;

  const handleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product);
    addToast(`"${product.title}" added to basket`, 'success');
    openCartDrawer();
  };

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavourite(product.id);
    addToast(added ? `"${product.title}" saved to favourites` : `Removed from favourites`, 'info');
  };

  const formatBadge = product.format === 'Box Set' ? 'Box Set' : product.format || 'DVD';

  return (
    <div className="group relative flex flex-col select-none bg-white rounded-2xl border border-gray-200/80 hover:border-gray-300 hover:shadow-xl transition-all duration-300 p-2 sm:p-2.5">
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-gray-100 shadow-xs">
        <Link
          to={`/product/${product.slug}`}
          className="block w-full h-full cursor-pointer"
          aria-label={`View ${product.title}`}
        >
          <img
            src={product.cover_image_url}
            alt={product.title}
            className={cn(
              'w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105',
              outOfStock && 'opacity-40 grayscale'
            )}
            loading="lazy"
          />
        </Link>

        {/* Top Badges (New, Sale, Format) */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-10">
          {product.is_new_release && (
            <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-blue text-white shadow">
              New
            </span>
          )}
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-red text-white shadow">
              Sale
            </span>
          )}
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-white shadow">
            {formatBadge}
          </span>
        </div>

        {/* Top-Right: Mobile & Desktop Always-Accessible Favourite Button */}
        <button
          onClick={handleFav}
          className={cn(
            'absolute top-2 right-2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 shadow-md cursor-pointer',
            favourite
              ? 'bg-brand-red border-brand-red text-white'
              : 'bg-white/90 hover:bg-white text-gray-500 hover:text-brand-red border-gray-200'
          )}
          aria-label={favourite ? 'Remove from favourites' : 'Save to favourites'}
          title={favourite ? 'Saved in Favourites' : 'Add to Favourites'}
        >
          <Heart size={13} fill={favourite ? 'white' : 'none'} />
        </button>

        {/* Desktop Hover Quick Action Overlay */}
        <div className="hidden md:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col items-center justify-center gap-2 p-3 pointer-events-none group-hover:pointer-events-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="relative z-10 flex flex-col items-center gap-2 w-full">
            <button
              onClick={handleCart}
              disabled={outOfStock}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer disabled:cursor-not-allowed',
                outOfStock
                  ? 'bg-white/10 text-white/30'
                  : 'bg-brand-blue hover:bg-brand-blue-hover text-white shadow-brand-blue/30'
              )}
            >
              <ShoppingCart size={13} />
              {outOfStock ? 'Sold Out' : 'Add to Basket'}
            </button>
            <Link
              to={`/product/${product.slug}`}
              className="w-full flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
            >
              Details
            </Link>
          </div>
        </div>

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-black/85 backdrop-blur-md rounded-lg py-1 text-[10px] font-bold text-white/70 pointer-events-none">
            <Package size={11} />
            Sold Out
          </div>
        )}

        {/* IMDb Rating Badge (Bottom Right) */}
        {product.imdb_rating && !outOfStock && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur-xs rounded px-1.5 py-0.5 border border-white/10 pointer-events-none text-white">
            <Star size={9} fill="#fbbf24" className="text-amber-400" />
            <span className="text-[10px] font-black text-white">
              {product.imdb_rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Card Info Below Poster */}
      <div className="mt-2.5 px-0.5 flex flex-col flex-1 justify-between">
        <div>
          <Link
            to={`/product/${product.slug}`}
            className="text-xs sm:text-sm font-bold text-dark hover:text-brand-blue transition-colors leading-snug line-clamp-1 cursor-pointer"
            title={product.title}
          >
            {product.title}
          </Link>
          <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
            {product.release_year} &bull; {product.genres?.[0]?.name || product.format}
          </p>
        </div>

        {/* Price and Mobile 1-Tap Add to Basket Button */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-extrabold text-dark">
              {formatGBP(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-[10px] text-gray-400 line-through">
                {formatGBP(product.compare_at_price)}
              </span>
            )}
          </div>

          {/* Quick-add button */}
          <button
            onClick={handleCart}
            disabled={outOfStock}
            className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed',
              outOfStock
                ? 'bg-gray-100 text-gray-400'
                : 'bg-dark hover:bg-brand-blue text-white'
            )}
            aria-label={`Add ${product.title} to basket`}
            title="Add to Basket"
          >
            <ShoppingCart size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="flex flex-col animate-pulse bg-white p-2.5 rounded-2xl border border-gray-200">
    <div className="aspect-[2/3] rounded-xl bg-gray-100" />
    <div className="mt-2.5 space-y-2">
      <div className="h-3.5 rounded bg-gray-200 w-3/4" />
      <div className="h-2.5 rounded bg-gray-100 w-1/2" />
      <div className="h-4 rounded bg-gray-200 w-1/3" />
    </div>
  </div>
);

export const SeriviaMovieGrid: React.FC<SeriviaMovieGridProps> = ({
  products,
  loading,
  initialBatchSize = 12,
  incrementSize = 12,
}) => {
  const [displayLimit, setDisplayLimit] = useState(initialBatchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset display limit when the product collection or active filter changes
  useEffect(() => {
    setDisplayLimit(initialBatchSize);
    setIsLoadingMore(false);
  }, [products, initialBatchSize]);

  // Infinite scroll trigger: load the next batch when the user scrolls near the sentinel
  useEffect(() => {
    if (displayLimit >= products.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setDisplayLimit((prev) => Math.min(prev + incrementSize, products.length));
            setIsLoadingMore(false);
          }, 250);
        }
      },
      {
        root: null,
        rootMargin: '250px 0px',
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayLimit, products.length, incrementSize, isLoadingMore]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-white border border-gray-200 my-4 shadow-xs">
        <Package size={40} className="text-gray-300 mb-3" />
        <h3 className="text-dark font-bold text-base">No titles found</h3>
        <p className="text-gray-500 text-xs mt-1 max-w-sm">
          No items match this filter. Try selecting another category, genre, or browse all editions.
        </p>
      </div>
    );
  }

  const visibleProducts = products.slice(0, displayLimit);
  const hasMore = displayLimit < products.length;

  return (
    <div className="space-y-6">
      {/* Responsive Cards Grid */}
      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {visibleProducts.map((product) => (
          <MovieCard key={product.id} product={product} />
        ))}
      </div>

      {/* Progressive Scroll Loading Sentinel / Feedback */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="pt-4 pb-8 flex flex-col items-center justify-center gap-2.5"
        >
          {isLoadingMore ? (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white border border-gray-200 shadow-xs text-xs font-semibold text-gray-700 animate-in fade-in duration-200">
              <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
              <span>Loading more titles...</span>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsLoadingMore(true);
                setTimeout(() => {
                  setDisplayLimit((prev) => Math.min(prev + incrementSize, products.length));
                  setIsLoadingMore(false);
                }, 200);
              }}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-dark hover:text-brand-blue transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Load More Titles</span>
              <span className="text-[11px] font-normal text-gray-400">
                ({visibleProducts.length} of {products.length})
              </span>
            </button>
          )}
        </div>
      )}

      {/* End of Catalogue Notice */}
      {!hasMore && products.length > initialBatchSize && (
        <div className="pt-6 pb-4 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>
              Showing all <strong className="text-dark font-semibold">{products.length}</strong> titles in this catalogue
            </span>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1 font-bold text-brand-blue hover:text-brand-blue-hover transition-colors cursor-pointer"
          >
            <span>Back to top</span>
            <ArrowUp size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SeriviaMovieGrid;
