import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SeriviaSidebar, SeriviaMobileDrawer } from './SeriviaSidebar';
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
        return active.filter((p) => p.is_best_seller || p.is_featured);
      case 'new':
        return active.filter((p) => p.is_new_release);
      case 'sale':
        return active.filter((p) => p.compare_at_price && p.compare_at_price > p.price);
      case 'box_set':
        return active.filter((p) => p.format?.toLowerCase().includes('box'));
      default:
        if (activeFilter.startsWith('format:')) {
          const fmt = activeFilter.replace('format:', '').toLowerCase();
          return active.filter((p) => p.format?.toLowerCase().includes(fmt));
        }
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

  // Section title based on active filter
  const filterTitle = useMemo(() => {
    if (activeFilter === 'all') return 'Collector Vault Catalogue';
    if (activeFilter === 'trending') return 'Trending Now';
    if (activeFilter === 'new') return 'New Arrivals';
    if (activeFilter === 'sale') return 'Special Offers & Sale';
    if (activeFilter === 'box_set') return 'Definitive Box Sets';
    if (activeFilter === 'format:4k') return '4K Ultra HD Editions';
    if (activeFilter === 'format:blu-ray') return 'Blu-ray Disc Cinema';
    if (activeFilter === 'format:dvd') return 'Standard DVD Editions';
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
    <div className="flex flex-col min-h-[calc(100vh-65px)] bg-[#F8F9FA] text-dark select-none">
      {/* Main Body Area: Desktop Sidebar + Content */}
      <div className="flex flex-1 relative">
        {/* Left Sidebar (Desktop Only) */}
        <div className="relative hidden md:block shrink-0 z-10 sticky top-[65px] h-[calc(100vh-65px)]">
          <SeriviaSidebar
            recentProducts={recentProducts}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />
        </div>

        {/* Mobile Slide-out Drawer with Brand Logo */}
        <SeriviaMobileDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          recentProducts={recentProducts}
          categories={categories}
          genres={genres}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden min-w-0">
          <div className="px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 max-w-[1680px]">
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
                  <div className="w-1.5 h-4 rounded-full bg-brand-blue" />
                  <h2 className="text-sm sm:text-base font-extrabold text-dark tracking-tight">
                    {filterTitle}
                  </h2>
                  <span className="text-[11px] font-semibold text-gray-500">
                    ({filteredProducts.length})
                  </span>
                </div>

                <Link
                  to={`/shop${activeFilter !== 'all' ? `?filter=${activeFilter}` : ''}`}
                  className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-brand-blue-hover transition-colors group cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Responsive Movie Grid */}
              <SeriviaMovieGrid products={filteredProducts} />
            </div>

            {/* Bottom spacer on mobile so navigation bar never obstructs content */}
            <div className="pb-20 md:pb-6" />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Matching brand theme) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200 flex items-center justify-around px-2 py-1.5 safe-area-inset-bottom shadow-2xl text-gray-500"
      >
        {/* Home */}
        <Link
          to="/"
          onClick={() => {
            setActiveFilter('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer',
            pathname === '/' && activeFilter === 'all'
              ? 'text-brand-blue font-bold'
              : 'text-gray-500 hover:text-dark'
          )}
        >
          <Home size={18} />
          <span>Home</span>
        </Link>

        {/* Browse / Catalogue */}
        <Link
          to="/shop"
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer',
            pathname.startsWith('/shop')
              ? 'text-brand-blue font-bold'
              : 'text-gray-500 hover:text-dark'
          )}
        >
          <Film size={18} />
          <span>Browse</span>
        </Link>

        {/* Favourites with Red Badge */}
        <Link
          to="/favourites"
          className={cn(
            'relative flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer',
            pathname.startsWith('/favourites')
              ? 'text-brand-blue font-bold'
              : 'text-gray-500 hover:text-dark'
          )}
        >
          <div className="relative">
            <Heart size={18} />
            {favourites.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] rounded-full bg-brand-red text-white text-[9px] font-extrabold flex items-center justify-center px-0.5 leading-none shadow">
                {favourites.length}
              </span>
            )}
          </div>
          <span>Saved</span>
        </Link>

        {/* Basket with Blue Badge */}
        <button
          type="button"
          onClick={openCartDrawer}
          className="relative flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold text-gray-500 hover:text-dark transition-colors cursor-pointer active:scale-95"
        >
          <div className="relative">
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] rounded-full bg-brand-blue text-white text-[9px] font-extrabold flex items-center justify-center px-0.5 leading-none shadow">
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
            'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer active:scale-95',
            mobileMenuOpen ? 'text-brand-blue font-bold' : 'text-gray-500 hover:text-dark'
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
