import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';
import { AzDvdMovieCard } from './AzDvdMovieCard';

interface AzMovieShelfRowProps {
  badge?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
}

export const AzMovieShelfRow: React.FC<AzMovieShelfRowProps> = ({
  badge,
  title,
  subtitle,
  products,
  viewAllHref,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -500 : 500,
      behavior: 'smooth',
    });
    setTimeout(updateScrollState, 300);
  };

  if (products.length === 0) return null;

  return (
    <section className="w-full select-none space-y-4">
      {/* ── Shelf Header: Title on Left, Navigation/View All on Right ── */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {badge && (
            <span className="inline-block text-[10px] font-black uppercase tracking-wider text-brand-blue mb-1">
              {badge}
            </span>
          )}
          <h2 className={cn('text-xl sm:text-2xl font-black tracking-tight truncate', isDark ? 'text-white' : 'text-gray-900')}>
            {title}
          </h2>
          {subtitle && (
            <p className={cn('text-xs sm:text-sm mt-0.5 truncate max-w-2xl', isDark ? 'text-gray-400' : 'text-gray-600')}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Desktop Left/Right Chevron Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={cn(
                'w-8 h-8 rounded-full disabled:opacity-30 disabled:pointer-events-none border flex items-center justify-center transition-colors cursor-pointer',
                isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
              )}
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={cn(
                'w-8 h-8 rounded-full disabled:opacity-30 disabled:pointer-events-none border flex items-center justify-center transition-colors cursor-pointer',
                isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
              )}
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* View All link */}
          {viewAllHref && (
            <Link
              to={viewAllHref}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:text-brand-blue-hover transition-colors group px-2.5 py-1 rounded-lg hover:bg-brand-blue/10"
            >
              <span>View All</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Horizontal Scroll Track of Movie Cards ── */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-1 snap-x snap-mandatory"
      >
        {products.map((product) => (
          <AzDvdMovieCard
            key={product.id}
            product={product}
            className="w-[155px] sm:w-[185px] md:w-[210px] shrink-0 snap-start"
          />
        ))}
      </div>
    </section>
  );
};
export default AzMovieShelfRow;
