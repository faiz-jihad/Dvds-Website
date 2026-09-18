import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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

  // Core filters
  const staticPills = [
    { id: 'all', label: 'All Titles' },
    { id: 'trending', label: 'Trending' },
    { id: 'new', label: 'New Releases' },
    { id: 'sale', label: 'Special Offers' },
    { id: 'box_set', label: 'Box Sets' },
  ];

  // Dynamic Genres & Categories
  const genrePills = genres.slice(0, 10).map((g) => ({
    id: `genre:${g.slug}`,
    label: g.name,
  }));

  const categoryPills = categories
    .filter((c) => c.is_active)
    .slice(0, 6)
    .map((c) => ({
      id: `cat:${c.slug}`,
      label: c.name,
    }));

  const allPills = [...staticPills, ...genrePills, ...categoryPills];

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    updateScrollState();
  }, [allPills.length]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -240 : 240,
      behavior: 'smooth',
    });
    setTimeout(updateScrollState, 250);
  };

  return (
    <div className="relative flex items-center gap-1.5 w-full select-none py-1">
      {/* Desktop Left Scroll Button */}
      <button
        onClick={() => scroll('left')}
        className={cn(
          'hidden md:flex shrink-0 w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-200 items-center justify-center text-gray-600 hover:text-dark transition-all shadow-xs cursor-pointer',
          !canScrollLeft && 'opacity-0 pointer-events-none'
        )}
        aria-label="Scroll left filters"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Horizontal Pills Container */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full px-0.5"
      >
        {allPills.map((pill) => {
          const active = activeFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => onFilterChange(pill.id)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap border active:scale-95 cursor-pointer',
                active
                  ? 'bg-dark text-white border-dark shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-dark hover:border-gray-300'
              )}
            >
              {pill.id === 'trending' && <Sparkles size={11} className="inline mr-1 text-brand-blue" />}
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Desktop Right Scroll Button */}
      <button
        onClick={() => scroll('right')}
        className={cn(
          'hidden md:flex shrink-0 w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-200 items-center justify-center text-gray-600 hover:text-dark transition-all shadow-xs cursor-pointer',
          !canScrollRight && 'opacity-0 pointer-events-none'
        )}
        aria-label="Scroll right filters"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default SeriviaGenreFilter;
