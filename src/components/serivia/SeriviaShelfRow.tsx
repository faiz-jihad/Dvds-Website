import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { SeriviaMovieCard } from './SeriviaMovieCard';
import { cn } from '../../lib/formatters';

/* ─── Cinema Section Header ─── */
interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  subtitle,
  viewAllHref,
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
}) => (
  <div className="flex items-end justify-between mb-3.5">
    <div>
      {badge && (
        <span className="inline-block text-[10px] font-black uppercase tracking-wider text-brand-blue mb-1">
          {badge}
        </span>
      )}
      <h2 className="text-lg sm:text-xl font-black text-dark tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>
      )}
    </div>

    <div className="flex items-center gap-2">
      {/* Desktop Scroll Controls */}
      <div className="hidden sm:flex items-center gap-1">
        <button
          onClick={onScrollLeft}
          disabled={!canScrollLeft}
          aria-label="Scroll shelf left"
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
          onClick={onScrollRight}
          disabled={!canScrollRight}
          aria-label="Scroll shelf right"
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

      {viewAllHref && (
        <Link
          to={viewAllHref}
          className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-brand-blue-hover transition-colors group ml-1"
        >
          <span>See all</span>
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  </div>
);

/* ─── Exported SeriviaShelfRow ─── */
interface SeriviaShelfRowProps {
  badge?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
}

export const SeriviaShelfRow: React.FC<SeriviaShelfRowProps> = ({
  badge,
  title,
  subtitle,
  products,
  viewAllHref,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -460 : 460, behavior: 'smooth' });
    setTimeout(updateScroll, 280);
  };

  if (products.length === 0) return null;

  return (
    <section className="w-full select-none">
      <SectionHeader
        badge={badge}
        title={title}
        subtitle={subtitle}
        viewAllHref={viewAllHref}
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        onScrollLeft={() => scroll('left')}
        onScrollRight={() => scroll('right')}
      />

      {/* Edge-to-edge touch horizontal scroll track */}
      <div
        ref={scrollRef}
        onScroll={updateScroll}
        className="flex gap-3.5 sm:gap-4.5 overflow-x-auto no-scrollbar scroll-smooth pb-3 pt-1 snap-x snap-mandatory"
      >
        {products.map((product) => (
          <SeriviaMovieCard
            key={product.id}
            product={product}
            className="w-[140px] sm:w-[165px] lg:w-[185px] shrink-0 snap-start"
          />
        ))}
      </div>
    </section>
  );
};

export default SeriviaShelfRow;
