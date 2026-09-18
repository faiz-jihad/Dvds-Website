import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SeriviaSidebar } from './SeriviaSidebar';
import { SeriviaHeroBanner } from './SeriviaHeroBanner';
import { SeriviaGenreFilter } from './SeriviaGenreFilter';
import { SeriviaMovieGrid } from './SeriviaMovieGrid';
import { SeriviaShelfRow } from './SeriviaShelfRow';
import { SeriviaTop10Row } from './SeriviaTop10Row';
import { SeriviaSpotlightBanner } from './SeriviaSpotlightBanner';
import { SeriviaFormatVault } from './SeriviaFormatVault';
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

  // Recent products shown in sidebar vault highlights
  const recentProducts = useMemo(
    () => products.filter((p) => p.status === 'active').slice(0, 4),
    [products]
  );

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

  // Active products pool
  const active = useMemo(() => products.filter((p) => p.status === 'active'), [products]);

  // Filtered products for the main movie grid when a filter is chosen
  const filteredProducts = useMemo(() => {
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
  }, [active, activeFilter]);

  // Section title based on active filter
  const filterTitle = useMemo(() => {
    if (activeFilter === 'all') return 'Full Catalogue';
    if (activeFilter === 'trending') return 'Top Chart & Trending';
    if (activeFilter === 'new') return 'Fresh Arrivals';
    if (activeFilter === 'sale') return 'Special Offers & Clearance';
    if (activeFilter === 'box_set') return 'Definitive Box Sets';
    if (activeFilter === 'format:4k') return '4K Ultra HD Editions';
    if (activeFilter === 'format:blu-ray') return 'Blu-ray Disc Cinema';
    if (activeFilter === 'format:dvd') return 'Standard DVD Editions';
    if (activeFilter.startsWith('genre:')) {
      const g = genres.find((item) => `genre:${item.slug}` === activeFilter);
      return g ? `${g.name} Collection` : 'Genre Collection';
    }
    if (activeFilter.startsWith('cat:')) {
      const c = categories.find((item) => `cat:${item.slug}` === activeFilter);
      return c ? `${c.name} Collection` : 'Category';
    }
    return 'Films & Editions';
  }, [activeFilter, genres, categories]);

  // ── Curated Data Sets for Editorial Homepage ──
  const shelfTop10 = useMemo(
    () => active.filter((p) => p.is_best_seller || p.is_featured).slice(0, 10),
    [active]
  );

  const shelfNewReleases = useMemo(
    () => active.filter((p) => p.is_new_release),
    [active]
  );

  const shelfSale = useMemo(
    () => active.filter((p) => p.compare_at_price && p.compare_at_price > p.price),
    [active]
  );

  const shelfBoxSets = useMemo(
    () => active.filter((p) => p.format?.toLowerCase().includes('box')),
    [active]
  );

  const shelfTopRated = useMemo(
    () =>
      active
        .filter((p) => p.imdb_rating && p.imdb_rating >= 7.6)
        .sort((a, b) => (b.imdb_rating ?? 0) - (a.imdb_rating ?? 0)),
    [active]
  );

  // Spotlight Product: Dynamically select high-rated Box Set or featured title from DB
  const spotlightProduct = useMemo(() => {
    const boxSet = active.find((p) => p.format?.toLowerCase().includes('box') && p.is_featured);
    if (boxSet) return boxSet;
    const topRated = active.find((p) => (p.imdb_rating ?? 0) >= 8.0 && p.stock_quantity > 0);
    if (topRated) return topRated;
    return active[0];
  }, [active]);

  // Dynamic Genre Shelves (Only genres with active products in database)
  const dynamicGenreShelves = useMemo(() => {
    return genres
      .map((g) => ({
        genre: g,
        products: active.filter((p) => p.genres?.some((pg) => pg.slug === g.slug)),
      }))
      .filter((s) => s.products.length > 0);
  }, [genres, active]);

  // Dynamic Category Shelves (Only active categories with products)
  const dynamicCategoryShelves = useMemo(() => {
    return categories
      .filter((c) => c.is_active)
      .map((c) => ({
        category: c,
        products: active.filter((p) => p.category?.slug === c.slug),
      }))
      .filter((s) => s.products.length > 0);
  }, [categories, active]);

  const showShelves = activeFilter === 'all';

  return (
    <div className="flex flex-col min-h-[calc(100vh-65px)] bg-[#F8FAFC] text-dark select-none">
      <div className="flex flex-1 relative">
        {/* Sticky Desktop Sidebar */}
        <div className="hidden md:block shrink-0 z-10 sticky top-[65px] h-[calc(100vh-65px)]">
          <SeriviaSidebar
            recentProducts={recentProducts}
            categories={categories}
            genres={genres}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />
        </div>

        {/* Main Content Area: Cinematic Full-Width */}
        <main className="flex-1 w-full overflow-x-hidden min-w-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-7 sm:space-y-10 max-w-[1600px] mx-auto">
            {/* Featured Hero Banner Carousel */}
            <SeriviaHeroBanner products={featuredProducts} />

            {/* Dynamic Horizontal Category & Genre Chip Scroller */}
            <SeriviaGenreFilter
              categories={categories}
              genres={genres}
              products={products}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />

            {/* ── When a specific filter is chosen: Show Full Grid ── */}
            {!showShelves && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-blue" />
                    <h2 className="text-base sm:text-lg font-black text-dark tracking-tight">
                      {filterTitle}
                    </h2>
                    <span className="text-xs font-bold text-gray-400 bg-gray-150 px-2 py-0.5 rounded-full">
                      {filteredProducts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="text-xs font-bold text-gray-500 hover:text-dark transition-colors cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
                <SeriviaMovieGrid products={filteredProducts} />
              </div>
            )}

            {/* ── "All Titles" View: Dynamic Data-Driven Cinema Layout ── */}
            {showShelves && (
              <div className="space-y-9 sm:space-y-12">
                {/* 1. Official UK Top 10 Ranked Row (Only if best sellers or featured exist) */}
                {shelfTop10.length > 0 && <SeriviaTop10Row products={shelfTop10} />}

                {/* 2. Fresh From The Vault (Only if new releases exist) */}
                {shelfNewReleases.length > 0 && (
                  <SeriviaShelfRow
                    badge="NEW ARRIVALS"
                    title="Fresh From The Vault"
                    subtitle="Latest physical releases added to the archive"
                    products={shelfNewReleases}
                    viewAllHref="/shop?filter=new"
                  />
                )}

                {/* 3. Curator's Spotlight Feature */}
                {spotlightProduct && (
                  <SeriviaSpotlightBanner product={spotlightProduct} />
                )}

                {/* 4. Physical Media Hub (Dynamic format cards derived from real products) */}
                <SeriviaFormatVault
                  products={active}
                  onSelectFilter={setActiveFilter}
                />

                {/* 5. Critically Acclaimed Cinema (IMDb 7.6+) */}
                {shelfTopRated.length > 0 && (
                  <SeriviaShelfRow
                    badge="CRITIC'S VAULT"
                    title="Critically Acclaimed Masterpieces"
                    subtitle="Certified high-rated cinema & award-winning stories"
                    products={shelfTopRated}
                    viewAllHref="/shop"
                  />
                )}

                {/* 6. Dynamic Genre Shelves (All genres from DB that have products) */}
                {dynamicGenreShelves.map(({ genre, products: gProducts }) => (
                  <SeriviaShelfRow
                    key={genre.id}
                    badge="GENRE COLLECTION"
                    title={`${genre.name} Cinema`}
                    subtitle={`Explore physical releases in ${genre.name}`}
                    products={gProducts}
                    viewAllHref={`/shop?filter=genre:${genre.slug}`}
                  />
                ))}

                {/* 7. Dynamic Category Shelves (All active categories with products) */}
                {dynamicCategoryShelves.map(({ category, products: cProducts }) => (
                  <SeriviaShelfRow
                    key={category.id}
                    badge="CATEGORY"
                    title={category.name}
                    subtitle={category.description || `Browse the ${category.name} archive`}
                    products={cProducts}
                    viewAllHref={`/shop?filter=cat:${category.slug}`}
                  />
                ))}

                {/* 8. Collector's Box Sets (Only if Box Set products exist) */}
                {shelfBoxSets.length > 0 && (
                  <SeriviaShelfRow
                    badge="PRESTIGE EDITIONS"
                    title="Definitive Box Sets & Anthologies"
                    subtitle="Complete series, sagas & collector multi-disc editions"
                    products={shelfBoxSets}
                    viewAllHref="/shop?format=box-set"
                  />
                )}

                {/* 9. Special Offers & Limited Stock (Only if sale products exist) */}
                {shelfSale.length > 0 && (
                  <SeriviaShelfRow
                    badge="SPECIAL CLEARANCE"
                    title="Special Offers & Discounts"
                    subtitle="Discounted physical titles with limited stock remaining"
                    products={shelfSale}
                    viewAllHref="/shop?filter=sale"
                  />
                )}

                {/* 10. The Full Catalogue (Editorial Grid Teaser) */}
                {active.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-end justify-between mb-4 px-1">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          VAULT ARCHIVE
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-dark tracking-tight">
                          Explore Full Catalogue
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Browse all {active.length} physical editions in the store
                        </p>
                      </div>
                      <Link
                        to="/shop"
                        className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-brand-blue-hover transition-colors group"
                      >
                        <span>Browse all {active.length}</span>
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                    <SeriviaMovieGrid products={active.slice(0, 12)} />
                  </div>
                )}
              </div>
            )}

            {/* Bottom spacer for mobile navigation bar clearance */}
            <div className="pb-24 md:pb-8" />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SeriviaHomeLayout;
