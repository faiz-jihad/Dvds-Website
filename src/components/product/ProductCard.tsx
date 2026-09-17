import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Product } from '../../types';
import { formatGBP, cn } from '../../lib/formatters';
import { Badge } from '../common/Badge';
import { BbfcBadge } from '../common/BbfcBadge';
import { ImdbBadge } from '../common/ImdbBadge';
import { useCartStore } from '../../stores/useCartStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useUiStore } from '../../stores/useUiStore';
import { publicApi } from '../../lib/publicApi';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, className }) => {
  const addItem = useCartStore((state) => state.addItem);
  const openCartDrawer = useUiStore((state) => state.openCartDrawer);
  const addToast = useUiStore((state) => state.addToast);
  const { isFavourite, toggleFavourite } = useFavouritesStore();
  const [isAdded, setIsAdded] = useState(false);
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: publicApi.getStoreSettings, staleTime: 60_000 });

  const isFav = isFavourite(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setIsAdded(true);
    addToast(`Added "${product.title}" to basket`, 'success');
    openCartDrawer();
    setTimeout(() => setIsAdded(false), 1800);
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleFavourite(product.id);
    addToast(
      result ? `Added "${product.title}" to favourites` : `Removed from favourites`,
      'info'
    );
  };

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;

  return (
    <div className={cn('group flex flex-col relative', className)}>
      {/* DVD Cover Container with Perspective & Subtle Lift */}
      <div className="relative aspect-dvd w-full overflow-hidden rounded-sm bg-gray-100 border border-gray-200/80 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-dvd-hover">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <img
            src={product.cover_image_url}
            alt={`${product.title} DVD Cover`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </Link>

        {/* Optical disc edge highlight line */}
        <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {product.spine_number && (
            <span className="px-1.5 py-0.5 rounded-xs bg-dark/90 text-white font-mono text-[9px] font-bold tracking-widest uppercase border border-white/20">
              SPINE #{product.spine_number}
            </span>
          )}
          {hasDiscount && <Badge variant="sale">SALE</Badge>}
          {product.is_new_release && !hasDiscount && <Badge variant="new">NEW</Badge>}
          {product.is_best_seller && !hasDiscount && !product.is_new_release && (
            <Badge variant="best-seller">BEST SELLER</Badge>
          )}
          {settingsQuery.data && product.stock_quantity <= settingsQuery.data.low_stock_threshold && product.stock_quantity > 0 && (
            <Badge variant="low-stock">ONLY {product.stock_quantity} LEFT</Badge>
          )}
        </div>

        {/* Top Right Wishlist Button */}
        <button
          onClick={handleToggleFav}
          aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
          className={cn(
            'absolute top-2 right-2 flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 backdrop-blur-md transition-all duration-200 z-10 sm:top-2.5 sm:right-2.5',
            isFav
              ? 'bg-white text-brand-red shadow-sm'
              : 'bg-dark/40 text-white hover:bg-white hover:text-dark'
          )}
        >
          <Heart className={cn('w-4 h-4 transition-transform active:scale-125', isFav && 'fill-current')} />
        </button>

        {/* Quick Add Overlay on Hover */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-center bg-gradient-to-t from-dark/90 via-dark/50 to-transparent p-2 opacity-100 transition-opacity duration-200 sm:p-3 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
          <button
            onClick={handleQuickAdd}
            disabled={product.stock_quantity <= 0}
            className={cn(
              'flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 sm:px-3 sm:text-xs',
              product.stock_quantity <= 0
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-brand-blue text-white hover:bg-brand-blue-hover shadow-md'
            )}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                Added
              </>
            ) : product.stock_quantity <= 0 ? (
              'Out of Stock'
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                Quick Add
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="pt-3 pb-1 flex flex-col flex-grow">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <BbfcBadge rating={product.age_rating} size="xs" />
            <span className="font-mono uppercase tracking-wider">{product.format}</span>
            {product.region_code && (
              <>
                <span className="text-gray-300 font-mono text-[10px]">•</span>
                <span className="font-mono text-[10px] text-gray-400 uppercase truncate">{product.region_code}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ImdbBadge product={product} size="xs" />
            <span className="text-gray-300 font-mono text-[10px]">•</span>
            <span className="font-mono text-[11px] text-gray-400">{product.release_year}</span>
          </div>
        </div>

        <Link to={`/product/${product.slug}`}>
          <h3 className="font-display font-semibold text-sm text-dark line-clamp-1 group-hover:text-brand-blue transition-colors">
            {product.title}
          </h3>
        </Link>

        {product.director && (
          <span className="text-[11px] text-gray-400 font-light truncate mt-0.5">
            Dir. {product.director}
          </span>
        )}

        {/* Price display with strict British currency & Red sale price */}
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className={cn('font-bold text-sm tracking-tight', hasDiscount ? 'text-brand-red' : 'text-dark')}>
            {formatGBP(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through font-mono">
              {formatGBP(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
