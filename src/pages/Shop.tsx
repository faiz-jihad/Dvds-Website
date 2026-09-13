import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/common/Button';
import { publicApi } from '../lib/publicApi';
import { formatGBP } from '../lib/formatters';
import { StoreDataState } from '../components/common/StoreDataState';

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
  const categories = categoriesQuery.data || [];
  const genres = genresQuery.data || [];
  const allProducts = productsQuery.data || [];
  const availableFormats = Array.from(new Set(allProducts.map((product) => product.format))).sort();
  const availableRatings = Array.from(new Set(allProducts.map((product) => product.age_rating))).sort();
  const catalogueMinPrice = allProducts.length ? Math.floor(Math.min(...allProducts.map((product) => product.price))) : 0;
  const catalogueMaxPrice = allProducts.length ? Math.ceil(Math.max(...allProducts.map((product) => product.price))) : 0;

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

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((product) => {
        // Status check
        if (product.status !== 'active') return false;

        // Category filter
        if (selectedCategory !== 'all') {
          const cat = categories.find((c) => c.slug === selectedCategory);
          if (cat && product.category_id !== cat.id) return false;
        }

        // Genre filter
        if (selectedGenre !== 'all') {
          const hasGenre = product.genres?.some((g) => g.slug === selectedGenre);
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

  return (
    <div className="bg-white min-h-screen py-6 sm:py-10">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Editorial Page Header */}
        <div className="pb-8 mb-8 border-b border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
              AZ Rayan Catalogue
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-dark tracking-tight mt-1">
              Physical Media Vault
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-lg">
              Showing {filteredProducts.length} certified UK editions. Verified discs and collector editions.
            </p>
          </div>

          {/* Sort dropdown & Mobile filter button */}
          <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 md:flex md:w-auto md:gap-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden flex min-h-11 items-center gap-2 px-3.5 py-2 bg-gray-100 text-dark rounded-md text-xs font-semibold"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className="text-gray-500 hidden sm:inline">Sort:</span>
              <select
                value={sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="min-h-11 min-w-0 w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-2 text-xs font-medium text-dark focus:outline-none focus:border-brand-blue sm:px-3 md:w-auto"
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

        {showMobileFilters && (
          <aside className="mb-7 rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-xs md:hidden">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-blue" />
                <span className="font-display text-sm font-bold text-dark">Catalogue filters</span>
              </div>
              <button type="button" onClick={() => setShowMobileFilters(false)} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-500 hover:bg-white" aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Category</span>
                <select value={selectedCategory} onChange={(event) => updateFilter('category', event.target.value)} className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-dark focus:border-brand-blue focus:outline-none">
                  <option value="all">All categories</option>
                  {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Genre</span>
                <select value={selectedGenre} onChange={(event) => updateFilter('genre', event.target.value)} className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-dark focus:border-brand-blue focus:outline-none">
                  <option value="all">All genres</option>
                  {genres.map((genre) => <option key={genre.id} value={genre.slug}>{genre.name}</option>)}
                </select>
              </label>

              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Media format</span>
                <div className="flex flex-wrap gap-2">
                  {['all', ...availableFormats].map((format) => <button type="button" key={format} onClick={() => updateFilter('format', format)} className={`min-h-11 rounded-md border px-3 text-xs font-semibold ${selectedFormat === format ? 'border-brand-blue bg-brand-blue text-white' : 'border-gray-200 bg-white text-dark'}`}>{format === 'all' ? 'All formats' : format}</button>)}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-600">BBFC rating</span>
                <div className="flex flex-wrap gap-2">
                  {['all', ...availableRatings].map((rating) => <button type="button" key={rating} onClick={() => updateFilter('rating', rating)} className={`min-h-11 min-w-11 rounded-md border px-3 text-xs font-mono font-semibold ${selectedRating === rating ? 'border-dark bg-dark text-white' : 'border-gray-200 bg-white text-dark'}`}>{rating === 'all' ? 'Any' : rating}</button>)}
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
                  className="text-xs text-brand-red hover:underline flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-3">
                Category
              </h4>
              <div className="space-y-1.5 text-xs">
                <button
                  onClick={() => updateFilter('category', 'all')}
                  className={`block w-full text-left py-1 transition-colors ${
                    selectedCategory === 'all' ? 'font-bold text-brand-blue' : 'text-gray-600 hover:text-dark'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateFilter('category', c.slug)}
                    className={`block w-full text-left py-1 transition-colors ${
                      selectedCategory === c.slug ? 'font-bold text-brand-blue' : 'text-gray-600 hover:text-dark'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Filter */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-3">
                Media Format
              </h4>
              <div className="flex flex-wrap gap-2">
                {['all', ...availableFormats].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => updateFilter('format', fmt)}
                    className={`text-xs px-2.5 py-1.5 rounded-sm border font-medium transition-colors ${
                      selectedFormat === fmt
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-white text-dark border-gray-200 hover:border-dark'
                    }`}
                  >
                    {fmt === 'all' ? 'All Formats' : fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* BBFC Age Rating Filter */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-3">
                BBFC Age Rating
              </h4>
              <div className="flex flex-wrap gap-2">
                {['all', ...availableRatings].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => updateFilter('rating', rating)}
                    className={`text-xs px-2.5 py-1 rounded-sm border font-mono transition-colors ${
                      selectedRating === rating
                        ? 'bg-dark text-white border-dark'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-dark'
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
                <span className="font-semibold uppercase tracking-wider text-gray-700">Max Price</span>
                <span className="font-mono font-bold text-dark">{formatGBP(maxPrice ?? catalogueMaxPrice)}</span>
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
              <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-mono">
                <span>{formatGBP(catalogueMinPrice)}</span>
                <span>{formatGBP(catalogueMaxPrice)}</span>
              </div>
            </div>
          </aside>

          {/* Right Main Grid */}
          <main className="col-span-1 md:col-span-9">
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center bg-gray-50 rounded-sm border border-gray-100 p-8">
                <p className="font-display font-bold text-lg text-dark mb-1">
                  No DVD titles match these filters
                </p>
                <p className="text-xs text-gray-500 mb-6">
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
