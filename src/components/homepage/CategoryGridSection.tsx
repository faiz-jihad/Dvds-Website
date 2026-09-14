import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { CategoryGridSectionConfig } from '../../types/homepage';
import { Category, Product } from '../../types';
import { SpotlightCard } from '../motion/SpotlightCard';

interface CategoryGridSectionProps {
  data: CategoryGridSectionConfig;
  categories: Category[];
  products: Product[];
}

export const CategoryGridSection: React.FC<CategoryGridSectionProps> = ({
  data,
  categories,
  products,
}) => {
  const reduceMotion = useReducedMotion();
  // Filter categories according to slugs if specified, or use top categories
  const activeCategories = React.useMemo(() => {
    if (data.categorySlugs && data.categorySlugs.length > 0) {
      const slugMap = new Map(categories.map((c) => [c.slug, c]));
      const matched = data.categorySlugs.map((s) => slugMap.get(s)).filter(Boolean) as Category[];
      return matched;
    }
    return categories.slice(0, 6);
  }, [categories, data.categorySlugs]);

  if (!activeCategories.length) return null;

  return (
    <section className="bg-[#080a0e] text-white py-16 sm:py-24 border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

          <Link
            to="/shop"
            className="text-xs font-mono tracking-widest uppercase text-white/70 hover:text-white inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            VIEW COMPLETE ARCHIVE <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-5">
        {activeCategories.map((cat, index) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          return (
            <motion.div
              key={cat.id}
              initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.96 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.52, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
            >
              <SpotlightCard
                className="overflow-hidden rounded-xl border border-white/10 bg-[#0e1219] shadow-2xs hover:shadow-lg hover:border-white/30 transition-all duration-300"
                spotlightColor="rgba(255, 255, 255, 0.2)"
              >
                <Link
                  to={`/shop?category=${cat.slug}`}
                  className="group relative flex flex-col"
                >
                  {/* Category Image Tile */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-950">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 opacity-80 group-hover:opacity-95"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-900">
                        <img src="/brand/disc-motif.svg" alt="" className="h-24 w-24 opacity-20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Bottom title over image */}
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
                      <h3 className="font-display font-black text-xs sm:text-sm uppercase tracking-wider group-hover:text-brand-blue-soft transition-colors leading-tight drop-shadow-xs">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] font-mono text-gray-300 block mt-0.5">
                        {count} {count === 1 ? 'Title' : 'Titles'}
                      </span>
                    </div>
                  </div>
                </Link>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </div>
      </div>
    </section>
  );
};
