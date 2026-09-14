import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SpotlightSectionConfig } from '../../types/homepage';
import { Button } from '../common/Button';

interface SpotlightSectionProps {
  data: SpotlightSectionConfig;
}

export const SpotlightSection: React.FC<SpotlightSectionProps> = ({ data }) => {
  const overlayClasses = {
    none: 'bg-transparent',
    light: 'bg-black/35',
    medium: 'bg-black/60',
    strong: 'bg-black/80',
  }[data.overlay || 'medium'];

  const focalX = data.focalPoint?.x ?? 50;
  const focalY = data.focalPoint?.y ?? 50;

  return (
    <section
      className="relative w-full overflow-hidden bg-black text-white py-20 sm:py-28 lg:py-32 flex items-center justify-center"
      style={{ backgroundColor: data.backgroundColor || '#000000' }}
    >
      {/* Background Image: Desktop & Mobile */}
      <picture className="absolute inset-0 w-full h-full">
        {data.mobileImage && (
          <source media="(max-width: 640px)" srcSet={data.mobileImage} />
        )}
        <img
          src={data.desktopImage}
          alt={data.imageAlt || data.title}
          className="w-full h-full object-cover opacity-75"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          loading="lazy"
        />
      </picture>

      <div className={`absolute inset-0 ${overlayClasses}`} />

      {/* Foreground Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
        {data.eyebrow && (
          <p className="text-xs sm:text-sm font-mono font-bold tracking-[0.25em] uppercase text-brand-blue-soft mb-3">
            {data.eyebrow}
          </p>
        )}

        <h2 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08] mb-4 sm:mb-6">
          {data.title}
        </h2>

        {data.description && (
          <p className="text-sm sm:text-base lg:text-lg text-neutral-300 max-w-xl mx-auto font-light leading-relaxed mb-8">
            {data.description}
          </p>
        )}

        {/* Multi-CTA Link Buttons */}
        {data.ctas && data.ctas.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {data.ctas.map((cta, idx) => {
              const isPrimary = idx === 0;
              return (
                <Link key={cta.label} to={cta.href || '/shop'}>
                  <button
                    type="button"
                    className={`px-6 py-3 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                      isPrimary
                        ? 'bg-brand-blue hover:bg-brand-blue-hover text-white shadow-xl shadow-brand-blue/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-xs'
                    }`}
                  >
                    <span>{cta.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
