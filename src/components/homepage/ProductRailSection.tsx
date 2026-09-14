import React, { useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ProductRailSectionConfig } from '../../types/homepage';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { LatestReleasesSection } from './LatestReleasesSection';

interface ProductRailSectionProps {
  data: ProductRailSectionConfig;
  allProducts: Product[];
}

export const ProductRailSection: React.FC<ProductRailSectionProps> = ({ data, allProducts }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

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
        const idSet = new Set(data.manualProductIds || []);
        list = list.filter((p) => idSet.has(p.id));
        break;
      default:
        break;
    }

    return list.slice(0, data.limit || 8);
  }, [allProducts, data.sourceType, data.categorySlug, data.manualProductIds, data.limit]);

  if (data.sourceType === 'newest') {
    return <LatestReleasesSection data={data} allProducts={allProducts} />;
  }

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
    <section className="py-16 sm:py-24 bg-[#06080b] border-y border-white/[0.08] overflow-hidden text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Title and Scroll Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            {data.eyebrow && (
              <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-white/50 block mb-2">
                {data.eyebrow}
              </span>
            )}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {data.title}
            </h2>
            {data.subtitle && (
              <p className="text-xs sm:text-sm text-white/60 mt-2 font-light max-w-xl">
                {data.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {data.ctaLabel && data.ctaHref && (
              <Link
                to={data.ctaHref}
                className="text-xs font-mono tracking-widest uppercase text-white/70 hover:text-white mr-4 hidden sm:inline-flex items-center gap-1.5 transition-colors"
              >
                {data.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Previous items"
              className="w-10 h-10 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Next items"
              className="w-10 h-10 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white transition-colors active:scale-95"
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
          {railProducts.map((product, index) => (
            <motion.div
              key={product.id}
              className="w-[200px] sm:w-[240px] shrink-0 snap-start"
              initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: Math.min(index * 0.055, 0.32), ease: [0.22, 1, 0.36, 1] }}
            >
              <ProductCard product={product} />
            </motion.div>
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
