import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Disc, ArrowRight, Clock, Flame, Sparkles, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/useUiStore';
import { publicApi } from '../../lib/publicApi';
import { Product } from '../../types';
import { formatGBP, cn } from '../../lib/formatters';
import { ImdbBadge } from '../common/ImdbBadge';
import { searchCatalogue, findSearchSuggestion } from '../../lib/searchEngine';

const POPULAR_SEARCHES = [
  'Oppenheimer',
  'Star Wars',
  'Mandalorian',
  'Interstellar',
  'Christopher Nolan',
  'Heat',
  'Box Set',
  '4K UHD',
];

const FORMAT_TABS = [
  { label: 'All Formats', value: 'all' },
  { label: 'DVD Box Sets', value: 'box set' },
  { label: '4K Ultra HD', value: '4k' },
  { label: 'Standard DVD', value: 'dvd' },
];

export const SearchOverlay: React.FC = () => {
  const { isSearchOpen, closeSearch } = useUiStore();
  const [query, setQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [results, setResults] = useState<Product[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('az_rayan_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const productsQuery = useQuery({
    queryKey: ['store', 'products'],
    queryFn: () => publicApi.getProducts(),
    enabled: isSearchOpen,
    staleTime: 60_000,
  });

  const allProducts = productsQuery.data || [];

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setSelectedFormat('all');
      setResults([]);
      setSuggestion(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSearchOpen]);

  // Intelligent debounced search with relevance scoring & suggestions
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(() => {
      const matched = searchCatalogue(allProducts, query, {
        format: selectedFormat === 'all' ? undefined : selectedFormat,
        maxResults: 8,
      });
      setResults(matched);

      if (matched.length === 0) {
        const foundSuggestion = findSearchSuggestion(allProducts, query);
        setSuggestion(foundSuggestion);
      } else {
        setSuggestion(null);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, selectedFormat, allProducts]);

  const handleSelectSearch = (term: string) => {
    setQuery(term);
    saveRecentSearch(term);
    inputRef.current?.focus();
  };

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [
      trimmed,
      ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('az_rayan_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const removeRecentSearch = (e: React.MouseEvent, termToRemove: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== termToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem('az_rayan_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('az_rayan_recent_searches');
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'Enter' && query.trim()) {
      saveRecentSearch(query.trim());
      closeSearch();
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSearch}
            className="fixed inset-0 bg-dark/70 backdrop-blur-xs"
          />

          {/* Search Container */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-3xl mx-auto px-3 pt-4 sm:px-4 sm:pt-20 pb-6 sm:pb-12"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 text-dark">
              {/* Top Input Bar */}
              <div className="flex items-center px-4 py-3.5 border-b border-gray-100 sm:px-6 sm:py-4 gap-2">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search titles, actors, directors, box sets..."
                  className="w-full text-base sm:text-lg text-dark placeholder:text-gray-400 bg-transparent focus:outline-none font-medium"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-dark hover:bg-gray-100 rounded-md transition cursor-pointer shrink-0"
                    title="Clear search"
                  >
                    Clear
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeSearch}
                  className="p-1.5 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Format Filter Tabs */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100 overflow-x-auto scrollbar-none sm:px-6">
                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1 hidden min-[400px]:block" />
                {FORMAT_TABS.map((tab) => {
                  const isActive = selectedFormat === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setSelectedFormat(tab.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                        isActive
                          ? 'bg-brand-blue text-white shadow-xs'
                          : 'bg-white text-gray-600 hover:text-dark border border-gray-200'
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Suggestions / Results Panel */}
              <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain p-4 sm:max-h-[60vh] sm:p-6">
                {query.trim() === '' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                    {/* Popular searches */}
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                        <Flame className="w-3.5 h-3.5 text-brand-red" />
                        Trending Searches
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => handleSelectSearch(term)}
                            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-brand-blue hover:text-white rounded-full transition-colors text-dark font-medium cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recent searches */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          <Clock className="w-3.5 h-3.5 text-brand-blue" />
                          Recent Searches
                        </h4>
                        {recentSearches.length > 0 && (
                          <button
                            type="button"
                            onClick={clearAllRecent}
                            className="text-[11px] text-gray-400 hover:text-red-600 transition cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      {recentSearches.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((term) => (
                            <div
                              key={term}
                              onClick={() => handleSelectSearch(term)}
                              className="group inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 hover:border-gray-400 rounded-full transition-colors text-dark font-medium cursor-pointer"
                            >
                              <span>{term}</span>
                              <button
                                type="button"
                                onClick={(e) => removeRecentSearch(e, term)}
                                className="text-gray-400 hover:text-red-500 rounded-full p-0.5 ml-0.5"
                                title="Remove"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No recent searches</p>
                      )}
                    </div>
                  </div>
                ) : results.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between gap-3 pb-3 mb-2 border-b border-gray-100 text-xs text-gray-500">
                      <span className="font-semibold text-dark">
                        Found {results.length} matching {results.length === 1 ? 'edition' : 'editions'}
                      </span>
                      <span className="hidden font-mono sm:inline">Press Enter to view all</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {results.map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.slug}`}
                          onClick={() => {
                            saveRecentSearch(product.title);
                            closeSearch();
                          }}
                          className="py-3 flex items-center justify-between gap-4 group hover:bg-gray-50 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 aspect-dvd bg-gray-100 rounded overflow-hidden shrink-0 border border-gray-200 shadow-2xs">
                              <img
                                src={product.cover_image_url}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                            <div className="truncate">
                              <p className="font-display font-bold text-sm text-dark group-hover:text-brand-blue truncate">
                                {product.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-0.5">
                                <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 text-[10px] font-bold uppercase">
                                  {product.format}
                                </span>
                                <span>{product.release_year}</span>
                                <span>•</span>
                                <ImdbBadge product={product} size="xs" />
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-bold text-sm text-dark font-mono">
                              {formatGBP(product.price)}
                            </span>
                            <ArrowRight className="hidden w-4 h-4 text-gray-300 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all sm:block" />
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          saveRecentSearch(query.trim());
                          closeSearch();
                          navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                        }}
                        className="text-xs font-semibold text-brand-blue hover:underline inline-flex items-center gap-1.5 cursor-pointer py-1"
                      >
                        <span>View all matching results in catalogue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="font-display font-semibold text-dark text-sm mb-1">
                      No matching editions found for &ldquo;{query}&rdquo;
                    </p>
                    {suggestion ? (
                      <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl inline-flex items-center gap-2 text-xs text-gray-700">
                        <Sparkles className="w-4 h-4 text-brand-blue shrink-0" />
                        <span>Did you mean:</span>
                        <button
                          type="button"
                          onClick={() => handleSelectSearch(suggestion)}
                          className="font-bold text-brand-blue hover:underline cursor-pointer"
                        >
                          &ldquo;{suggestion}&rdquo;
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">
                        Try searching with broader terms, actor names, or select &ldquo;All Formats&rdquo;.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
