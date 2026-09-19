import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Clock,
  Flame,
  Film,
  Package,
  Disc,
  Tag,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Category, Genre, Product } from '../../types';
import { cn } from '../../lib/formatters';
import { useThemeStore } from '../../stores/useThemeStore';

interface AzCategoryChipsProps {
  categories: Category[];
  genres: Genre[];
  products: Product[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const AzCategoryChips: React.FC<AzCategoryChipsProps> = ({
  categories,
  genres,
  products,
  activeFilter,
  onFilterChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 3);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 3);
  }, []);

  useEffect(() => {
    checkScrollPosition();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition);

    const observer = new ResizeObserver(checkScrollPosition);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      observer.disconnect();
    };
  }, [checkScrollPosition]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      });
      setTimeout(checkScrollPosition, 320);
    }
  };

  // Fixed top level curator categories
  const staticChips = [
    { id: 'all', label: 'All Titles', filter: 'all', icon: Film },
    { id: 'box_set', label: 'Box Sets', filter: 'box_set', icon: Package },
    { id: 'format:4k', label: '4K Ultra HD', filter: 'format:4k', icon: Disc },
    { id: 'sale', label: 'Special Offers', filter: 'sale', icon: Tag },
  ];

  // Dynamic genre chips from database
  const genreChips = genres.map((g) => ({
    id: `genre:${g.slug}`,
    label: g.name,
    filter: `genre:${g.slug}`,
    icon: Sparkles,
  }));

  const allChips = [...staticChips, ...genreChips];

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'relative w-full border-y backdrop-blur-md select-none py-3 transition-colors',
        isDark ? 'border-white/10 bg-[#0A0D15]/80 text-white' : 'border-gray-200 bg-white/90 text-gray-900'
      )}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2">
        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
        >
          {allChips.map((chip) => {
            const isActive = activeFilter === chip.filter;
            const Icon = chip.icon;

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onFilterChange(chip.filter)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 outline-none',
                  isActive
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30 border border-brand-blue font-bold scale-[1.02]'
                    : isDark
                      ? 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
                      : 'bg-gray-100 text-gray-700 hover:text-gray-900 hover:bg-gray-200 border border-gray-200'
                )}
              >
                <Icon size={13} className={isActive ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-500'} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Both Arrow buttons placed together on the right */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 pl-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={cn(
              'w-8 h-8 rounded-full border flex items-center justify-center transition-all',
              canScrollLeft
                ? isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white cursor-pointer active:scale-95'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 hover:text-gray-900 cursor-pointer active:scale-95'
                : isDark
                  ? 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed opacity-35 pointer-events-none'
                  : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-35 pointer-events-none'
            )}
            aria-label="Scroll categories left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={cn(
              'w-8 h-8 rounded-full border flex items-center justify-center transition-all',
              canScrollRight
                ? isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white cursor-pointer active:scale-95'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 hover:text-gray-900 cursor-pointer active:scale-95'
                : isDark
                  ? 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed opacity-35 pointer-events-none'
                  : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-35 pointer-events-none'
            )}
            aria-label="Scroll categories right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default AzCategoryChips;
