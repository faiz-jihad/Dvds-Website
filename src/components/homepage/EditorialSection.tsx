import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, BookOpen } from 'lucide-react';
import { EditorialSectionConfig } from '../../types/homepage';

interface EditorialSectionProps {
  data: EditorialSectionConfig;
}

export const EditorialSection: React.FC<EditorialSectionProps> = ({ data }) => {
  const cards = data.cards || [];
  if (!cards.length) return null;

  return (
    <section className="bg-neutral-950 text-white py-16 sm:py-20 lg:py-24 border-y border-neutral-800">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Section Header */}
        <div className="flex flex-col mb-10 sm:mb-14">
          {data.eyebrow && (
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-brand-blue mb-2.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {data.eyebrow}
            </span>
          )}
          <h2 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mt-3 font-light leading-relaxed">
              {data.subtitle}
            </p>
          )}
        </div>

        {/* Editorial Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {cards.map((card) => {
            const focalX = card.focalPoint?.x ?? 50;
            const focalY = card.focalPoint?.y ?? 50;

            return (
              <div
                key={card.id}
                className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all duration-300 shadow-xl"
              >
                {/* Visual Header */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-80 group-hover:opacity-100"
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />

                  {card.readTime && (
                    <span className="absolute top-3 right-3 bg-black/70 text-neutral-300 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-xs flex items-center gap-1 border border-white/10">
                      <Clock className="w-3 h-3 text-brand-blue" />
                      {card.readTime}
                    </span>
                  )}
                </div>

                {/* Editorial Content */}
                <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between">
                  <div>
                    {card.eyebrow && (
                      <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-brand-blue block mb-2">
                        {card.eyebrow}
                      </span>
                    )}
                    <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white group-hover:text-brand-blue-soft transition-colors leading-snug">
                      {card.title}
                    </h3>
                    {card.description && (
                      <p className="text-xs sm:text-sm text-neutral-400 mt-3 leading-relaxed font-light">
                        {card.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-8 pt-5 border-t border-neutral-800 flex items-center justify-between">
                    <Link
                      to={card.href || '/about'}
                      className="text-xs font-bold uppercase tracking-wider text-brand-blue group-hover:text-white transition-colors flex items-center gap-2"
                    >
                      <span>{card.ctaLabel || 'Read Full Story'}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
