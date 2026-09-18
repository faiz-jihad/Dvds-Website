import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SeriviaSidebar } from './SeriviaSidebar';
import { SeriviaTopNav } from './SeriviaTopNav';
import { SeriviaHeroBanner } from './SeriviaHeroBanner';
import { SeriviaGenreFilter } from './SeriviaGenreFilter';
import { SeriviaMovieGrid } from './SeriviaMovieGrid';
import { Product, Category, Genre } from '../../types';
import { ArrowRight } from 'lucide-react';

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
  const [activeFilter, setActiveFilter] = useState('all');

  // Featured products: prefer featured, fallback to all in-stock
  const featuredProducts = useMemo(() => {
    const featured = products.filter((p) => p.is_featured && p.status === 'active' && p.stock_quantity > 0);
    return featured.length >= 2 ? featured : products.filter((p) => p.status === 'active' && p.stock_quantity > 0).slice(0, 5);
  }, [products]);

  // Recent products shown in sidebar vault highlights
  const recentProducts = useMemo(
    () => products.filter((p) => p.status === 'active').slice(0, 3),
    [products]
  );

  // Filtered grid products
  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.status === 'active');
    switch (activeFilter) {
      case 'trending':
        return active.filter((p) => p.is_best_seller || p.is_featured).slice(0, 36);
      case 'new':
        return active.filter((p) => p.is_new_release).slice(0, 36);
      case 'sale':
        return active.filter((p) => p.compare_at_price && p.compare_at_price > p.price).slice(0, 36);
      case 'box_set':
        return active.filter((p) => p.format === 'Box Set').slice(0, 36);
      default:
        if (activeFilter.startsWith('genre:')) {
          const slug = activeFilter.replace('genre:', '');
          return active.filter((p) => p.genres?.some((g) => g.slug === slug)).slice(0, 36);
        }
        if (activeFilter.startsWith('cat:')) {
          const slug = activeFilter.replace('cat:', '');
          return active.filter((p) => p.category?.slug === slug).slice(0, 36);
        }
        return active.slice(0, 48);
    }
  }, [products, activeFilter]);

  return (
    <div className="flex flex-col h-screen bg-[#09090e] text-white overflow-hidden">
      {/* Top Navigation */}
      <SeriviaTopNav />

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — hidden on mobile */}
        <div className="relative hidden md:block shrink-0">
          <SeriviaSidebar
            recentProducts={recentProducts}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        </div>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px]">

            {/* Hero Banner Carousel */}
            <SeriviaHeroBanner products={featuredProducts} />

            {/* Genre / Filter Pills */}
            <SeriviaGenreFilter
              categories={categories}
              genres={genres}
              products={products}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />

            {/* Movie Grid Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white/80 tracking-tight">
                  {activeFilter === 'all' && 'Entire Collection'}
                  {activeFilter === 'trending' && 'Trending Now'}
                  {activeFilter === 'new' && 'New Releases'}
                  {activeFilter === 'sale' && 'On Sale'}
                  {activeFilter === 'box_set' && 'Box Sets'}
                  {activeFilter.startsWith('genre:') && genres.find((g) => `genre:${g.slug}` === activeFilter)?.name}
                  {activeFilter.startsWith('cat:') && categories.find((c) => `cat:${c.slug}` === activeFilter)?.name}
                </h2>
                <Link
                  to={`/shop${activeFilter !== 'all' ? `?filter=${activeFilter}` : ''}`}
                  className="flex items-center gap-1 text-xs text-white/35 hover:text-white/70 transition-colors group"
                >
                  View All
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <SeriviaMovieGrid products={filteredProducts} />
            </div>

            {/* Bottom padding for mobile nav */}
            <div className="pb-16 md:pb-4" />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0d0f14]/95 backdrop-blur-xl border-t border-white/[0.07] flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {[
          { label: 'Home', href: '/', icon: '⌂' },
          { label: 'Favourites', href: '/favourites', icon: '♡' },
          { label: 'Browse', href: '/shop', icon: '⊞' },
          { label: 'Account', href: '/account/profile', icon: '◯' },
        ].map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-white/40 hover:text-white/80 transition-colors"
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default SeriviaHomeLayout;
