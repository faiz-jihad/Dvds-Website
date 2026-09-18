import React, { useState, useEffect, useRef } from 'react';
import { Package, Loader2, CheckCircle2, ArrowUp } from 'lucide-react';
import { Product } from '../../types';
import { SeriviaMovieCard } from './SeriviaMovieCard';

interface SeriviaMovieGridProps {
  products: Product[];
  loading?: boolean;
  initialBatchSize?: number;
  incrementSize?: number;
}

const SkeletonCard: React.FC = () => (
  <div className="flex flex-col animate-pulse bg-white p-2.5 rounded-2xl border border-gray-200">
    <div className="aspect-[2/3] rounded-xl bg-gray-100" />
    <div className="mt-2.5 space-y-2">
      <div className="h-3.5 rounded bg-gray-200 w-3/4" />
      <div className="h-2.5 rounded bg-gray-100 w-1/2" />
      <div className="h-4 rounded bg-gray-200 w-1/3" />
    </div>
  </div>
);

export const SeriviaMovieGrid: React.FC<SeriviaMovieGridProps> = ({
  products,
  loading,
  initialBatchSize = 12,
  incrementSize = 12,
}) => {
  const [displayLimit, setDisplayLimit] = useState(initialBatchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset display limit when the product collection or active filter changes
  useEffect(() => {
    setDisplayLimit(initialBatchSize);
    setIsLoadingMore(false);
  }, [products, initialBatchSize]);

  // Infinite scroll trigger: load the next batch when the user scrolls near the sentinel
  useEffect(() => {
    if (displayLimit >= products.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setDisplayLimit((prev) => Math.min(prev + incrementSize, products.length));
            setIsLoadingMore(false);
          }, 250);
        }
      },
      {
        root: null,
        rootMargin: '250px 0px',
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayLimit, products.length, incrementSize, isLoadingMore]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-white border border-gray-200 my-4 shadow-xs">
        <Package size={40} className="text-gray-300 mb-3" />
        <h3 className="text-dark font-bold text-base">No titles found</h3>
        <p className="text-gray-500 text-xs mt-1 max-w-sm">
          No items match this filter. Try selecting another category, genre, or browse all editions.
        </p>
      </div>
    );
  }

  const visibleProducts = products.slice(0, displayLimit);
  const hasMore = displayLimit < products.length;

  return (
    <div className="space-y-6">
      {/* Responsive Cards Grid */}
      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {visibleProducts.map((product) => (
          <SeriviaMovieCard key={product.id} product={product} />
        ))}
      </div>

      {/* Progressive Scroll Loading Sentinel / Feedback */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="pt-4 pb-8 flex flex-col items-center justify-center gap-2.5"
        >
          {isLoadingMore ? (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white border border-gray-200 shadow-xs text-xs font-semibold text-gray-700 animate-in fade-in duration-200">
              <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
              <span>Loading more titles...</span>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsLoadingMore(true);
                setTimeout(() => {
                  setDisplayLimit((prev) => Math.min(prev + incrementSize, products.length));
                  setIsLoadingMore(false);
                }, 200);
              }}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-dark hover:text-brand-blue transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Load More Titles</span>
              <span className="text-[11px] font-normal text-gray-400">
                ({visibleProducts.length} of {products.length})
              </span>
            </button>
          )}
        </div>
      )}

      {/* End of Catalogue Notice */}
      {!hasMore && products.length > initialBatchSize && (
        <div className="pt-6 pb-4 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>
              Showing all <strong className="text-dark font-semibold">{products.length}</strong> titles in this catalogue
            </span>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1 font-bold text-brand-blue hover:text-brand-blue-hover transition-colors cursor-pointer"
          >
            <span>Back to top</span>
            <ArrowUp size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SeriviaMovieGrid;
