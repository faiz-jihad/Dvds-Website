import React, { useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { ProductRailSectionConfig } from '../../types/homepage';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';

interface ProductRailSectionProps {
  data: ProductRailSectionConfig;
  allProducts: Product[];
}

export const ProductRailSection: React.FC<ProductRailSectionProps> = ({ data, allProducts }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter products dynamically according to Admin configuration
  const railProducts = useMemo(() => {
    let list: Product[] = [...allProducts];

    switch (data.sourceType) {
      case 'bestsellers':
        list = list.filter((p) => p.is_best_seller);
        break;
      case 'newest':
        list = list.filter((p) => p.is_new_release);
        break;
      case 'sale':
        list = list.filter((p) => p.compare_at_price != null && p.compare_at_price > p.price);
        break;
      case 'featured':
        list = list.filter((p) => p.is_featured);
        break;
      case 'category':
        if (data.categorySlug) {
          list = list.filter((p) => p.category?.slug === data.categorySlug);
        }
        break;
      case 'manual':
        if (data.manualProductIds && data.manualProductIds.length > 0) {
          const idSet = new Set(data.manualProductIds);
          list = list.filter((p) => idSet.has(p.id));
        }
        break;
      default:
        break;
    }

    // Fallback to general list if filter yields zero items
    if (list.length === 0) list = allProducts;

    return list.slice(0, data.limit || 8);
  }, [allProducts, data.sourceType, data.categorySlug, data.manualProductIds, data.limit]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -offset : offset,
      behavior: 'smooth',
    });
  };

  if (!railProducts.length) return null;

  return (
    <section className="py-12 sm:py-16 bg-white border-y border-gray-100 overflow-hidden">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Header with Title and Scroll Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            {data.eyebrow && (
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-brand-blue block mb-1.5">
                {data.eyebrow}
              </span>
            )}
            <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-gray-950 tracking-tight">
              {data.title}
            </h2>
            {data.subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 font-light">
                {data.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data.ctaLabel && data.ctaHref && (
              <Link
                to={data.ctaHref}
                className="text-xs font-bold text-brand-blue hover:text-brand-blue-hover mr-3 hidden sm:inline-flex items-center gap-1"
              >
                {data.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Previous items"
              className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors shadow-xs active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Next items"
              className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors shadow-xs active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Rail Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {railProducts.map((product) => (
            <div
              key={product.id}
              className="w-[200px] sm:w-[240px] shrink-0 snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Mobile View All link */}
        {data.ctaLabel && data.ctaHref && (
          <div className="mt-4 text-center sm:hidden">
            <Link
              to={data.ctaHref}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue"
            >
              {data.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
