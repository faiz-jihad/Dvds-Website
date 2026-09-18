import React from 'react';
import { Link } from 'react-router-dom';
import { Disc, ShoppingCart, Star, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, cn } from '../../lib/formatters';

interface SeriviaSpotlightBannerProps {
  product: Product;
}

export const SeriviaSpotlightBanner: React.FC<SeriviaSpotlightBannerProps> = ({ product }) => {
  const addItem = useCartStore((s) => s.addItem);
  const { openCartDrawer, addToast } = useUiStore();

  if (!product) return null;

  const handleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stock_quantity === 0) return;
    addItem(product);
    addToast(`"${product.title}" added to basket`, 'success');
    openCartDrawer();
  };

  const formatText = product.format === 'Box Set' ? 'Collector Box Set' : product.format || '4K Ultra HD';

  return (
    <section className="relative w-full rounded-3xl overflow-hidden bg-dark border border-gray-800 shadow-2xl select-none">
      {/* Background Cinematic Atmosphere */}
      <div className="absolute inset-0 z-0">
        <img
          src={product.cover_image_url}
          alt={product.title}
          className="w-full h-full object-cover object-center filter blur-xl scale-125 opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/95 to-dark/80" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-5 sm:p-8 lg:p-10 gap-6 lg:gap-10">
        {/* Left Content */}
        <div className="flex-1 min-w-0 max-w-2xl text-left">
          {/* Eyebrow badge */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest bg-brand-blue text-white shadow-md">
              <Sparkles size={11} className="stroke-[2.5]" />
              Curator's Spotlight
            </span>
            <span className="text-xs font-semibold text-white/60">
              Edition of the Month
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            {product.title}
          </h2>

          {/* Metadata Specs Bar */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-white/70 mb-4">
            <span className="inline-flex items-center gap-1 font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
              <Disc size={13} className="text-brand-blue" />
              {formatText}
            </span>
            <span>{product.release_year}</span>
            <span>&bull;</span>
            {product.imdb_rating && (
              <span className="inline-flex items-center gap-1 font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/15">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                IMDb {product.imdb_rating.toFixed(1)}
              </span>
            )}
            {product.genres?.[0]?.name && (
              <>
                <span>&bull;</span>
                <span className="text-white/60">{product.genres[0].name}</span>
              </>
            )}
            {product.runtime_minutes && (
              <>
                <span>&bull;</span>
                <span className="text-white/60">{product.runtime_minutes} min</span>
              </>
            )}
          </div>

          {/* Description snippet */}
          {(product.short_description || product.description) && (
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed line-clamp-3 mb-6 font-normal">
              {product.short_description || product.description}
            </p>
          )}

          {/* Pricing & CTA */}
          <div className="flex flex-wrap items-center gap-3.5">
            <button
              onClick={handleCart}
              disabled={product.stock_quantity === 0}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-brand-blue/30 active:scale-95 transition-all cursor-pointer disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={16} />
              <span>Add to Basket &bull; {formatGBP(product.price)}</span>
            </button>

            <Link
              to={`/product/${product.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/15 active:scale-95 transition-all cursor-pointer"
            >
              <span>Explore Edition</span>
              <ArrowRight size={14} />
            </Link>

            <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/70 font-medium ml-2">
              <ShieldCheck size={16} className="text-brand-blue shrink-0" />
              <span>Free UK Tracked Delivery</span>
            </div>
          </div>
        </div>

        {/* Right Poster Artwork */}
        <div className="relative shrink-0 w-[160px] sm:w-[200px] lg:w-[240px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-2 border-white/20 group">
          <img
            src={product.cover_image_url}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>
      </div>
    </section>
  );
};

export default SeriviaSpotlightBanner;
