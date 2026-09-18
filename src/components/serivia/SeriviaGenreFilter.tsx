import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Flame, Package, Disc, Tag } from 'lucide-react';
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

  // Dynamically compute all filter pills based entirely on store data
  const allPills = useMemo(() => {
    const pills: { id: string; label: string; icon?: React.ComponentType<{ size?: number; className?: string }> }[] = [
      { id: 'all', label: 'All Titles' },
    ];

    // Only add Trending if store has best sellers or featured titles
    if (products.some((p) => p.is_best_seller || p.is_featured)) {
      pills.push({ id: 'trending', label: 'Top Chart', icon: Flame });
    }

    // Only add New Arrivals if store has new releases
    if (products.some((p) => p.is_new_release)) {
      pills.push({ id: 'new', label: 'New Arrivals', icon: Sparkles });
    }

    // Only add Special Offers if store has discounted items
    if (products.some((p) => p.compare_at_price && p.compare_at_price > p.price)) {
      pills.push({ id: 'sale', label: 'Special Offers', icon: Tag });
    }

    // Dynamic Formats: extract unique formats actually in the products catalogue
    const uniqueFormats = Array.from(
      new Set(products.map((p) => p.format).filter(Boolean))
    );
    uniqueFormats.forEach((fmt) => {
      const isBox = fmt.toLowerCase().includes('box');
      pills.push({
        id: isBox ? 'box_set' : `format:${fmt.toLowerCase()}`,
        label: fmt,
        icon: isBox ? Package : Disc,
      });
    });

    // Dynamic Categories: all active categories from DB
    categories
      .filter((c) => c.is_active)
      .forEach((c) => {
        pills.push({
          id: `cat:${c.slug}`,
          label: c.name,
        });
      });

    // Dynamic Genres: all genres from DB
    genres.forEach((g) => {
      pills.push({
        id: `genre:${g.slug}`,
        label: g.name,
      });
    });

    return pills;
  }, [products, categories, genres]);

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
      left: dir === 'left' ? -260 : 260,
      behavior: 'smooth',
    });
    setTimeout(updateScrollState, 260);
  };

  return (
    <div className="relative w-full select-none py-1 group/filter">
      {/* Desktop Left Scroll Button */}
      <button
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        className={cn(
          'hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white border border-gray-200 items-center justify-center text-gray-700 shadow-md transition-all cursor-pointer active:scale-90',
          !canScrollLeft && 'opacity-0 pointer-events-none'
        )}
        aria-label="Scroll left filters"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Smooth Horizontal Chip Strip for BOTH Mobile & Desktop */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-1"
      >
        {allPills.map((pill) => {
          const active = activeFilter === pill.id;
          const Icon = pill.icon;

          return (
            <button
              key={pill.id}
              onClick={() => onFilterChange(pill.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-xs font-bold transition-all duration-200 border cursor-pointer active:scale-95',
                active
                  ? 'bg-dark text-white border-dark shadow-md ring-2 ring-dark/20'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-dark hover:border-gray-300 shadow-2xs'
              )}
            >
              {Icon && <Icon size={12} className={active ? 'text-white' : 'text-gray-400'} />}
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Right Scroll Button */}
      <button
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className={cn(
          'hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white border border-gray-200 items-center justify-center text-gray-700 shadow-md transition-all cursor-pointer active:scale-90',
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
