import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Package } from 'lucide-react';
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

  const handleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stock_quantity === 0) return;
    addItem(product);
    addToast(`"${product.title}" added to basket`, 'success');
    openCartDrawer();
  };

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    const added = toggleFavourite(product.id);
    addToast(added ? 'Added to favourites' : 'Removed from favourites', 'info');
  };

  const outOfStock = product.stock_quantity === 0;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group relative flex flex-col"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0d0f14] border border-white/[0.06] group-hover:border-white/20 transition-all duration-300 shadow-lg">
        <img
          src={product.cover_image_url}
          alt={product.title}
          className={cn(
            'w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105',
            outOfStock && 'opacity-50 grayscale'
          )}
          loading="lazy"
        />

        {/* Hover overlay with quick actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-2">
          {/* Poster gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          <div className="relative z-10 flex flex-col items-center gap-2 w-full px-2">
            <button
              onClick={handleCart}
              disabled={outOfStock}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all',
                outOfStock
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-[#f5c518] hover:bg-[#f5c518]/90 text-black active:scale-95'
              )}
            >
              <ShoppingCart size={12} />
              {outOfStock ? 'Out of Stock' : 'Add to Basket'}
            </button>
            <button
              onClick={handleFav}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-all active:scale-95',
                favourite
                  ? 'bg-[#f5c518]/15 border-[#f5c518]/30 text-[#f5c518]'
                  : 'bg-white/10 border-white/15 text-white/80 hover:text-white hover:bg-white/20'
              )}
            >
              <Heart size={12} fill={favourite ? '#f5c518' : 'none'} />
              {favourite ? 'Saved' : 'Favourite'}
            </button>
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_new_release && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#f5c518] text-black">
              New
            </span>
          )}
          {product.is_best_seller && !product.is_new_release && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/15 backdrop-blur text-white">
              Best Seller
            </span>
          )}
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-500 text-white">
              Sale
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-black/70 backdrop-blur rounded-lg py-1.5 text-[10px] font-semibold text-white/50">
            <Package size={10} />
            Out of Stock
          </div>
        )}

        {/* IMDb rating badge */}
        {product.imdb_rating && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/75 backdrop-blur-sm rounded px-1.5 py-0.5">
            <Star size={9} fill="#f5c518" className="text-[#f5c518]" />
            <span className="text-[10px] font-bold text-[#f5c518]">
              {product.imdb_rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Below poster: title + year + price */}
      <div className="mt-2.5 px-0.5">
        <h3 className="text-[13px] font-semibold text-white/90 group-hover:text-white transition-colors leading-tight line-clamp-1">
          {product.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-white/35">
            <span>{product.release_year}</span>
            {product.imdb_rating && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-0.5 text-[#f5c518]">
                  <Star size={9} fill="#f5c518" />
                  {product.imdb_rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-[11px] text-white/25 line-through">
                {formatGBP(product.compare_at_price)}
              </span>
            )}
            <span className="text-sm font-bold text-white">
              {formatGBP(product.price)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="flex flex-col animate-pulse">
    <div className="aspect-[2/3] rounded-xl bg-white/[0.05]" />
    <div className="mt-2.5 space-y-1.5">
      <div className="h-3 rounded bg-white/[0.07] w-3/4" />
      <div className="h-2.5 rounded bg-white/[0.05] w-1/2" />
    </div>
  </div>
);

export const SeriviaMovieGrid: React.FC<SeriviaMovieGridProps> = ({ products, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package size={40} className="text-white/15 mb-4" />
        <p className="text-white/35 text-sm font-medium">No titles found in this collection.</p>
        <p className="text-white/20 text-xs mt-1">Try a different filter or browse all editions.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {products.map((product) => (
        <MovieCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default SeriviaMovieGrid;
