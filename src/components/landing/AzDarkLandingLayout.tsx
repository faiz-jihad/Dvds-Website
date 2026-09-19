import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Filter } from 'lucide-react';
import { Product, Category, Genre, StoreSettings } from '../../types';
import { useThemeStore } from '../../stores/useThemeStore';
import { AzCinematicHero } from './AzCinematicHero';
import { AzCategoryChips } from './AzCategoryChips';
import { AzMovieShelfRow } from './AzMovieShelfRow';
import { AzDvdMovieCard } from './AzDvdMovieCard';
import { AzCuratedCollectionBanner } from './AzCuratedCollectionBanner';
import { AzDirectorSpotlightBanner } from './AzDirectorSpotlightBanner';
import { cn } from '../../lib/formatters';

interface AzDarkLandingLayoutProps {
  products: Product[];
  categories: Category[];
  genres: Genre[];
  settings?: StoreSettings | null;
}

export const AzDarkLandingLayout: React.FC<AzDarkLandingLayoutProps> = ({
  products,
  categories,
  genres,
  settings,
}) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Active products pool
  const active = useMemo(() => products.filter((p) => p.status === 'active'), [products]);

  // Featured hero products
  const featured = useMemo(() => {
    const list = active.filter((p) => p.stock_quantity > 0);
    const highlighted = list.filter((p) => p.is_featured || p.is_best_seller || p.is_new_release);
    return (highlighted.length >= 2 ? highlighted : list).slice(0, 6);
  }, [active]);

  // Shelves data
  const shelfTrending = useMemo(
    () => active.filter((p) => p.is_best_seller || p.is_featured),
    [active]
  );
  const shelfNewReleases = useMemo(
    () => active.filter((p) => p.is_new_release),
    [active]
  );
  const shelfCriticallyAcclaimed = useMemo(
    () => active.filter((p) => (p.imdb_rating || 0) >= 7.5),
    [active]
  );
  const shelfTvSeries = useMemo(
    () =>
      active.filter(
        (p) =>
          p.format?.toLowerCase().includes('box') ||
          p.category?.slug?.includes('tv') ||
          p.title?.toLowerCase().includes('season')
      ),
    [active]
  );
  const shelfSale = useMemo(
    () => active.filter((p) => p.compare_at_price && p.compare_at_price > p.price),
    [active]
  );

  // Dynamic Genre Shelves
  const dynamicGenreShelves = useMemo(() => {
    return genres
      .map((g) => ({
        genre: g,
        products: active.filter((p) => p.genres?.some((pg) => pg.slug === g.slug)),
      }))
      .filter((s) => s.products.length > 0);
  }, [genres, active]);

  // Filtered view when user clicks a specific category chip
  const filteredProducts = useMemo(() => {
    switch (activeFilter) {
      case 'trending':
        return active.filter((p) => p.is_best_seller || p.is_featured);
      case 'new':
        return active.filter((p) => p.is_new_release);
      case 'box_set':
        return active.filter((p) => p.format?.toLowerCase().includes('box'));
      case 'sale':
        return active.filter((p) => p.compare_at_price && p.compare_at_price > p.price);
      default:
        if (activeFilter.startsWith('format:')) {
          const fmt = activeFilter.replace('format:', '').toLowerCase();
          return active.filter((p) => p.format?.toLowerCase().includes(fmt));
        }
        if (activeFilter.startsWith('genre:')) {
          const slug = activeFilter.replace('genre:', '');
          return active.filter((p) => p.genres?.some((g) => g.slug === slug));
        }
        return active;
    }
  }, [active, activeFilter]);

  const filterTitle = useMemo(() => {
    if (activeFilter === 'trending') return 'Trending & Top Rated';
    if (activeFilter === 'new') return 'New Arrivals & Fresh Pressings';
    if (activeFilter === 'box_set') return 'Definitive Collector Box Sets';
    if (activeFilter === 'sale') return 'Special Offers & Clearance Deals';
    if (activeFilter.startsWith('format:'))
      return `${activeFilter.replace('format:', '').toUpperCase()} Editions`;
    if (activeFilter.startsWith('genre:')) {
      const g = genres.find((gen) => gen.slug === activeFilter.replace('genre:', ''));
      return g ? `${g.name} Cinema` : 'Genre Titles';
    }
    return 'All Physical Media';
  }, [activeFilter, genres]);

  return (
    <div className="flex-1 min-w-0 flex flex-col select-none">
      {/* ── 1. Cinematic Hero Movie Section + Automatic Slider ── */}
      <AzCinematicHero products={featured} settings={settings} />

      {/* ── 3. Movie Category Section Chips ── */}
      <AzCategoryChips
        categories={categories}
        genres={genres}
        products={active}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* ── 4. Main Catalogue Body ── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-14">
        {/* If a specific filter is chosen, show a full grid of matching titles */}
        {activeFilter !== 'all' ? (
          <div className="space-y-6">
            <div className={cn('flex items-center justify-between pb-4 border-b', isDark ? 'border-white/10' : 'border-gray-200')}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue animate-pulse" />
                <h2 className={cn('text-xl sm:text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
                  {filterTitle}
                </h2>
                <span
                  className={cn(
                    'text-xs font-bold px-2.5 py-0.5 rounded-full',
                    isDark ? 'text-gray-400 bg-white/10' : 'text-gray-600 bg-gray-100'
                  )}
                >
                  {filteredProducts.length} titles
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={cn(
                  'text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer',
                  isDark
                    ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                )}
              >
                Clear Filter
              </button>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5">
                {filteredProducts.map((p) => (
                  <AzDvdMovieCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className={cn('py-16 text-center space-y-3', isDark ? 'text-gray-400' : 'text-gray-600')}>
                <p className="text-base font-bold">No physical editions match this filter.</p>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold cursor-pointer"
                >
                  Return to All Titles
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Default Rich Multi-Shelf Cinema Catalogue */
          <div className="space-y-12 sm:space-y-16">
            {/* Shelf 1: Trending Now & Best Sellers */}
            {shelfTrending.length > 0 && (
              <AzMovieShelfRow
                badge="TOP 10 CHART"
                title="Trending Now &amp; Best Sellers"
                products={shelfTrending}
                viewAllHref="/shop?filter=trending"
              />
            )}

            {/* ── Director Spotlight Showcase Module (Configured in Storefront Settings) ── */}
            <AzDirectorSpotlightBanner settings={settings || null} products={active} />

            {/* Shelf 2: Fresh From The Vault */}
            {shelfNewReleases.length > 0 && (
              <AzMovieShelfRow
                badge="NEW ARRIVALS"
                title="Fresh From The Vault"
                products={shelfNewReleases}
                viewAllHref="/shop?filter=new"
              />
            )}

            {/* Shelf 3: Critically Acclaimed Masterpieces */}
            {shelfCriticallyAcclaimed.length > 0 && (
              <AzMovieShelfRow
                badge="CRITIC'S VAULT"
                title="Critically Acclaimed Masterpieces"
                products={shelfCriticallyAcclaimed}
                viewAllHref="/shop"
              />
            )}

            {/* ── 5. Curated Box Set Showcase Section (Visual Break) ── */}
            <AzCuratedCollectionBanner products={active} />

            {/* Shelf 4: TV Series & Complete Seasons */}
            {shelfTvSeries.length > 0 && (
              <AzMovieShelfRow
                badge="TELEVISION SAGAS"
                title="Complete TV Series Box Sets"
                products={shelfTvSeries}
                viewAllHref="/shop?format=box-set"
              />
            )}

            {/* Shelf 5: Dynamic Genre Shelves */}
            {dynamicGenreShelves.map(({ genre, products: gProducts }) => (
              <AzMovieShelfRow
                key={genre.id}
                badge="GENRE ARCHIVE"
                title={`${genre.name} Cinema`}
                products={gProducts}
                viewAllHref={`/shop?genre=${genre.slug}`}
              />
            ))}

            {/* Shelf 6: Special Offers & Clearance */}
            {shelfSale.length > 0 && (
              <AzMovieShelfRow
                badge="CLEARANCE SALE"
                title="Special Offers &amp; Limited Discs"
                products={shelfSale}
                viewAllHref="/shop?filter=sale"
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};
export default AzDarkLandingLayout;
