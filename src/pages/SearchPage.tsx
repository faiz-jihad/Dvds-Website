import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, Disc, ArrowLeft, SlidersHorizontal, Sparkles, Film } from 'lucide-react';
import { publicApi } from '../lib/publicApi';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/common/Button';
import { StoreDataState } from '../components/common/StoreDataState';
import { searchCatalogue, findSearchSuggestion, SearchOptions } from '../lib/searchEngine';
import { cn } from '../lib/formatters';
import { Seo } from '../components/common/Seo';

const FORMAT_FILTERS = [
  { label: 'All Editions', value: 'all' },
  { label: 'DVD Box Sets', value: 'box set' },
  { label: '4K Ultra HD', value: '4k' },
  { label: 'Standard DVD', value: 'dvd' },
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParam = searchParams.get('q') || '';

  const [inputVal, setInputVal] = useState(queryParam);
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [sortBy, setSortBy] = useState<NonNullable<SearchOptions['sortBy']>>('relevance');

  // Keep inputVal in sync with URL param changes
  useEffect(() => {
    setInputVal(queryParam);
  }, [queryParam]);

  const productsQuery = useQuery({
    queryKey: ['store', 'products'],
    queryFn: () => publicApi.getProducts(),
    staleTime: 60_000,
  });

  const products = productsQuery.data || [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const clearSearch = () => {
    setInputVal('');
    setSearchParams({});
  };

  // Run the intelligent search engine
  const results = useMemo(() => {
    if (!products.length) return [];
    return searchCatalogue(products, queryParam, {
      format: selectedFormat === 'all' ? undefined : selectedFormat,
      sortBy,
    });
  }, [products, queryParam, selectedFormat, sortBy]);

  // Intelligent Did You Mean suggestion when 0 matches
  const suggestion = useMemo(() => {
    if (results.length > 0 || !queryParam.trim() || !products.length) return null;
    return findSearchSuggestion(products, queryParam);
  }, [results.length, queryParam, products]);

  // Recommended fallback products if no results
  const recommendedFallbacks = useMemo(() => {
    if (results.length > 0) return [];
    return [...products]
      .sort((a, b) => (Number(b.imdb_rating) || 0) - (Number(a.imdb_rating) || 0))
      .slice(0, 4);
  }, [results.length, products]);

  if (productsQuery.isLoading || productsQuery.error) {
    return (
      <StoreDataState
        loading={productsQuery.isLoading}
        error={productsQuery.error}
        retry={() => productsQuery.refetch()}
      />
    );
  }

  return (
    <div className="bg-white min-h-screen py-6 sm:py-10 text-dark">
      <Seo
        title={queryParam ? `Search results for "${queryParam}" — DVDs Zone` : 'Search DVDs — DVDs Zone'}
        description={queryParam ? `Buy physical DVDs matching "${queryParam}" — UK delivery, Royal Mail Tracked. DVDs Zone.` : 'Search the DVDs Zone catalogue for box sets, TV series, and collector editions.'}
        noIndex={!queryParam}
        siteName="DVDs Zone"
      />
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-dark transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Full Catalogue</span>
          </Link>

          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue font-semibold">
            Catalogue Search Engine
          </span>
        </div>

        {/* Refined Interactive Search Header Bar */}
        <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 sm:p-6 mb-8 shadow-2xs">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search by title, director, actors, format, or genre..."
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark p-1"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold tracking-wide transition shadow-xs shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Quick Filter Tabs & Sort Dropdown */}
          <div className="mt-4 pt-4 border-t border-gray-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Format filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              {FORMAT_FILTERS.map((tab) => {
                const isActive = selectedFormat === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setSelectedFormat(tab.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer',
                      isActive
                        ? 'bg-dark text-white'
                        : 'bg-white text-gray-600 hover:text-dark border border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-gray-400 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-dark focus:outline-none focus:border-brand-blue cursor-pointer"
              >
                <option value="relevance">Best Match (Relevance)</option>
                <option value="rating_desc">IMDb Rating: Highest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Release Year: Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="pb-4 mb-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight">
              {queryParam ? (
                <>
                  Results for &ldquo;<span className="text-brand-blue">{queryParam}</span>&rdquo;
                </>
              ) : (
                'All Catalogue Editions'
              )}
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              Found {results.length} {results.length === 1 ? 'edition' : 'editions'}
              {selectedFormat !== 'all' ? ` in ${selectedFormat.toUpperCase()}` : ''}
            </p>
          </div>
        </div>

        {/* Results Grid or Empty Fallback */}
        {results.length === 0 ? (
          <div className="py-12 text-center max-w-xl mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <Disc className="w-7 h-7" />
            </div>

            <h3 className="font-display font-bold text-xl text-dark mb-1">
              No direct editions found for &ldquo;{queryParam}&rdquo;
            </h3>

            {suggestion ? (
              <div className="my-4 p-4 bg-blue-50/70 border border-blue-100 rounded-xl inline-flex items-center gap-2.5 text-xs text-gray-700">
                <Sparkles className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Did you mean:</span>
                <button
                  type="button"
                  onClick={() => {
                    setInputVal(suggestion);
                    setSearchParams({ q: suggestion });
                  }}
                  className="font-bold text-brand-blue hover:underline cursor-pointer text-sm"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-6 max-w-md mx-auto">
                Check for spelling mistakes, broaden your search terms, or try searching by film director or actor name.
              </p>
            )}

            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFormat('all');
                  clearSearch();
                }}
              >
                Clear Search
              </Button>
              <Link to="/shop">
                <Button variant="primary" size="sm">
                  Browse Complete Catalogue
                </Button>
              </Link>
            </div>

            {/* Fallback Recommendations Rail */}
            {recommendedFallbacks.length > 0 && (
              <div className="mt-16 text-left border-t border-gray-100 pt-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-blue">
                      Curated Archive
                    </span>
                    <h4 className="font-display font-bold text-lg text-dark mt-0.5">
                      Popular Collector Editions You Might Like
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                  {recommendedFallbacks.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
