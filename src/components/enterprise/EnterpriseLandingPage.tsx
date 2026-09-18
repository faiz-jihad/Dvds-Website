import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  ShoppingCart,
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Disc,
  Layers,
  Award,
  Lock,
  Package,
  Film,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Product, Category, Genre } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, formatRuntime, cn } from '../../lib/formatters';

interface EnterpriseLandingPageProps {
  products: Product[];
  categories: Category[];
  genres: Genre[];
}

export const EnterpriseLandingPage: React.FC<EnterpriseLandingPageProps> = ({
  products,
  categories,
  genres,
}) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroAnimating, setHeroAnimating] = useState(false);
  const navigate = useNavigate();

  const addItem = useCartStore((s) => s.addItem);
  const { openCartDrawer, addToast } = useUiStore();
  const { toggleFavourite, isFavourite } = useFavouritesStore();

  // Featured titles for the monumental Hero Billboard
  const featuredProducts = useMemo(() => {
    const featured = products.filter(
      (p) => p.is_featured && p.status === 'active' && p.stock_quantity > 0
    );
    if (featured.length >= 3) return featured.slice(0, 6);
    return products
      .filter((p) => p.status === 'active' && p.stock_quantity > 0)
      .slice(0, 6);
  }, [products]);

  // Box Sets for curated anthology section
  const boxSetProducts = useMemo(() => {
    return products
      .filter(
        (p) =>
          p.status === 'active' &&
          (p.format?.toLowerCase().includes('box') || p.category?.slug?.includes('box'))
      )
      .slice(0, 8);
  }, [products]);

  // Touch swipe support for Hero Billboard
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const gotoHero = useCallback(
    (idx: number) => {
      if (heroAnimating || idx === heroIndex) return;
      setHeroAnimating(true);
      setTimeout(() => {
        setHeroIndex(idx);
        setHeroAnimating(false);
      }, 250);
    },
    [heroAnimating, heroIndex]
  );

  const prevHero = useCallback(() => {
    gotoHero((heroIndex - 1 + featuredProducts.length) % featuredProducts.length);
  }, [heroIndex, featuredProducts.length, gotoHero]);

  const nextHero = useCallback(() => {
    gotoHero((heroIndex + 1) % featuredProducts.length);
  }, [heroIndex, featuredProducts.length, gotoHero]);

  // Auto-advance hero carousel every 7 seconds
  useEffect(() => {
    if (featuredProducts.length <= 1) return;
    const timer = setTimeout(nextHero, 7000);
    return () => clearTimeout(timer);
  }, [heroIndex, featuredProducts.length, nextHero]);

  // Filtered catalogue
  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.status === 'active');
    switch (activeFilter) {
      case 'trending':
        return active.filter((p) => p.is_best_seller || p.is_featured);
      case 'new':
        return active.filter((p) => p.is_new_release);
      case 'sale':
        return active.filter((p) => p.compare_at_price && p.compare_at_price > p.price);
      case 'box_set':
        return active.filter((p) => p.format?.toLowerCase().includes('box'));
      case 'format:4k':
        return active.filter((p) => p.format?.toLowerCase().includes('4k'));
      case 'format:blu-ray':
        return active.filter((p) => p.format?.toLowerCase().includes('blu'));
      case 'format:dvd':
        return active.filter(
          (p) =>
            p.format?.toLowerCase().includes('dvd') &&
            !p.format?.toLowerCase().includes('box')
        );
      default:
        if (activeFilter.startsWith('genre:')) {
          const slug = activeFilter.replace('genre:', '');
          return active.filter((p) => p.genres?.some((g) => g.slug === slug));
        }
        if (activeFilter.startsWith('cat:')) {
          const slug = activeFilter.replace('cat:', '');
          return active.filter((p) => p.category?.slug === slug);
        }
        return active;
    }
  }, [products, activeFilter]);

  const activeHeroProduct = featuredProducts[heroIndex] || products[0];

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock_quantity === 0) return;
    addItem(product);
    addToast(`"${product.title}" added to basket`, 'success');
    openCartDrawer();
  };

  const handleToggleFav = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavourite(product.id);
    addToast(added ? `"${product.title}" saved to favourites` : `Removed from favourites`, 'info');
  };

  // Static + Dynamic Filter Pills
  const filterPills = [
    { id: 'all', label: 'All Vault Editions' },
    { id: 'box_set', label: 'Complete Box Sets' },
    { id: 'format:4k', label: '4K Ultra HD' },
    { id: 'format:blu-ray', label: 'Blu-ray Discs' },
    { id: 'trending', label: 'Trending Cinema' },
    { id: 'new', label: 'New Arrivals' },
    { id: 'sale', label: 'Special Offers' },
    ...genres.slice(0, 6).map((g) => ({ id: `genre:${g.slug}`, label: g.name })),
  ];

  return (
    <div className="w-full bg-white text-dark antialiased select-none">
      {/* ========================================================================= */}
      {/* 1. MONUMENTAL BILLBOARD CINEMA HERO SHOWCASE (Apple TV+ / Criterion Style) */}
      {/* ========================================================================= */}
      {activeHeroProduct && (
        <section
          className="relative w-full bg-[#0a0c10] text-white overflow-hidden"
          onTouchStart={(e) => {
            touchEndX.current = null;
            touchStartX.current = e.targetTouches[0].clientX;
          }}
          onTouchMove={(e) => {
            touchEndX.current = e.targetTouches[0].clientX;
          }}
          onTouchEnd={() => {
            if (!touchStartX.current || !touchEndX.current) return;
            const diff = touchStartX.current - touchEndX.current;
            if (diff > 45) nextHero();
            if (diff < -45) prevHero();
          }}
          aria-label="Flagship Movie Showcase"
        >
          {/* Billboard Canvas */}
          <div className="relative w-full min-h-[460px] sm:min-h-[540px] lg:min-h-[620px] flex items-center">
            {/* Background Backdrop Image */}
            <div
              className={cn(
                'absolute inset-0 transition-all duration-700 ease-out',
                heroAnimating ? 'opacity-40 scale-102' : 'opacity-100 scale-100'
              )}
            >
              <img
                src={activeHeroProduct.cover_image_url}
                alt={activeHeroProduct.title}
                className="w-full h-full object-cover object-center"
              />
              {/* Cinematic Vignettes & Overlays matching corporate enterprise look */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/60 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10]/95 via-[#0a0c10]/70 to-transparent lg:w-3/4" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-12 py-10 sm:py-16 flex flex-col justify-center">
              <div className="max-w-2xl">
                {/* Format Badges & Specifications */}
                <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue text-white text-xs font-extrabold uppercase tracking-wider shadow-sm">
                    <Disc size={13} />
                    {activeHeroProduct.format === 'Box Set' ? 'Collector Box Set' : activeHeroProduct.format || '4K Ultra HD'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white/90 text-xs font-semibold border border-white/10">
                    {activeHeroProduct.release_year}
                  </span>
                  {activeHeroProduct.imdb_rating && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-black text-xs font-black shadow-sm">
                      <Star size={12} fill="black" />
                      {activeHeroProduct.imdb_rating.toFixed(1)} IMDb
                    </span>
                  )}
                  {activeHeroProduct.runtime_minutes && (
                    <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs font-medium">
                      {formatRuntime(activeHeroProduct.runtime_minutes)}
                    </span>
                  )}
                </div>

                {/* Monumental Title */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08] mb-3 drop-shadow-md">
                  {activeHeroProduct.title}
                </h1>

                {/* Overview / Tagline */}
                <p className="text-sm sm:text-base text-gray-300 font-normal leading-relaxed line-clamp-3 mb-6 max-w-xl">
                  {activeHeroProduct.short_description ||
                    activeHeroProduct.description ||
                    'Definitive physical collector release with restored master transfer, uncompressed sound, and archival bonus features. Direct dispatch from London vault.'}
                </p>

                {/* Pricing & Value Dispatch Tag */}
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {formatGBP(activeHeroProduct.price)}
                  </span>
                  {activeHeroProduct.compare_at_price &&
                    activeHeroProduct.compare_at_price > activeHeroProduct.price && (
                      <span className="text-sm sm:text-base text-gray-400 line-through">
                        {formatGBP(activeHeroProduct.compare_at_price)}
                      </span>
                    )}
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 ml-1">
                    <Truck size={13} />
                    Free UK Tracked 24 Dispatch
                  </span>
                </div>

                {/* CTAs Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={(e) => handleAddToCart(e, activeHeroProduct)}
                    disabled={activeHeroProduct.stock_quantity === 0}
                    className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-sm sm:text-base px-6 sm:px-8 py-3.5 rounded-xl shadow-lg shadow-brand-blue/30 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={17} />
                    <span>
                      {activeHeroProduct.stock_quantity === 0 ? 'Sold Out' : 'Add to Basket'}
                    </span>
                  </button>

                  <Link
                    to={`/product/${activeHeroProduct.slug}`}
                    className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm sm:text-base px-5 sm:px-6 py-3.5 rounded-xl backdrop-blur-md border border-white/20 active:scale-98 transition-all cursor-pointer"
                  >
                    <Play size={15} fill="white" />
                    <span>View Edition</span>
                  </Link>

                  <button
                    onClick={(e) => handleToggleFav(e, activeHeroProduct)}
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center border transition-all active:scale-90 cursor-pointer',
                      isFavourite(activeHeroProduct.id)
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                    )}
                    aria-label="Save to Favourites"
                    title="Add to Favourites"
                  >
                    <Heart size={18} fill={isFavourite(activeHeroProduct.id) ? 'white' : 'none'} />
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Slide Navigation Chevrons */}
            {featuredProducts.length > 1 && (
              <>
                <button
                  onClick={prevHero}
                  className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 items-center justify-center text-white transition-all cursor-pointer shadow-xl active:scale-90"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={nextHero}
                  className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 items-center justify-center text-white transition-all cursor-pointer shadow-xl active:scale-90"
                  aria-label="Next slide"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            {/* Slide Pagination Indicator (Bottom Center / Right) */}
            {featuredProducts.length > 1 && (
              <div className="absolute bottom-5 right-4 sm:right-8 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {featuredProducts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => gotoHero(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                      i === heroIndex ? 'w-6 bg-brand-blue' : 'w-1.5 bg-white/40 hover:bg-white/80'
                    )}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. CORPORATE CREDENTIALS & TRUST STRIP (Enterprise Credibility)          */}
      {/* ========================================================================= */}
      <section className="border-b border-gray-200 bg-gray-50/80 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                <Truck size={22} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-dark leading-snug">
                  Royal Mail Tracked 24
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                  Same-day London vault dispatch
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-dark leading-snug">
                  100% Studio Authentic
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                  Brand new & factory sealed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                <Lock size={22} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-dark leading-snug">
                  Barclays & 256-Bit SSL
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                  Direct bank & card protection
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                <RotateCcw size={22} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-dark leading-snug">
                  30-Day Guarantee
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                  Hassle-free collector returns
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CURATED FORMAT & CATEGORY NAVIGATOR PILLS                              */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-10 sm:pt-14 pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-brand-blue font-extrabold text-xs tracking-wider uppercase mb-1">
              <Sparkles size={14} />
              <span>Curated Vault Catalogue</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
              Physical Media Collection
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Browse definitive DVD box sets, 4K UHD masters, and restored British cinema releases.
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:text-brand-blue-hover transition-colors group self-start md:self-auto cursor-pointer"
          >
            <span>Explore All {products.length} Titles</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
          {filterPills.map((pill) => {
            const active = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id)}
                className={cn(
                  'shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95',
                  active
                    ? 'bg-dark text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-dark border border-gray-200/80'
                )}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FLAGSHIP PRODUCT SHOWCASE GRID                                         */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-16 sm:pb-20">
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-gray-50 border border-gray-200 my-4">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-base text-dark">No titles found in this selection</h3>
            <p className="text-xs text-gray-500 mt-1">
              Try selecting another format or category tab above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 mt-4">
            {filteredProducts.map((product) => {
              const favourite = isFavourite(product.id);
              const outOfStock = product.stock_quantity === 0;
              const formatBadge = product.format === 'Box Set' ? 'Box Set' : product.format || 'DVD';

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col bg-white rounded-2xl border border-gray-200/80 hover:border-gray-300 hover:shadow-xl transition-all duration-300 p-2.5 sm:p-3"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                    <Link
                      to={`/product/${product.slug}`}
                      className="block w-full h-full cursor-pointer"
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

                    {/* Top Badges */}
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
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/75 backdrop-blur text-white shadow">
                        {formatBadge}
                      </span>
                    </div>

                    {/* Top-Right Favourite Button */}
                    <button
                      onClick={(e) => handleToggleFav(e, product)}
                      className={cn(
                        'absolute top-2 right-2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer active:scale-90',
                        favourite
                          ? 'bg-brand-red text-white'
                          : 'bg-black/60 hover:bg-black/80 text-white backdrop-blur'
                      )}
                      aria-label="Favourite"
                      title="Save to Favourites"
                    >
                      <Heart size={13} fill={favourite ? 'white' : 'none'} />
                    </button>

                    {/* Out of Stock Overlay */}
                    {outOfStock && (
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-black/85 backdrop-blur-md rounded-lg py-1 text-[10px] font-bold text-white/70">
                        <Package size={11} />
                        Sold Out
                      </div>
                    )}

                    {/* IMDb Rating Badge */}
                    {product.imdb_rating && !outOfStock && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur rounded px-1.5 py-0.5 text-white">
                        <Star size={9} fill="#f5c518" className="text-[#f5c518]" />
                        <span className="text-[10px] font-extrabold text-white">
                          {product.imdb_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info Below Poster */}
                  <div className="mt-3 flex flex-col flex-1 justify-between">
                    <div>
                      <Link
                        to={`/product/${product.slug}`}
                        className="text-xs sm:text-sm font-bold text-dark hover:text-brand-blue transition-colors line-clamp-1 cursor-pointer leading-snug"
                        title={product.title}
                      >
                        {product.title}
                      </Link>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {product.release_year} &bull; {product.genres?.[0]?.name || product.format}
                      </p>
                    </div>

                    {/* Price & 1-Tap Add to Cart */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-extrabold text-dark">
                          {formatGBP(product.price)}
                        </span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="text-[11px] text-gray-400 line-through">
                            {formatGBP(product.compare_at_price)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={outOfStock}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-sm shrink-0',
                          outOfStock
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-dark hover:bg-brand-blue text-white shadow-dark/10'
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
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 5. EDITORIAL CHAPTER: "WHY PHYSICAL MEDIA WINS" (Prestige & Quality)      */}
      {/* ========================================================================= */}
      <section className="bg-[#0b0d13] text-white py-16 sm:py-24 border-t border-b border-neutral-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue bg-brand-blue/15 px-3 py-1 rounded-full inline-block mb-3">
              The Collector's Manifesto
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              True Cinema Belongs On Physical Disc.
            </h2>
            <p className="text-base text-gray-300 mt-4 leading-relaxed">
              Streaming video services compress audio and video by up to 85%. Physical 4K Ultra HD and DVD-9 media deliver pure uncompressed bitrates, preserving director intent forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-brand-blue/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 text-brand-blue flex items-center justify-center mb-5">
                <Layers size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">100+ Mbps Bitrate</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                4x higher bitrates than 4K streaming. Experience razor-sharp film grain, deep shadows, and HDR dynamic range free from compression artifacts.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-brand-blue/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 text-brand-blue flex items-center justify-center mb-5">
                <Award size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Lossless Master Audio</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Uncompressed Dolby TrueHD and DTS-HD Master Audio. Hear every whisper, orchestral score, and explosion exactly as mixed in the dubbing theater.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-brand-blue/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 text-brand-blue flex items-center justify-center mb-5">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Permanent Ownership</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Zero licensing expirations. Films on physical media remain in your library permanently, complete with bonus commentaries and archive booklets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. COMPLETE TELEVISION & SAGAS BOX SETS HIGHLIGHT                         */}
      {/* ========================================================================= */}
      {boxSetProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                Complete Seasons & Anthologies
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight mt-1">
                Definitive Box Sets
              </h2>
            </div>
            <Link
              to="/shop?format=box-set"
              className="text-xs sm:text-sm font-bold text-brand-blue hover:text-brand-blue-hover flex items-center gap-1 cursor-pointer"
            >
              <span>View All Box Sets</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {boxSetProducts.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group flex flex-col bg-gray-50 rounded-2xl p-3 border border-gray-200/70 hover:border-brand-blue/40 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 shadow-sm">
                  <img
                    src={item.cover_image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 backdrop-blur text-white text-[9px] font-extrabold uppercase rounded">
                    Box Set
                  </div>
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-dark mt-2.5 line-clamp-1 group-hover:text-brand-blue transition-colors">
                  {item.title}
                </h4>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-gray-500">{item.release_year}</span>
                  <span className="font-extrabold text-dark">{formatGBP(item.price)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 7. VIP COLLECTOR CLUB NEWSLETTER STRIP                                    */}
      {/* ========================================================================= */}
      <section className="bg-gray-100 border-t border-gray-200 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
            VIP Collector Club
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight mt-1 mb-2">
            Priority Access to Rare Vault Restocks
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mb-6">
            Join 12,000+ UK film collectors. Receive instant notifications when out-of-print box sets and limited 4K UHD remasters arrive.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addToast('Thank you for subscribing! Welcome to the VIP Collector Club.', 'success');
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              placeholder="Enter your email address..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-blue text-sm outline-none bg-white"
            />
            <button
              type="submit"
              className="w-full sm:w-auto shrink-0 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-sm px-6 py-3 rounded-xl transition-all cursor-pointer active:scale-95 shadow-md shadow-brand-blue/20"
            >
              Join Club
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default EnterpriseLandingPage;
