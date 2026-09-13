import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Disc, ArrowRight, Clock, Flame } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/useUiStore';
import { publicApi } from '../../lib/publicApi';
import { Product } from '../../types';
import { formatGBP } from '../../lib/formatters';
import { ImdbBadge } from '../common/ImdbBadge';

const POPULAR_SEARCHES = ['Oppenheimer', 'Interstellar', 'Christopher Nolan', 'Heat', 'Box Set', 'Region 2'];

export const SearchOverlay: React.FC = () => {
  const { isSearchOpen, closeSearch } = useUiStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('az_rayan_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const productsQuery = useQuery({ queryKey: ['store', 'products'], queryFn: () => publicApi.getProducts(), enabled: isSearchOpen });

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setResults([]);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSearchOpen]);

  // Debounced search against catalogue
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const q = query.toLowerCase().trim();
      const allProducts = productsQuery.data || [];
      const filtered = allProducts.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const descMatch = p.description.toLowerCase().includes(q);
        const formatMatch = p.format.toLowerCase().includes(q);
        const genreMatch = p.genres?.some((g) => g.name.toLowerCase().includes(q));
        return titleMatch || descMatch || formatMatch || genreMatch;
      });
      setResults(filtered.slice(0, 6));
    }, 180);

    return () => clearTimeout(timer);
  }, [query, productsQuery.data]);

  const handleSelectSearch = (term: string) => {
    setQuery(term);
    saveRecentSearch(term);
  };

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('az_rayan_recent_searches', JSON.stringify(updated));
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
            className="fixed inset-0 bg-dark/70 backdrop-blur-md"
          />

          {/* Search Container */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-3xl mx-auto px-3 pt-4 sm:px-4 sm:pt-24 pb-6 sm:pb-12"
          >
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-100">
              {/* Top Input Bar */}
              <div className="flex items-center px-3 py-3 border-b border-gray-100 sm:px-6 sm:py-4">
                {/* Rotating DVD Disc Detail */}
                <div className="mr-2 hidden text-brand-blue animate-[spin_8s_linear_infinite] min-[380px]:block sm:mr-3">
                  <Disc className="w-6 h-6 stroke-[1.75]" />
                </div>

                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search titles, actors, genres..."
                  className="w-full text-base sm:text-lg text-dark placeholder:text-gray-400 bg-transparent focus:outline-none font-medium"
                />

                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 text-gray-400 hover:text-dark mr-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={closeSearch}
                  className="min-h-11 min-w-11 shrink-0 p-2 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Suggestions / Results Panel */}
              <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain p-4 sm:max-h-[65vh] sm:p-6">
                {query.trim() === '' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                    {/* Popular searches */}
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                        <Flame className="w-3.5 h-3.5 text-brand-red" />
                        Popular Searches
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map((term) => (
                          <button
                            key={term}
                            onClick={() => handleSelectSearch(term)}
                            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-brand-blue hover:text-white rounded-full transition-colors text-dark font-medium"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recent searches */}
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                        <Clock className="w-3.5 h-3.5 text-brand-blue" />
                        Recent Searches
                      </h4>
                      {recentSearches.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((term) => (
                            <button
                              key={term}
                              onClick={() => handleSelectSearch(term)}
                              className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 hover:border-dark rounded-full transition-colors text-dark font-medium"
                            >
                              {term}
                            </button>
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
                      <span>Matching Films ({results.length})</span>
                      <span className="hidden font-mono sm:inline">Press Enter for full results</span>
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
                          className="py-3 flex items-center justify-between gap-4 group hover:bg-gray-50 px-2 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 aspect-dvd bg-gray-100 rounded-sm overflow-hidden shrink-0 border border-gray-200">
                              <img
                                src={product.cover_image_url}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="truncate">
                              <p className="font-display font-semibold text-sm text-dark group-hover:text-brand-blue truncate">
                                {product.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-0.5">
                                <span>{product.format}</span>
                                <span>•</span>
                                <span>{product.release_year}</span>
                                <span>•</span>
                                <ImdbBadge product={product} size="xs" />
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
                        onClick={() => {
                          saveRecentSearch(query.trim());
                          closeSearch();
                          navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                        }}
                        className="text-xs font-semibold text-brand-blue hover:underline inline-flex items-center gap-1"
                      >
                        View all search results for "{query}" <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="font-display font-semibold text-dark text-sm mb-1">
                      No matching titles found
                    </p>
                    <p className="text-xs text-gray-400">
                      Try searching with broader film keywords, directors, or genres.
                    </p>
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
