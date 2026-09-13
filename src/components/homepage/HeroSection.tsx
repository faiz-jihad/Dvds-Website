import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { HeroSectionConfig } from '../../types/homepage';
import { Button } from '../common/Button';

interface HeroSectionProps {
  data: HeroSectionConfig;
  startsAt?: string;
  endsAt?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ data, startsAt, endsAt }) => {
  const now = Date.now();
  if (startsAt && Date.parse(startsAt) > now) return null;
  if (endsAt && Date.parse(endsAt) < now) return null;

  const overlayClasses = {
    none: 'bg-transparent',
    light: 'bg-gradient-to-t from-black/60 via-black/25 to-transparent',
    medium: 'bg-gradient-to-t from-black/80 via-black/45 to-black/20',
    strong: 'bg-gradient-to-t from-black/95 via-black/70 to-black/40',
  }[data.overlay || 'medium'];

  const alignmentClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center mx-auto',
    right: 'items-end text-right ml-auto',
  }[data.textAlignment || 'left'];

  const focalX = data.focalPoint?.x ?? 50;
  const focalY = data.focalPoint?.y ?? 50;

  return (
    <section
      className="relative w-full overflow-hidden bg-black text-white min-h-[500px] sm:min-h-[580px] lg:min-h-[72vh] flex items-end"
      style={{ backgroundColor: data.backgroundColor || '#000000' }}
    >
      {/* Background Images: Desktop & Dedicated Mobile */}
      <picture className="absolute inset-0 w-full h-full">
        {data.mobileImage && (
          <source media="(max-width: 640px)" srcSet={data.mobileImage} />
        )}
        <img
          src={data.desktopImage}
          alt={data.imageAlt || data.title}
          className="w-full h-full object-cover transition-transform duration-1000 ease-out will-change-transform"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          fetchPriority="high"
        />
      </picture>

      {/* Configurable Cinematic Overlay */}
      <div className={`absolute inset-0 ${overlayClasses}`} />

      {/* Hero Content Container */}
      <div className="relative z-10 w-full max-w-container mx-auto px-4 sm:px-6 md:px-12 py-12 sm:py-16 lg:py-20">
        <div className={`flex flex-col max-w-3xl ${alignmentClasses}`}>
          {/* Eyebrow */}
          {data.eyebrow && (
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono font-bold tracking-[0.22em] uppercase text-brand-blue-soft bg-brand-blue/20 border border-brand-blue/30 px-3.5 py-1.5 rounded-full mb-4 sm:mb-5 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
              {data.eyebrow}
            </span>
          )}

          {/* Title */}
          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tighter text-white leading-[1.03] mb-4 sm:mb-5 drop-shadow-sm">
            {data.title}
          </h1>

          {/* Description */}
          {data.description && (
            <p className="text-sm sm:text-base lg:text-lg text-neutral-300 max-w-2xl leading-relaxed mb-6 sm:mb-8 font-light drop-shadow-xs">
              {data.description}
            </p>
          )}

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
            {data.primaryCta && data.primaryCta.label && (
              <Link to={data.primaryCta.href || '/shop'}>
                <Button
                  size="lg"
                  className="rounded-full px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xl shadow-brand-blue/25 hover:shadow-brand-blue/40 transition-all active:scale-98"
                >
                  {data.primaryCta.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}

            {data.secondaryCta && data.secondaryCta.label && (
              <Link to={data.secondaryCta.href || '/shop?filter=new'}>
                <button
                  type="button"
                  className="px-7 py-3.5 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider text-white border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-xs transition-all active:scale-98"
                >
                  {data.secondaryCta.label}
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
