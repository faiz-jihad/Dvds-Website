import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AccordionGallery, AccordionGalleryItem } from '../motion/AccordionGallery';
import { DEFAULT_PRODUCTS } from '../../data/defaultProducts';
import { formatGbp } from '../../lib/formatters';
import { ChevronRight, Film } from 'lucide-react';

type FilterCategory = 'all' | 'star-wars' | 'prestige-drama' | 'special-editions';

export const SpykerInteractiveGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  // Filter products according to category
  const filteredProducts = useMemo(() => {
    switch (activeCategory) {
      case 'star-wars':
        return DEFAULT_PRODUCTS.filter((p) => p.title.toLowerCase().includes('star wars'));
      case 'prestige-drama':
        return DEFAULT_PRODUCTS.filter((p) =>
          ['The Chosen', 'SEAL Team', 'Dutton Ranch', 'Marshals'].some((term) =>
            p.title.includes(term)
          )
        );
      case 'special-editions':
        return DEFAULT_PRODUCTS.filter((p) =>
          ['Beatles', 'Greyhound', 'Friends'].some((term) => p.title.includes(term))
        );
      case 'all':
      default:
        // Top 6 headline products for optimal accordion layout
        return [
          DEFAULT_PRODUCTS[1], // Mando 1-3
          DEFAULT_PRODUCTS[0], // Boba Fett
          DEFAULT_PRODUCTS[4], // The Chosen
          DEFAULT_PRODUCTS[5], // Greyhound
          DEFAULT_PRODUCTS[6], // Beatles Get Back
          DEFAULT_PRODUCTS[7], // Friends Reunion
        ];
    }
  }, [activeCategory]);

  // Convert to AccordionGallery items
  const galleryItems: AccordionGalleryItem[] = useMemo(() => {
    return filteredProducts.map((product) => ({
      image: product.cover_image_url || '/catalog/the-mandalorian-seasons-1-3.jpeg',
      label: product.title.replace(/^Star Wars:\s*/, ''),
      link: `/product/${product.slug}`,
      alt: product.title,
      eyebrow: product.format.toUpperCase(),
      meta: `${formatGbp(product.price)} • ${product.release_year}`,
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
          <div className="flex flex-wrap items-center gap-2">
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
                className={`text-xs font-mono tracking-widest uppercase px-4 py-2.5 rounded-full transition-all duration-200 border ${
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
            <span>DISPATCHING WORLDWIDE VIA ROYAL MAIL TRACKED 24 FROM LONDON</span>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-white/80 hover:text-white transition-colors group"
          >
            <span>EXPLORE ALL 11 ARCHIVED DISCS</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};
