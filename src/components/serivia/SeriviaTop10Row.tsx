import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Product } from '../../types';
import { SeriviaMovieCard } from './SeriviaMovieCard';
import { cn } from '../../lib/formatters';

interface SeriviaTop10RowProps {
  products: Product[];
}

export const SeriviaTop10Row: React.FC<SeriviaTop10RowProps> = ({ products }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const top10 = products.slice(0, 10);

  const updateScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -420 : 420, behavior: 'smooth' });
    setTimeout(updateScroll, 280);
  };

  if (top10.length === 0) return null;

  return (
    <section className="w-full select-none">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
              <TrendingUp size={11} className="stroke-[2.5]" />
              Official UK Chart
            </span>
            <span className="hidden sm:inline-block text-[11px] font-medium text-gray-400">
              Updated daily
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-dark tracking-tight flex items-center gap-2">
            Top 10 Most Ordered Films
          </h2>
        </div>

        {/* Desktop scroll arrows */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll left top 10"
            className={cn(
              'w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer',
              canScrollLeft
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-xs active:scale-95'
                : 'bg-gray-50 border-gray-150 text-gray-300 cursor-default'
            )}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll right top 10"
            className={cn(
              'w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer',
              canScrollRight
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-xs active:scale-95'
                : 'bg-gray-50 border-gray-150 text-gray-300 cursor-default'
            )}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Horizontal ranked track */}
      <div
        ref={scrollRef}
        onScroll={updateScroll}
        className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth pb-3 pt-1 snap-x snap-mandatory"
      >
        {top10.map((product, idx) => {
          const rank = idx + 1;

          return (
            <div
              key={product.id}
              className="group relative flex-shrink-0 flex items-center snap-start"
            >
              {/* Giant Stylized Rank Number */}
              <div className="relative select-none pointer-events-none -mr-4 sm:-mr-6 z-0 flex items-center">
                <span
                  className="font-black text-[95px] sm:text-[120px] lg:text-[140px] leading-none tracking-tighter transition-all duration-300 text-gray-300/80 group-hover:text-dark/90 drop-shadow-xs"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    WebkitTextStroke: '2px #e2e8f0',
                  }}
                >
                  {rank}
                </span>
              </div>

              {/* Master Movie Card */}
              <SeriviaMovieCard
                product={product}
                className="relative z-10 w-[135px] sm:w-[160px] lg:w-[180px] shrink-0"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SeriviaTop10Row;
