import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { HeroSectionConfig } from '../../types/homepage';
import { Button } from '../common/Button';
import { AnimatedContent } from '../motion/AnimatedContent';
import { SplitText } from '../motion/SplitText';
import { useIntroEntry } from '../intro/IntroContext';

interface HeroSectionProps {
  data: HeroSectionConfig;
  startsAt?: string;
  endsAt?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ data, startsAt, endsAt }) => {
  const prefersReducedMotion = useReducedMotion();
  const introEntry = useIntroEntry();
  const reduceMotion = prefersReducedMotion || introEntry;
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
      data-intro-hero
      className="relative w-full overflow-hidden bg-black text-white min-h-[500px] sm:min-h-[580px] lg:min-h-[72vh] flex items-end"
      style={{ backgroundColor: data.backgroundColor || '#000000' }}
    >
      {/* Background Images: Desktop & Dedicated Mobile */}
      <picture className="absolute inset-0 w-full h-full">
        {data.mobileImage && (
          <source media="(max-width: 640px)" srcSet={data.mobileImage} />
        )}
        <motion.img
          data-intro-media
          src={data.desktopImage}
          alt={data.imageAlt || data.title}
          className="w-full h-full object-cover will-change-transform"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          fetchPriority="high"
          initial={reduceMotion ? false : { scale: 1.08, opacity: 0.78 }}
          animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
          transition={{ duration: 1.65, ease: [0.22, 1, 0.36, 1] }}
        />
      </picture>

      {/* Configurable Cinematic Overlay */}
      <div className={`absolute inset-0 ${overlayClasses}`} />
      <motion.div
        aria-hidden="true"
        className="absolute -left-1/4 top-0 h-full w-2/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent blur-2xl"
        initial={reduceMotion ? false : { x: '-45%', opacity: 0 }}
        animate={reduceMotion ? undefined : { x: '205%', opacity: [0, 0.8, 0] }}
        transition={{ duration: 1.9, delay: 0.35, ease: 'easeInOut' }}
      />

      {/* Hero Content Container */}
      <div className="relative z-10 w-full max-w-container mx-auto px-4 sm:px-6 md:px-12 py-12 sm:py-16 lg:py-20">
        <div className={`flex flex-col max-w-3xl ${alignmentClasses}`}>
          {data.eyebrow && (
            <AnimatedContent disabled={introEntry} delay={0.05} distance={18}>
              <span className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brand-blue-soft sm:text-xs">
                <span className="h-px w-8 bg-brand-blue" />
                {data.eyebrow}
              </span>
            </AnimatedContent>
          )}

          {/* Title */}
          {introEntry ? <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tighter text-white leading-[1.03] mb-4 sm:mb-5 drop-shadow-sm">
            <span className="block overflow-hidden"><span data-intro-title className="block">{data.title}</span></span>
          </h1> : <SplitText
            text={data.title}
            className="font-display font-black text-3xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tighter text-white leading-[1.03] mb-4 sm:mb-5 drop-shadow-sm"
          />}

          {/* Description */}
          {data.description && (
            <AnimatedContent disabled={introEntry} delay={0.38} distance={22}>
              <p data-intro-description className="text-sm sm:text-base lg:text-lg text-neutral-300 max-w-2xl leading-relaxed mb-6 sm:mb-8 font-light drop-shadow-xs">
                {data.description}
              </p>
            </AnimatedContent>
          )}

          {/* Action CTAs */}
          <div data-intro-cta><AnimatedContent disabled={introEntry} className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1" delay={0.52} distance={20}>
            {data.primaryCta && data.primaryCta.label && (
              <motion.div whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to={data.primaryCta.href || '/shop'}>
                  <Button
                    size="lg"
                    className="rounded-full px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xl shadow-brand-blue/25 hover:shadow-brand-blue/40 transition-all active:scale-98"
                  >
                    {data.primaryCta.label}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            )}

            {data.secondaryCta && data.secondaryCta.label && (
              <motion.div whileHover={prefersReducedMotion ? undefined : { y: -3 }} whileTap={{ scale: 0.98 }}>
                <Link to={data.secondaryCta.href || '/shop?filter=new'}>
                  <button
                    type="button"
                    className="px-7 py-3.5 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider text-white border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-xs transition-all active:scale-98"
                  >
                    {data.secondaryCta.label}
                  </button>
                </Link>
              </motion.div>
            )}
          </AnimatedContent></div>
        </div>
      </div>

      <motion.div
        aria-hidden="true"
        className="absolute bottom-7 right-6 z-10 hidden items-center gap-3 text-[9px] font-mono font-bold uppercase tracking-[0.28em] text-white/60 md:flex lg:right-12"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={reduceMotion ? undefined : { opacity: 1 }}
        transition={{ delay: 1.05, duration: 0.7 }}
      >
        <span>Scroll to explore</span>
        <span className="relative h-px w-14 overflow-hidden bg-white/25">
          <motion.span
            className="absolute inset-y-0 left-0 w-1/2 bg-white"
            animate={reduceMotion ? undefined : { x: ['-110%', '220%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.div>
    </section>
  );
};
