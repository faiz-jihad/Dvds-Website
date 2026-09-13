import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FeaturedSectionConfig } from '../../types/homepage';

interface FeaturedSectionProps {
  data: FeaturedSectionConfig;
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ data }) => {
  const collections = data.collections || [];
  if (!collections.length) return null;

  const colSpanClass = {
    1: 'grid-cols-1 max-w-2xl mx-auto',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[Math.min(4, collections.length) as 1 | 2 | 3 | 4] || 'grid-cols-1 md:grid-cols-3';

  return (
    <section className="max-w-container mx-auto px-4 sm:px-6 md:px-12 py-12 sm:py-16 lg:py-20">
      {/* Section Header */}
      <div className="flex flex-col mb-8 sm:mb-12">
        {data.eyebrow && (
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-brand-blue mb-2">
            {data.eyebrow}
          </span>
        )}
        <h2 className="font-display font-black text-2xl sm:text-4xl text-gray-950 tracking-tight">
          {data.title}
        </h2>
        {data.description && (
          <p className="text-sm text-gray-500 max-w-2xl mt-2 leading-relaxed">
            {data.description}
          </p>
        )}
      </div>

      {/* Editorial Cards Grid */}
      <div className={`grid gap-6 sm:gap-8 ${colSpanClass}`}>
        {collections.map((item) => {
          const focalX = item.focalPoint?.x ?? 50;
          const focalY = item.focalPoint?.y ?? 50;

          return (
            <Link
              key={item.id}
              to={item.href || '/shop'}
              className="group flex flex-col justify-between overflow-hidden rounded-xl bg-white border border-gray-200/80 shadow-xs hover:shadow-xl hover:border-brand-blue/40 transition-all duration-300"
            >
              {/* Media Container */}
              <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden bg-gray-900">
                <picture className="w-full h-full block">
                  {item.mobileImage && (
                    <source media="(max-width: 640px)" srcSet={item.mobileImage} />
                  )}
                  <img
                    src={item.image}
                    alt={item.imageAlt || item.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                    loading="lazy"
                  />
                </picture>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                {item.badge && (
                  <span className="absolute top-3 left-3 bg-dark/90 text-white font-mono text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded backdrop-blur-xs border border-white/20">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Editorial Copy */}
              <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between">
                <div>
                  {item.eyebrow && (
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-brand-blue block mb-1">
                      {item.eyebrow}
                    </span>
                  )}
                  <h3 className="font-display font-extrabold text-lg sm:text-xl text-gray-950 group-hover:text-brand-blue transition-colors leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-dark group-hover:text-brand-blue transition-colors flex items-center gap-1.5">
                    {item.ctaLabel || 'Explore Collection'}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
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
