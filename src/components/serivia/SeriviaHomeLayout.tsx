import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SeriviaSidebar, SeriviaMobileDrawer } from './SeriviaSidebar';
import { SeriviaTopNav } from './SeriviaTopNav';
import { SeriviaHeroBanner } from './SeriviaHeroBanner';
import { SeriviaGenreFilter } from './SeriviaGenreFilter';
import { SeriviaMovieGrid } from './SeriviaMovieGrid';
import { Product, Category, Genre } from '../../types';
import {
  ArrowRight,
  Home,
  Film,
  Heart,
  ShoppingBag,
  Menu,
} from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useUiStore } from '../../stores/useUiStore';
import { cn } from '../../lib/formatters';

interface SeriviaHomeLayoutProps {
  products: Product[];
  categories: Category[];
  genres: Genre[];
}

export const SeriviaHomeLayout: React.FC<SeriviaHomeLayoutProps> = ({
  products,
  categories,
  genres,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const { pathname } = useLocation();

  const cartCount = useCartStore((s) => s.getItemCount());
  const favourites = useFavouritesStore((s) => s.favourites);
  const { openCartDrawer } = useUiStore();

  // Featured products for the hero banner carousel
  const featuredProducts = useMemo(() => {
    const featured = products.filter(
      (p) => p.is_featured && p.status === 'active' && p.stock_quantity > 0
    );
    if (featured.length >= 2) return featured;
    return products
      .filter((p) => p.status === 'active' && p.stock_quantity > 0)
      .slice(0, 6);
  }, [products]);

  // Recent products shown in sidebar vault highlights
  const recentProducts = useMemo(
    () => products.filter((p) => p.status === 'active').slice(0, 4),
    [products]
  );

  // Filtered products for the movie grid
  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.status === 'active');
    switch (activeFilter) {
      case 'trending':
        return active
          .filter((p) => p.is_best_seller || p.is_featured)
          .slice(0, 48);
      case 'new':
        return active.filter((p) => p.is_new_release).slice(0, 48);
      case 'sale':
        return active
          .filter((p) => p.compare_at_price && p.compare_at_price > p.price)
          .slice(0, 48);
      case 'box_set':
        return active.filter((p) => p.format === 'Box Set').slice(0, 48);
      default:
        if (activeFilter.startsWith('genre:')) {
          const slug = activeFilter.replace('genre:', '');
          return active
            .filter((p) => p.genres?.some((g) => g.slug === slug))
            .slice(0, 48);
        }
        if (activeFilter.startsWith('cat:')) {
          const slug = activeFilter.replace('cat:', '');
          return active
            .filter((p) => p.category?.slug === slug)
            .slice(0, 48);
        }
        return active.slice(0, 60);
    }
  }, [products, activeFilter]);

  // Section title based on active filter
  const filterTitle = useMemo(() => {
    if (activeFilter === 'all') return 'Collector Vault Catalogue';
    if (activeFilter === 'trending') return 'Trending Now';
    if (activeFilter === 'new') return 'New Arrivals';
    if (activeFilter === 'sale') return 'Special Offers & Sale';
    if (activeFilter === 'box_set') return 'Definitive Box Sets';
    if (activeFilter.startsWith('genre:')) {
      const g = genres.find((item) => `genre:${item.slug}` === activeFilter);
      return g ? `${g.name} Movies` : 'Genre Collection';
    }
    if (activeFilter.startsWith('cat:')) {
      const c = categories.find((item) => `cat:${item.slug}` === activeFilter);
      return c ? `${c.name} Collection` : 'Category';
    }
    return 'Movies & Editions';
  }, [activeFilter, genres, categories]);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#09090e] text-white overflow-hidden select-none">
      {/* Top Navigation */}
      <SeriviaTopNav
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        activeType={activeFilter}
        onSelectType={setActiveFilter}
      />

      {/* Main Body Area: Desktop Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Desktop Only) */}
        <div className="relative hidden md:block shrink-0 z-10">
          <SeriviaSidebar
            recentProducts={recentProducts}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        </div>

        {/* Mobile Slide-out Drawer */}
        <SeriviaMobileDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          recentProducts={recentProducts}
          categories={categories}
          genres={genres}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
        />

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative overscroll-contain">
          <div className="px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 max-w-[1680px] mx-auto">
            {/* Featured Hero Banner Carousel */}
            <SeriviaHeroBanner products={featuredProducts} />

            {/* Horizontal Genre & Category Pills Filter */}
            <SeriviaGenreFilter
              categories={categories}
              genres={genres}
              products={products}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />

            {/* Movie Grid Section */}
            <div>
              <div className="flex items-center justify-between mb-3.5 sm:mb-4 px-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-[#f5c518]" />
                  <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                    {filterTitle}
                  </h2>
                  <span className="text-[11px] font-semibold text-white/40">
                    ({filteredProducts.length})
                  </span>
                </div>

                <Link
                  to={`/shop${activeFilter !== 'all' ? `?filter=${activeFilter}` : ''}`}
                  className="flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-[#f5c518] transition-colors group"
                >
                  <span>View All</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Responsive Movie Grid */}
              <SeriviaMovieGrid products={filteredProducts} />
            </div>

            {/* Bottom spacer on mobile so navigation bar never obstructs content */}
            <div className="pb-24 md:pb-8" />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (No emojis, sleek Lucide icons & live counters) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0d0f14]/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-2 py-1.5 safe-area-inset-bottom shadow-2xl"
      >
        {/* Home */}
        <Link
          to="/"
          onClick={() => setActiveFilter('all')}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors',
            pathname === '/' && activeFilter === 'all'
              ? 'text-[#f5c518]'
              : 'text-white/50 hover:text-white'
          )}
        >
          <Home size={18} />
          <span>Home</span>
        </Link>

        {/* Browse / Catalogue */}
        <Link
          to="/shop"
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors',
            pathname.startsWith('/shop')
              ? 'text-[#f5c518]'
              : 'text-white/50 hover:text-white'
          )}
        >
          <Film size={18} />
          <span>Browse</span>
        </Link>

        {/* Favourites with Badge */}
        <Link
          to="/favourites"
          className={cn(
            'relative flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors',
            pathname.startsWith('/favourites')
              ? 'text-[#f5c518]'
              : 'text-white/50 hover:text-white'
          )}
        >
          <div className="relative">
            <Heart size={18} />
            {favourites.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] rounded-full bg-[#f5c518] text-black text-[9px] font-extrabold flex items-center justify-center px-0.5 leading-none">
                {favourites.length}
              </span>
            )}
          </div>
          <span>Saved</span>
        </Link>

        {/* Basket with Badge */}
        <button
          type="button"
          onClick={openCartDrawer}
          className="relative flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold text-white/50 hover:text-white transition-colors"
        >
          <div className="relative">
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] rounded-full bg-[#f5c518] text-black text-[9px] font-extrabold flex items-center justify-center px-0.5 leading-none shadow">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
          <span>Basket</span>
        </button>

        {/* Menu (Opens Mobile Drawer) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors',
            mobileMenuOpen ? 'text-[#f5c518]' : 'text-white/50 hover:text-white'
          )}
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
};

export default SeriviaHomeLayout;
