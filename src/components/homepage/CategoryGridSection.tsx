import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { CategoryGridSectionConfig } from '../../types/homepage';
import { Category, Product } from '../../types';

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
  // Filter categories according to slugs if specified, or use top categories
  const activeCategories = React.useMemo(() => {
    if (data.categorySlugs && data.categorySlugs.length > 0) {
      const slugMap = new Map(categories.map((c) => [c.slug, c]));
      const matched = data.categorySlugs.map((s) => slugMap.get(s)).filter(Boolean) as Category[];
      if (matched.length > 0) return matched;
    }
    return categories.slice(0, 6);
  }, [categories, data.categorySlugs]);

  if (!activeCategories.length) return null;

  return (
    <section className="max-w-container mx-auto px-4 sm:px-6 md:px-12 py-12 sm:py-16 lg:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          {data.eyebrow && (
            <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-brand-blue block mb-1.5">
              {data.eyebrow}
            </span>
          )}
          <h2 className="font-display font-black text-2xl sm:text-4xl text-gray-950 tracking-tight">
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5 font-light">
              {data.subtitle}
            </p>
          )}
        </div>

        <Link
          to="/shop"
          className="text-xs font-bold text-brand-blue hover:text-brand-blue-hover inline-flex items-center gap-1 shrink-0"
        >
          View Full Archive <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-5">
        {activeCategories.map((cat) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          const fallbackImg = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop&q=80';

          return (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-2xs hover:shadow-lg hover:border-brand-blue/40 transition-all duration-300"
            >
              {/* Category Image Tile */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-950">
                <img
                  src={cat.image_url || fallbackImg}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 opacity-80 group-hover:opacity-95"
                  loading="lazy"
                />
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
          );
        })}
      </div>
    </section>
  );
};
