import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Package } from 'lucide-react';
import { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, cn } from '../../lib/formatters';

interface SeriviaMovieCardProps {
  product: Product;
  className?: string;
}

export const SeriviaMovieCard: React.FC<SeriviaMovieCardProps> = ({
  product,
  className,
}) => {
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
    addToast(added ? `"${product.title}" saved to favourites` : 'Removed from favourites', 'info');
  };

  const formatBadge = product.format === 'Box Set' ? 'BOX SET' : product.format || 'DVD';
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between select-none bg-white rounded-2xl border border-gray-200/80 hover:border-gray-300 hover:shadow-xl transition-all duration-300 p-2 sm:p-2.5 hover:-translate-y-1',
        className
      )}
    >
      {/* ── 1. Poster Artwork Area ── */}
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
              'w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]',
              outOfStock && 'opacity-40 grayscale'
            )}
            loading="lazy"
          />
        </Link>

        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Top-Left: Exactly ONE Clean Status Badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          {hasDiscount ? (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-red text-white shadow-xs">
              {discountPercent > 0 ? `-${discountPercent}%` : 'SALE'}
            </span>
          ) : product.is_new_release ? (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-blue text-white shadow-xs">
              NEW
            </span>
          ) : null}
        </div>

        {/* Top-Right: Glass Wishlist Button */}
        <button
          onClick={handleFav}
          aria-label={favourite ? 'Remove from favourites' : 'Save to favourites'}
          title={favourite ? 'Saved in Favourites' : 'Add to Favourites'}
          className={cn(
            'absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-90 shadow-xs',
            favourite
              ? 'bg-brand-red text-white'
              : 'bg-black/40 hover:bg-black/60 text-white/90 border border-white/20'
          )}
        >
          <Heart size={12} className={favourite ? 'fill-white' : ''} />
        </button>

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-black/85 backdrop-blur-md rounded-lg py-1 text-[10px] font-bold text-white/70 pointer-events-none">
            <Package size={11} />
            Sold Out
          </div>
        )}
      </div>

      {/* ── 2. Information Area with Strict Vertical Baseline Alignment ── */}
      <div className="flex flex-col mt-2 px-0.5">
        {/* Row 1: Format Tag & Year on Left, IMDb Rating on Right */}
        <div className="h-4 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-extrabold text-[9px] uppercase px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-mono tracking-wider shrink-0">
              {formatBadge}
            </span>
            <span className="text-gray-400 font-semibold text-[10px] truncate">
              {product.release_year}
            </span>
          </div>

          {product.imdb_rating && (
            <div className="flex items-center gap-0.5 text-amber-500 font-bold text-[10px] shrink-0">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              <span>{product.imdb_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Row 2: Fixed-Height Title Container (h-9 sm:h-10) */}
        <div className="h-9 sm:h-10 mt-1 flex items-start overflow-hidden">
          <Link
            to={`/product/${product.slug}`}
            className="text-xs sm:text-[13px] font-bold text-dark leading-snug line-clamp-2 hover:text-brand-blue transition-colors cursor-pointer"
            title={product.title}
          >
            {product.title}
          </Link>
        </div>

        {/* Row 3: Price & Shopping Cart Action Button */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-150/70">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-extrabold text-brand-blue font-mono">
              {formatGBP(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-gray-400 line-through font-mono">
                {formatGBP(product.compare_at_price!)}
              </span>
            )}
          </div>

          <button
            onClick={handleCart}
            disabled={outOfStock}
            aria-label="Add to basket"
            title={outOfStock ? 'Sold out' : 'Add to basket'}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shrink-0',
              outOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 hover:bg-brand-blue text-gray-700 hover:text-white shadow-2xs'
            )}
          >
            <ShoppingCart size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeriviaMovieCard;
