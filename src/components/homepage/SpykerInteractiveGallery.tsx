import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AccordionGallery, AccordionGalleryItem } from '../motion/AccordionGallery';
import { DEFAULT_PRODUCTS } from '../../data/defaultProducts';
import { Product } from '../../types';
import { formatGBP } from '../../lib/formatters';
import { ChevronRight, Film } from 'lucide-react';

type FilterCategory = 'all' | 'star-wars' | 'prestige-drama' | 'special-editions';

interface SpykerInteractiveGalleryProps {
  products?: Product[];
}

export const SpykerInteractiveGallery: React.FC<SpykerInteractiveGalleryProps> = ({ products = [] }) => {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  const sourceProducts = useMemo(() => {
    return products.length > 0 ? products : DEFAULT_PRODUCTS;
  }, [products]);

  // Filter products according to category
  const filteredProducts = useMemo(() => {
    switch (activeCategory) {
      case 'star-wars': {
        const matched = sourceProducts.filter((p) =>
          p.title.toLowerCase().includes('star wars') ||
          p.category?.slug === 'sci-fi' ||
          (p.genres && p.genres.some((g) => g.slug === 'science-fiction'))
        );
        return matched.length > 0 ? matched.slice(0, 6) : sourceProducts.slice(0, 6);
      }
      case 'prestige-drama': {
        const matched = sourceProducts.filter((p) =>
          p.category?.slug === 'drama' ||
          p.category?.slug === 'tv-box-sets' ||
          ['The Chosen', 'SEAL Team', 'Dutton Ranch', 'Marshals', 'drama'].some((term) =>
            p.title.toLowerCase().includes(term.toLowerCase())
          )
        );
        return matched.length > 0 ? matched.slice(0, 6) : sourceProducts.slice(0, 6);
      }
      case 'special-editions': {
        const matched = sourceProducts.filter((p) =>
          p.is_best_seller ||
          p.is_new_release ||
          Boolean(p.compare_at_price && p.compare_at_price > p.price) ||
          ['Beatles', 'Greyhound', 'Friends', 'Box Set'].some((term) =>
            p.title.toLowerCase().includes(term.toLowerCase())
          )
        );
        return matched.length > 0 ? matched.slice(0, 6) : sourceProducts.slice(0, 6);
      }
      case 'all':
      default: {
        // Prioritize featured titles, then bestsellers, up to 6 for the accordion gallery
        const prioritized = [
          ...sourceProducts.filter((p) => p.is_featured),
          ...sourceProducts.filter((p) => !p.is_featured && p.is_best_seller),
          ...sourceProducts.filter((p) => !p.is_featured && !p.is_best_seller),
        ];
        return prioritized.slice(0, 6);
      }
    }
  }, [activeCategory, sourceProducts]);

  // Convert to AccordionGallery items
  const galleryItems: AccordionGalleryItem[] = useMemo(() => {
    return filteredProducts.map((product) => ({
      image: product.cover_image_url || '/catalog/the-mandalorian-seasons-1-3.jpeg',
      label: product.title.replace(/^Star Wars:\s*/, ''),
      link: `/product/${product.slug}`,
      alt: product.title,
      eyebrow: product.format.toUpperCase(),
      meta: `${formatGBP(product.price)} • ${product.release_year}`,
    }));
  }, [filteredProducts]);

  return (
    <section className="relative bg-[#06080b] py-24 sm:py-32 border-b border-white/[0.08] overflow-hidden">
      {/* Background radial gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(20, 35, 55, 0.4) 0%, transparent 80%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8 border-b border-white/[0.08] pb-10">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-[0.9]">
              PHYSICAL EDITIONS <br />
              <span className="text-white/40">IN ROTATION.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/60 leading-relaxed max-w-xl font-light">
              Hand-inspected optical releases stored in archival jewel cases and slipcases. Hover or tap
              any panel below to unfold photographic specifications.
            </p>
          </div>

          {/* Collection Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none max-w-full -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {[
              { id: 'all', label: 'CURATED' },
              { id: 'star-wars', label: 'STAR WARS' },
              { id: 'prestige-drama', label: 'PRESTIGE SERIES' },
              { id: 'special-editions', label: 'COLLECTOR CUTS' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.id as FilterCategory);
                }}
                className={`text-[11px] sm:text-xs font-mono tracking-wider sm:tracking-widest uppercase px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all duration-200 border whitespace-nowrap shrink-0 ${
                  activeCategory === tab.id
                    ? 'bg-white text-black border-white shadow-lg'
                    : 'bg-white/[0.03] text-white/60 border-white/[0.1] hover:border-white/30 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion Gallery Canvas */}
        <div className="mb-10">
          <AccordionGallery
            key={activeCategory}
            items={galleryItems}
            height={520}
            gap={12}
            radius={8}
            expandRatio={0.46}
            grayscale={false}
            accentColor="#ffffff"
            overlayColor="#05080c"
            textColor="#ffffff"
          />
        </div>


        {/* View All CTA Strip */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 text-xs font-mono text-white/50">
            <Film className="w-4 h-4 text-white/70" />
            <span>DISPATCHING WORLDWIDE VIA ROYAL MAIL TRACKED 24</span>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-white/80 hover:text-white transition-colors group"
          >
            <span>EXPLORE ALL {sourceProducts.length} ARCHIVED DISCS</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};
