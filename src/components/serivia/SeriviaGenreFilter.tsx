import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Category, Genre, Product } from '../../types';
import { cn } from '../../lib/formatters';

interface SeriviaGenreFilterProps {
  categories: Category[];
  genres: Genre[];
  products: Product[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const SeriviaGenreFilter: React.FC<SeriviaGenreFilterProps> = ({
  categories,
  genres,
  products,
  activeFilter,
  onFilterChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Build pill list: static filters first + dynamic genres/categories
  const staticPills = [
    { id: 'all', label: 'All' },
    { id: 'trending', label: 'Trending' },
    { id: 'new', label: 'New Releases' },
    { id: 'sale', label: 'On Sale' },
    { id: 'box_set', label: 'Box Sets' },
  ];

  const genrePills = genres.slice(0, 8).map((g) => ({ id: `genre:${g.slug}`, label: g.name }));
  const categoryPills = categories
    .filter((c) => c.is_active)
    .slice(0, 5)
    .map((c) => ({ id: `cat:${c.slug}`, label: c.name }));

  const allPills = [...staticPills, ...genrePills, ...categoryPills];

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
    setTimeout(updateScrollState, 300);
  };

  return (
    <div className="flex items-center gap-1 relative">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className={cn(
          'shrink-0 w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.12] transition-all',
          !canScrollLeft && 'opacity-0 pointer-events-none'
        )}
        aria-label="Scroll left"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Pills */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allPills.map((pill) => {
          const active = activeFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => onFilterChange(pill.id)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap',
                active
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-white/[0.06] text-white/55 border border-white/[0.07] hover:bg-white/[0.12] hover:text-white'
              )}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className={cn(
          'shrink-0 w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.12] transition-all',
          !canScrollRight && 'opacity-0 pointer-events-none'
        )}
        aria-label="Scroll right"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

export default SeriviaGenreFilter;
