import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Package, Disc } from 'lucide-react';
import { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, cn } from '../../lib/formatters';

interface SeriviaMovieGridProps {
  products: Product[];
  loading?: boolean;
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
    <div className="group relative flex flex-col select-none">
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#0d0f14] border border-white/[0.07] group-hover:border-[#f5c518]/50 transition-all duration-300 shadow-xl">
        <Link
          to={`/product/${product.slug}`}
          className="block w-full h-full"
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
            <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#f5c518] text-black shadow">
              New
            </span>
          )}
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-600 text-white shadow">
              Sale
            </span>
          )}
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/15 text-white/90 shadow">
            {formatBadge}
          </span>
        </div>

        {/* Top-Right: Mobile & Desktop Always-Accessible Favourite Button */}
        <button
          onClick={handleFav}
          className={cn(
            'absolute top-2 right-2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 shadow-md',
            favourite
              ? 'bg-[#f5c518] border-[#f5c518] text-black'
              : 'bg-black/60 backdrop-blur-md border-white/20 text-white/75 hover:text-white hover:bg-black/80'
          )}
          aria-label={favourite ? 'Remove from favourites' : 'Save to favourites'}
          title={favourite ? 'Saved in Favourites' : 'Add to Favourites'}
        >
          <Heart size={13} fill={favourite ? 'black' : 'none'} />
        </button>

        {/* Desktop Hover Quick Action Overlay */}
        <div className="hidden md:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col items-center justify-center gap-2 p-3 pointer-events-none group-hover:pointer-events-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="relative z-10 flex flex-col items-center gap-2 w-full">
            <button
              onClick={handleCart}
              disabled={outOfStock}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-lg active:scale-95',
                outOfStock
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-[#f5c518] hover:bg-[#f5c518]/90 text-black shadow-[#f5c518]/25'
              )}
            >
              <ShoppingCart size={13} />
              {outOfStock ? 'Sold Out' : 'Add to Basket'}
            </button>
            <Link
              to={`/product/${product.slug}`}
              className="w-full flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95"
            >
              Details
            </Link>
          </div>
        </div>

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-black/85 backdrop-blur-md rounded-lg py-1 text-[10px] font-bold text-white/60 pointer-events-none">
            <Package size={11} />
            Sold Out
          </div>
        )}

        {/* IMDb Rating Badge (Bottom Right) */}
        {product.imdb_rating && !outOfStock && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur-md rounded-md px-1.5 py-0.5 border border-white/10 pointer-events-none">
            <Star size={9} fill="#f5c518" className="text-[#f5c518]" />
            <span className="text-[10px] font-extrabold text-[#f5c518]">
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
            className="text-xs sm:text-sm font-bold text-white/90 group-hover:text-[#f5c518] transition-colors leading-snug line-clamp-1"
          >
            {product.title}
          </Link>
          <p className="text-[10px] sm:text-[11px] text-white/40 mt-0.5">
            {product.release_year} &bull; {product.genres?.[0]?.name || product.format}
          </p>
        </div>

        {/* Price and Mobile 1-Tap Add to Basket Button */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/[0.05]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-extrabold text-white">
              {formatGBP(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-[10px] text-white/30 line-through">
                {formatGBP(product.compare_at_price)}
              </span>
            )}
          </div>

          {/* Quick-add button visible on mobile (and desktop as extra convenience) */}
          <button
            onClick={handleCart}
            disabled={outOfStock}
            className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 shadow-sm shrink-0',
              outOfStock
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-[#f5c518] hover:bg-[#f5c518]/90 text-black shadow-[#f5c518]/20'
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
  <div className="flex flex-col animate-pulse">
    <div className="aspect-[2/3] rounded-2xl bg-white/[0.05] border border-white/[0.05]" />
    <div className="mt-2.5 space-y-2">
      <div className="h-3.5 rounded bg-white/[0.07] w-3/4" />
      <div className="h-2.5 rounded bg-white/[0.05] w-1/2" />
      <div className="h-4 rounded bg-white/[0.06] w-1/3" />
    </div>
  </div>
);

export const SeriviaMovieGrid: React.FC<SeriviaMovieGridProps> = ({ products, loading }) => {
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
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-white/[0.02] border border-white/[0.06] my-6">
        <Package size={40} className="text-[#f5c518]/40 mb-3" />
        <h3 className="text-white font-bold text-base">No titles found</h3>
        <p className="text-white/40 text-xs mt-1 max-w-sm">
          No items match this filter. Try selecting another category, genre, or browse all editions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {products.map((product) => (
        <MovieCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default SeriviaMovieGrid;
