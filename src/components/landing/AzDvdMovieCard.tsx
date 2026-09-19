import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Disc, Check } from 'lucide-react';
import { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useUiStore } from '../../stores/useUiStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { formatGBP, cn } from '../../lib/formatters';

interface AzDvdMovieCardProps {
  product: Product;
  className?: string;
}

export const AzDvdMovieCard: React.FC<AzDvdMovieCardProps> = ({ product, className }) => {
  const addItem = useCartStore((s) => s.addItem);
  const { openCartDrawer, addToast } = useUiStore();
  const { toggleFavourite, isFavourite } = useFavouritesStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
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
        'group relative flex flex-col justify-between select-none rounded-2xl border transition-all duration-300 p-2 sm:p-2.5 hover:-translate-y-1.5',
        isDark
          ? 'bg-[#0D121D] border-white/10 text-white hover:border-brand-blue/50 hover:shadow-2xl hover:shadow-brand-blue/10'
          : 'bg-white border-gray-200 text-gray-900 shadow-xs hover:border-brand-blue/50 hover:shadow-xl',
        className
      )}
    >
      {/* ── 1. Poster Artwork Area with Physical DVD Case Styling ── */}
      <div
        className={cn(
          'relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-md border',
          isDark ? 'bg-[#161D2C] border-white/5' : 'bg-gray-100 border-gray-200/80'
        )}
      >
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

        {/* Tactile DVD Case Sheen (Subtle diagonal gloss reflection) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 opacity-60 pointer-events-none group-hover:opacity-80 transition-opacity duration-300" />

        {/* Physical Disc Spine Left Border Cue */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20 backdrop-blur-xs pointer-events-none" />

        {/* Multi-layered cinematic gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-black/20 to-transparent opacity-0 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />

        {/* Top-Left: Status / Format Pill Badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-col gap-1">
          {hasDiscount ? (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-red text-white shadow-md">
              {discountPercent > 0 ? `-${discountPercent}%` : 'SALE'}
            </span>
          ) : product.is_new_release ? (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-blue text-white shadow-md">
              NEW
            </span>
          ) : (
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-gray-300 border border-white/10">
              {formatBadge}
            </span>
          )}
        </div>

        {/* Top-Right: Glass Wishlist Button */}
        <button
          onClick={handleFav}
          aria-label={favourite ? 'Remove from favourites' : 'Save to favourites'}
          title={favourite ? 'Saved in Favourites' : 'Add to Favourites'}
          className={cn(
            'absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-90 shadow-sm',
            favourite
              ? 'bg-brand-red text-white'
              : 'bg-black/50 hover:bg-black/80 text-white/90 border border-white/20'
          )}
        >
          <Heart size={12} className={favourite ? 'fill-white' : ''} />
        </button>

        {/* Bottom-Right on hover: Quick Add to Cart pill */}
        {!outOfStock && (
          <button
            onClick={handleCart}
            aria-label={`Add ${product.title} to basket`}
            title="Quick add to basket"
            className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 w-8 h-8 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white flex items-center justify-center shadow-lg active:scale-90 cursor-pointer"
          >
            <ShoppingBag size={14} />
          </button>
        )}

        {/* Out of Stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-2 text-center pointer-events-none">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/80 border border-red-800/60 px-2 py-1 rounded">
              Awaiting Stock
            </span>
          </div>
        )}
      </div>

      {/* ── 2. Movie Metadata & Pricing Area ── */}
      <div className="pt-2 sm:pt-2.5 flex flex-col justify-between flex-1">
        <div>
          {/* Year, Rating, Genre */}
          <div className={cn('flex items-center gap-1.5 text-[10px] font-medium mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
            <span>{product.release_year}</span>
            <span>&bull;</span>
            <span className="truncate">{product.genres?.[0]?.name || product.format}</span>
            {product.imdb_rating && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star size={9} fill="#f59e0b" />
                  {product.imdb_rating.toFixed(1)}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <Link
            to={`/product/${product.slug}`}
            className={cn(
              'block text-xs sm:text-sm font-bold leading-snug line-clamp-2 hover:text-brand-blue transition-colors cursor-pointer',
              isDark ? 'text-white' : 'text-gray-900'
            )}
            title={product.title}
          >
            {product.title}
          </Link>
        </div>

        {/* Price & Physical Store Stock Indicator */}
        <div className={cn('mt-2 pt-1.5 border-t flex items-center justify-between gap-1.5', isDark ? 'border-white/5' : 'border-gray-100')}>
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-xs sm:text-sm font-black font-mono', isDark ? 'text-white' : 'text-gray-900')}>
              {formatGBP(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-gray-400 line-through font-mono">
                {formatGBP(product.compare_at_price!)}
              </span>
            )}
          </div>

          {/* Stock availability indicator */}
          <div className="flex items-center gap-1">
            {!outOfStock ? (
              <span className="text-[9px] font-semibold text-emerald-400 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden min-[380px]:inline">In Stock</span>
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-gray-500">Sold Out</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AzDvdMovieCard;
