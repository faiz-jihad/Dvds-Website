import React, { useRef } from 'react';
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

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      });
    }
  };

  // Fixed top level curator categories
  const staticChips = [
    { id: 'all', label: 'All Titles', filter: 'all', icon: Film },
    { id: 'trending', label: 'Trending', filter: 'trending', icon: TrendingUp },
    { id: 'new', label: 'New Arrivals', filter: 'new', icon: Clock },
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

  return (
    <div className="relative w-full border-y border-white/10 bg-[#0A0D15]/80 backdrop-blur-md select-none py-3">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2">
        {/* Left Arrow button for desktop scroll */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden sm:flex shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white items-center justify-center transition-colors cursor-pointer"
          aria-label="Scroll categories left"
        >
          <ChevronLeft size={16} />
        </button>

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
                    : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
                )}
              >
                <Icon size={13} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow button for desktop scroll */}
        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden sm:flex shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white items-center justify-center transition-colors cursor-pointer"
          aria-label="Scroll categories right"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default AzCategoryChips;
