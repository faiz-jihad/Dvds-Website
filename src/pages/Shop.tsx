import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, X, RotateCcw, Tag, Flame, Sparkles, ArrowRight } from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/common/Button';
import { publicApi } from '../lib/publicApi';
import { formatGBP } from '../lib/formatters';
import { StoreDataState } from '../components/common/StoreDataState';
import { Seo } from '../components/common/Seo';
import { ExclusiveCampaignBanner } from '../components/shop/ExclusiveCampaignBanner';

export const Shop: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Read URL parameters
  const selectedCategory = searchParams.get('category') || 'all';
  const selectedGenre = searchParams.get('genre') || 'all';
  const selectedFormat = searchParams.get('format') || 'all';
  const selectedRating = searchParams.get('rating') || 'all';
  const filterType = searchParams.get('filter') || 'all'; // new, bestseller, sale
  const sort = searchParams.get('sort') || 'featured';
  const maxPriceParam = searchParams.get('maxPrice');
  const [maxPrice, setMaxPrice] = useState<number | null>(maxPriceParam ? Number(maxPriceParam) : null);

  const productsQuery = useQuery({ queryKey: ['store', 'products'], queryFn: () => publicApi.getProducts() });
  const categoriesQuery = useQuery({ queryKey: ['store', 'categories'], queryFn: () => publicApi.getCategories() });
  const genresQuery = useQuery({ queryKey: ['store', 'genres'], queryFn: () => publicApi.getGenres() });
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => publicApi.getStoreSettings() });
  const categories = categoriesQuery.data || [];
  const genres = genresQuery.data || [];
  const allProducts = productsQuery.data || [];
  const storeSettings = settingsQuery.data;

  // Formats from dynamic admin storeSettings custom_formats + existing products
  const availableFormats = useMemo(() => {
    const custom = storeSettings?.custom_formats || [];
    const fromProducts = allProducts.map((product) => product.format);
    return Array.from(new Set([...custom, ...fromProducts].filter(Boolean))).sort();
  }, [storeSettings?.custom_formats, allProducts]);

  const availableRatings = Array.from(new Set(allProducts.map((product) => product.age_rating))).sort();
  const catalogueMinPrice = allProducts.length ? Math.floor(Math.min(...allProducts.map((product) => product.price))) : 0;
  const catalogueMaxPrice = allProducts.length ? Math.ceil(Math.max(...allProducts.map((product) => product.price))) : 0;

  // Active Deal of the Day product
  const dealProduct = useMemo(() => {
    if (!storeSettings?.deal_product_id) return null;
    return allProducts.find((p) => p.id === storeSettings.deal_product_id) || null;
  }, [allProducts, storeSettings?.deal_product_id]);

  useEffect(() => {
    if (maxPrice === null && catalogueMaxPrice > 0) setMaxPrice(catalogueMaxPrice);
  }, [catalogueMaxPrice, maxPrice]);

  // Sync param updates
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
    setMaxPrice(catalogueMaxPrice);
  };

  // Active Filter Details for Clear Heading
  const activeGenre = genres.find((g) => g.slug === selectedGenre || g.id === selectedGenre);
  const activeCategory = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
  const isSpecialOffers = filterType === 'sale';
  const isNewReleases = filterType === 'new';
  const isBestSellers = filterType === 'bestseller';

  let pageEyebrow = 'DVD ZONE Catalogue';
  let pageTitle = 'Explore Our Complete Store';
  let pageDescription = 'Browse all products, physical media, collectibles, and special editions with 100% free delivery across the UK.';

  if (isSpecialOffers) {
    pageEyebrow = storeSettings?.campaign_badge || 'Exclusive Campaign';
    pageTitle = storeSettings?.campaign_title || 'Special Offers & Deals';
    pageDescription = storeSettings?.campaign_tagline || 'Limited-time discounts, product markdowns, and special offers with Royal Mail tracked UK dispatch.';
  } else if (activeGenre) {
    pageEyebrow = 'Collection';
    pageTitle = `${activeGenre.name} Collection`;
    pageDescription = `Explore our curated products and editions in ${activeGenre.name}.`;
  } else if (activeCategory) {
    pageEyebrow = 'Category';
    pageTitle = activeCategory.name;
    pageDescription = activeCategory.description || `Browse complete ${activeCategory.name} products and editions.`;
  } else if (isNewReleases) {
    pageEyebrow = 'Fresh Arrivals';
    pageTitle = 'New Arrivals & Releases';
    pageDescription = 'Discover the newest additions to our catalogue with 100% free UK delivery.';
  } else if (isBestSellers) {
    pageEyebrow = 'Customer Favorites';
    pageTitle = 'Best Selling Products';
    pageDescription = 'Our most popular products, merchandise, and top picks across the UK.';
  }

  // Derived counts for genres & deals
  const saleCount = useMemo(() => {
    return allProducts.filter((p) => p.status === 'active' && p.compare_at_price && p.compare_at_price > p.price).length;
  }, [allProducts]);

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach((p) => {
      if (p.status === 'active' && p.genres) {
        p.genres.forEach((g) => {
          if (g.slug) counts[g.slug] = (counts[g.slug] || 0) + 1;
        });
      }
    });
    return counts;
  }, [allProducts]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((product) => {
        // Status check
        if (product.status !== 'active') return false;

        // Category filter
        if (selectedCategory !== 'all') {
          const cat = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
          if (cat) {
            const matchesId = product.category_id === cat.id || product.category?.id === cat.id;
            const matchesSlug = product.category?.slug === cat.slug || product.category?.slug === selectedCategory;
            if (!matchesId && !matchesSlug) return false;
          }
        }

        // Genre filter
        if (selectedGenre !== 'all') {
          const hasGenre = product.genres?.some(
            (g) => g.slug === selectedGenre || g.id === selectedGenre || g.name.toLowerCase() === selectedGenre.toLowerCase()
          );
          if (!hasGenre) return false;
        }

        // Format filter
        if (selectedFormat !== 'all' && product.format !== selectedFormat) {
          return false;
        }

        // Age rating
        if (selectedRating !== 'all' && product.age_rating !== selectedRating) {
          return false;
        }

        // Preset filter badge
        if (filterType === 'new' && !product.is_new_release) return false;
        if (filterType === 'bestseller' && !product.is_best_seller) return false;
        if (filterType === 'sale' && (!product.compare_at_price || product.compare_at_price <= product.price)) return false;

        // Price filter
        if (maxPrice !== null && product.price > maxPrice) return false;

        return true;
      })
      .sort((a, b) => {
        if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sort === 'price-low') return a.price - b.price;
        if (sort === 'price-high') return b.price - a.price;
        if (sort === 'year') return b.release_year - a.release_year;
        return 0; // featured default
      });
  }, [allProducts, selectedCategory, selectedGenre, selectedFormat, selectedRating, filterType, maxPrice, sort, categories]);

  if (productsQuery.isLoading || categoriesQuery.isLoading || genresQuery.isLoading || productsQuery.error || categoriesQuery.error || genresQuery.error) {
    return <StoreDataState loading={productsQuery.isLoading || categoriesQuery.isLoading || genresQuery.isLoading} error={productsQuery.error || categoriesQuery.error || genresQuery.error} retry={() => { productsQuery.refetch(); categoriesQuery.refetch(); genresQuery.refetch(); }} />;
  }

  const categoryParam = selectedCategory !== 'all' ? selectedCategory : null;

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-6 sm:py-10 transition-colors">
      <Seo
        title={`${pageTitle} — DVDs Zone UK | Buy Physical Media`}
        description={`${pageDescription} All orders 100% free standard delivery across United Kingdom. Same-day dispatch, delivered to your door within 2 working days via Royal Mail.`}
        keywords={`${pageTitle}, buy DVDs online UK, physical media catalogue, TV box sets UK, cheap DVDs UK, classic movies on DVD, DVDs Zone`}
        canonicalPath={categoryParam ? `/shop?category=${encodeURIComponent(categoryParam)}` : '/shop'}
        image="/catalog/the-mandalorian-seasons-1-3.jpeg"
        siteName="DVDs Zone"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: pageTitle,
            description: pageDescription,
            url: 'https://dvdszone.co.uk/shop',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: filteredProducts.length,
              itemListElement: filteredProducts.slice(0, 20).map((prod, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                name: prod.title,
                url: `https://dvdszone.co.uk/product/${prod.slug}`,
                image: `https://dvdszone.co.uk${prod.cover_image_url}`,
              })),
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://dvdszone.co.uk/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Catalogue',
                item: 'https://dvdszone.co.uk/shop',
              },
              ...(categoryParam
                ? [
                    {
                      '@type': 'ListItem',
                      position: 3,
                      name: pageTitle,
                      item: `https://dvdszone.co.uk/shop?category=${encodeURIComponent(categoryParam)}`,
                    },
                  ]
                : []),
            ],
          },
        ]}
      />
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Editorial Page Header */}
        <div className="pb-8 mb-6 border-b border-gray-200 dark:border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
              {pageEyebrow}
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-dark dark:text-white tracking-tight mt-1">
              {pageTitle}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-lg">
              {pageDescription} ({filteredProducts.length} editions found)
            </p>
          </div>

          {/* Sort dropdown & Mobile filter button */}
          <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 md:flex md:w-auto md:gap-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden flex min-h-11 items-center gap-2 px-3.5 py-2 bg-gray-100 dark:bg-[#141A26] text-dark dark:text-white border border-gray-200 dark:border-white/10 rounded-md text-xs font-semibold"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">Sort:</span>
              <select
                value={sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="min-h-11 min-w-0 w-full bg-white dark:bg-[#141A26] border border-gray-200 dark:border-white/15 rounded-md px-2 py-2 text-xs font-medium text-dark dark:text-white focus:outline-none focus:border-brand-blue sm:px-3 md:w-auto"
              >
                <option value="featured">Featured Curations</option>
                <option value="newest">Newly Added</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="year">Release Year (Decade)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {(isSpecialOffers || activeGenre || activeCategory || selectedFormat !== 'all' || selectedRating !== 'all') && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
            {isSpecialOffers && (
              <button
                type="button"
                onClick={() => updateFilter('filter', 'all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-brand-red border border-red-200 font-semibold transition cursor-pointer"
                title="Remove special offers filter"
              >
                <Tag className="w-3 h-3" />
                <span>Special Offers</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {activeGenre && (
              <button
                type="button"
                onClick={() => updateFilter('genre', 'all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#141A26] hover:bg-gray-100 dark:hover:bg-white/10 text-dark dark:text-white border border-gray-200 dark:border-white/10 font-medium transition cursor-pointer"
                title="Remove genre filter"
              >
                <span>Genre: {activeGenre.name}</span>
                <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            {activeCategory && (
              <button
                type="button"
                onClick={() => updateFilter('category', 'all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#141A26] hover:bg-gray-100 dark:hover:bg-white/10 text-dark dark:text-white border border-gray-200 dark:border-white/10 font-medium transition cursor-pointer"
                title="Remove category filter"
              >
                <span>Category: {activeCategory.name}</span>
                <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            {selectedFormat !== 'all' && (
              <button
                type="button"
                onClick={() => updateFilter('format', 'all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#141A26] hover:bg-gray-100 dark:hover:bg-white/10 text-dark dark:text-white border border-gray-200 dark:border-white/10 font-medium transition cursor-pointer"
                title="Remove format filter"
              >
                <span>Format: {selectedFormat}</span>
                <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            {selectedRating !== 'all' && (
              <button
                type="button"
                onClick={() => updateFilter('rating', 'all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#141A26] hover:bg-gray-100 dark:hover:bg-white/10 text-dark dark:text-white border border-gray-200 dark:border-white/10 font-medium transition cursor-pointer"
                title="Remove rating filter"
              >
                <span>BBFC: {selectedRating}</span>
                <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white underline cursor-pointer ml-1 font-medium transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {showMobileFilters && (
          <aside className="mb-7 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-4 shadow-xs md:hidden">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-blue" />
                <span className="font-display text-sm font-bold text-dark">Catalogue filters</span>
              </div>
              <button type="button" onClick={() => setShowMobileFilters(false)} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-500 hover:bg-white cursor-pointer" aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Mobile Special Offers button */}
              <div>
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Promotions</span>
                <button
                  type="button"
                  onClick={() => updateFilter('filter', isSpecialOffers ? 'all' : 'sale')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    isSpecialOffers
                      ? 'bg-gradient-to-r from-amber-500/15 to-red-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Flame className={`w-3.5 h-3.5 ${isSpecialOffers ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-brand-red'}`} />
                    <span>{storeSettings?.campaign_badge || 'Special Offers & Deals'}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {storeSettings?.campaign_discount_text && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                        {storeSettings.campaign_discount_text}
                      </span>
                    )}
                    <span className="text-[10px] bg-brand-red text-white px-2 py-0.5 rounded-full font-bold uppercase">
                      {saleCount}
                    </span>
                  </div>
                </button>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Genre</span>
                <select value={selectedGenre} onChange={(event) => updateFilter('genre', event.target.value)} className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-dark focus:border-brand-blue focus:outline-none">
                  <option value="all">All genres</option>
                  {genres.map((genre) => <option key={genre.id} value={genre.slug}>{genre.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Category</span>
                <select value={selectedCategory} onChange={(event) => updateFilter('category', event.target.value)} className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-dark focus:border-brand-blue focus:outline-none">
                  <option value="all">All categories</option>
                  {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                </select>
              </label>

              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Media format</span>
                <div className="flex flex-wrap gap-2">
                  {['all', ...availableFormats].map((format) => <button type="button" key={format} onClick={() => updateFilter('format', format)} className={`min-h-11 rounded-md border px-3 text-xs font-semibold cursor-pointer ${selectedFormat === format ? 'border-brand-blue bg-brand-blue text-white' : 'border-gray-200 bg-white text-dark'}`}>{format === 'all' ? 'All formats' : format}</button>)}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-600">BBFC rating</span>
                <div className="flex flex-wrap gap-2">
                  {['all', ...availableRatings].map((rating) => <button type="button" key={rating} onClick={() => updateFilter('rating', rating)} className={`min-h-11 min-w-11 rounded-md border px-3 text-xs font-mono font-semibold cursor-pointer ${selectedRating === rating ? 'border-dark bg-dark text-white' : 'border-gray-200 bg-white text-dark'}`}>{rating === 'all' ? 'Any' : rating}</button>)}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-600"><span>Maximum price</span><strong className="font-mono text-dark">{formatGBP(maxPrice ?? catalogueMaxPrice)}</strong></span>
                <input type="range" min={catalogueMinPrice} max={Math.max(catalogueMinPrice + 1, catalogueMaxPrice)} step="1" value={maxPrice ?? catalogueMaxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="h-11 w-full accent-brand-blue" />
              </label>

              <div className="grid grid-cols-2 gap-2 border-t border-gray-200 pt-4">
                <Button type="button" variant="secondary" onClick={resetFilters}><RotateCcw className="h-4 w-4" />Reset</Button>
                <Button type="button" onClick={() => setShowMobileFilters(false)}>Show {filteredProducts.length}</Button>
              </div>
            </div>
          </aside>
        )}

        {/* Content Layout: Left Sidebar Filters + Right Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Sidebar (Desktop) */}
          <aside className="hidden md:block md:col-span-3 space-y-8 pr-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="font-display font-bold text-sm text-dark uppercase tracking-wider">
                Filters
              </span>
              {(selectedCategory !== 'all' || selectedGenre !== 'all' || selectedFormat !== 'all' || selectedRating !== 'all' || filterType !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-brand-red hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Special Offers & Promotions Card */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Exclusive Campaign
                </h4>
                {storeSettings?.campaign_discount_text && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {storeSettings.campaign_discount_text}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => updateFilter('filter', isSpecialOffers ? 'all' : 'sale')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  isSpecialOffers
                    ? 'bg-gradient-to-r from-amber-500/15 via-red-500/15 to-transparent text-amber-800 dark:text-amber-300 border-amber-500/50 shadow-md font-bold'
                    : 'bg-white dark:bg-[#0E131F] hover:bg-amber-500/5 dark:hover:bg-amber-500/10 text-gray-700 dark:text-gray-300 hover:text-amber-600 border-gray-200 dark:border-white/10 hover:border-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Flame className={`w-4 h-4 shrink-0 ${isSpecialOffers ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-amber-500'}`} />
                  <div className="text-left">
                    <span className="block leading-tight font-semibold">
                      {storeSettings?.campaign_title || 'Special Offers & Deals'}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-normal mt-0.5">
                      {storeSettings?.campaign_badge || 'Limited Boutique Archive'}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                  isSpecialOffers
                    ? 'bg-brand-red text-white'
                    : 'bg-red-50 dark:bg-red-950/40 text-brand-red border border-red-200 dark:border-red-800/40'
                }`}>
                  {saleCount} Deals
                </span>
              </button>
            </div>

            {/* Curated Genres & Tags Filter */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Genres &amp; Tags
                </h4>
                {selectedGenre !== 'all' && (
                  <button
                    type="button"
                    onClick={() => updateFilter('genre', 'all')}
                    className="text-[11px] text-brand-blue dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => updateFilter('genre', 'all')}
                  className={`flex items-center justify-between w-full text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                    selectedGenre === 'all'
                      ? 'bg-gray-100 dark:bg-white/10 text-dark dark:text-white font-bold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>All Genres &amp; Tags</span>
                  <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.2 rounded ${
                    selectedGenre === 'all' ? 'bg-dark dark:bg-white/20 text-white' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {allProducts.filter((p) => p.status === 'active').length}
                  </span>
                </button>
                {genres.map((g) => {
                  const count = genreCounts[g.slug] || 0;
                  const isSelected = selectedGenre === g.slug || selectedGenre === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => updateFilter('genre', isSelected ? 'all' : g.slug)}
                      className={`flex items-center justify-between w-full text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-white/10 text-dark dark:text-white font-bold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate pr-2">{g.name}</span>
                      {count > 0 && (
                        <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-dark dark:bg-white/20 text-white' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3">
                Category
              </h4>
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => updateFilter('category', 'all')}
                  className={`block w-full text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'all' ? 'font-bold text-dark dark:text-white bg-gray-100 dark:bg-white/10' : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateFilter('category', c.slug)}
                    className={`block w-full text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                      selectedCategory === c.slug ? 'font-bold text-dark dark:text-white bg-gray-100 dark:bg-white/10' : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Filter */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3">
                Format / Type
              </h4>
              <div className="flex flex-wrap gap-2">
                {['all', ...availableFormats].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => updateFilter('format', fmt)}
                    className={`text-xs px-2.5 py-1.5 rounded-sm border font-medium transition-colors cursor-pointer ${
                      selectedFormat === fmt
                        ? 'bg-dark dark:bg-brand-blue text-white border-dark dark:border-brand-blue font-bold'
                        : 'bg-white dark:bg-[#0E131F] text-dark dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-dark dark:hover:border-white/30'
                    }`}
                  >
                    {fmt === 'all' ? 'All Formats' : fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* BBFC Age Rating Filter */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3">
                Age Rating / BBFC
              </h4>
              <div className="flex flex-wrap gap-2">
                {['all', ...availableRatings].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => updateFilter('rating', rating)}
                    className={`text-xs px-2.5 py-1 rounded-sm border font-mono transition-colors ${
                      selectedRating === rating
                        ? 'bg-dark dark:bg-brand-blue text-white border-dark dark:border-brand-blue'
                        : 'bg-white dark:bg-[#0E131F] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-dark dark:hover:border-white/30'
                    }`}
                  >
                    {rating === 'all' ? 'Any' : rating}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div>
              <div className="flex justify-between items-center mb-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Max Price</span>
                <span className="font-mono font-bold text-dark dark:text-white">{formatGBP(maxPrice ?? catalogueMaxPrice)}</span>
              </div>
              <input
                type="range"
                min={catalogueMinPrice}
                max={Math.max(catalogueMinPrice + 1, catalogueMaxPrice)}
                step="1"
                value={maxPrice ?? catalogueMaxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-blue cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
                <span>{formatGBP(catalogueMinPrice)}</span>
                <span>{formatGBP(catalogueMaxPrice)}</span>
              </div>
            </div>
          </aside>

          {/* Right Main Grid */}
          <main className="col-span-1 md:col-span-9">
            {/* Exclusive Campaign Hero Banner on Special Offers */}
            {isSpecialOffers && (
              <ExclusiveCampaignBanner
                settings={storeSettings}
                dealProduct={dealProduct}
                saleCount={saleCount}
              />
            )}

            {/* Campaign Teaser Strip when browsing catalogue generally */}
            {!isSpecialOffers && (storeSettings?.campaign_is_active ?? true) && saleCount > 0 && (
              <div
                onClick={() => updateFilter('filter', 'sale')}
                className="mb-6 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-red-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-500/50 transition shadow-xs group"
                role="button"
                tabIndex={0}
                aria-label="View exclusive campaign deals"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                    <Flame className="w-4 h-4 animate-pulse" />
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {storeSettings?.campaign_badge || 'EXCLUSIVE CAMPAIGN'}
                      </span>
                      <span className="text-xs font-bold text-dark dark:text-white truncate">
                        {storeSettings?.campaign_title || "Collector's Vault Special"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                      {storeSettings?.campaign_discount_text || 'Up to 50% OFF'} • {saleCount} curated deals available with free UK delivery
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform">
                  <span>Explore Deals</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-[#0E131F] rounded-lg border border-gray-200 dark:border-white/10 p-8 shadow-xs">
                <p className="font-display font-bold text-lg text-dark dark:text-white mb-1">
                  No DVD titles match these filters
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                  Try adjusting your price range or clearing category filters.
                </p>
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
