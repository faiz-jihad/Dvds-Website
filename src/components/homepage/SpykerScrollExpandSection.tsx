import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollExpand } from '../motion/ScrollExpand';
import { BlurReveal } from '../ui/blur-reveal';
import { TextReveal, TextRevealToken } from '../TextReveal';
import { ChevronRight } from 'lucide-react';

/** Word token style — inactive = dim, active = bright with a subtle glow */
const WordToken: React.FC<{ word: string; index: number }> = ({ word, index }) => (
  <TextRevealToken index={index}>
    {(isActive: boolean) => (
      <span
        className="inline-block transition-all duration-500"
        style={{
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.18)',
          textShadow: isActive ? '0 0 24px rgba(255,255,255,0.35)' : 'none',
          transform: isActive ? 'translateY(0)' : 'translateY(4px)',
          filter: isActive ? 'none' : 'blur(0.5px)',
        }}
      >
        {word}
      </span>
    )}
  </TextRevealToken>
);

const BODY_TEXT =
  'Streaming platforms dynamically compress bitrates and silently delete titles without warning. A physical optical disc in your collection is an immutable piece of cinema history that you own forever.';

export const SpykerScrollExpandSection: React.FC = () => {
  return (
    <section className="relative bg-[#050609] border-b border-white/[0.08] select-none">
      <ScrollExpand
        useWindowScroll={true}
        startWidth={60}
        startHeight={64}
        startRadius={20}
        endRadius={0}
        mediaZoom={1.12}
        scrollDistance={0.75}
        holdDistance={0.12}
        smoothing={0}
        overlayScrim={0.72}
        customMedia={
          <div className="relative w-full h-full bg-[#080a0f] overflow-hidden">
            {/* Cinematic Background Media with Iridescent Lighting */}
            <img
              src="/images/hero-physical-media.jpg"
              alt="Physical DVD media master cases and optical disc reflection"
              className="w-full h-full object-cover opacity-60 scale-105 will-change-transform"
              draggable={false}
            />

            {/* Cinematic Radial Vignettes */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06080b] via-transparent to-[#06080b]/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06080b]/90 via-transparent to-[#06080b]/90" />

            {/* Glowing Optical Disc Prismatic Halo in Center */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen"
              style={{
                background:
                  'radial-gradient(circle at 65% 50%, rgba(100, 180, 255, 0.3) 0%, rgba(255, 100, 200, 0.15) 35%, transparent 70%)',
              }}
            />
          </div>
        }
        title={
          <div className="flex flex-col items-center justify-center text-center px-4 max-w-xl sm:max-w-2xl mx-auto pointer-events-none">
            {/* Monumental Title with cinematic BlurReveal character animation */}
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase leading-[0.92] text-white drop-shadow-[0_4px_35px_rgba(0,0,0,0.95)]">
              <BlurReveal
                as="span"
                delay={0.1}
                speedReveal={2.0}
                speedSegment={0.7}
                className="block text-white"
              >
                BUILT FOR
              </BlurReveal>
              <BlurReveal
                as="span"
                delay={0.28}
                speedReveal={2.0}
                speedSegment={0.7}
                className="block text-white/45"
              >
                PERMANENCE.
              </BlurReveal>
            </h2>

            {/* Subline */}
            <BlurReveal
              as="p"
              delay={0.45}
              speedReveal={2.2}
              className="mt-3 text-xs sm:text-sm font-mono tracking-[0.2em] text-white/75 uppercase max-w-md drop-shadow-md"
            >
              Uncompressed Optical Mastering • Sovereign Shelf Ownership
            </BlurReveal>
          </div>
        }
        scrollHint={
          <div className="inline-flex items-center gap-2 sm:gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-black/85 hover:bg-black text-white text-[10px] sm:text-xs font-mono tracking-wider sm:tracking-[0.22em] uppercase border border-white/20 backdrop-blur-md shadow-2xl transition-transform hover:scale-105 cursor-pointer max-w-[92vw]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="truncate">SCROLL TO EXPAND THE VAULT</span>
            <span className="animate-bounce shrink-0">↓</span>
          </div>
        }
      >
        {/* Function-child receives live scroll progress → drives TextReveal */}
        {(progress: number) => {
          // Map 0–1 scroll to 0–1 text reveal range (start at 60% scroll)
          const textProgress = Math.max(0, Math.min(1, (progress - 0.6) / 0.38));

          return (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center p-4 sm:p-10 pt-16 sm:pt-24">
              {/* Headline with BlurReveal */}
              <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase text-white leading-[0.92] max-w-3xl drop-shadow-2xl">
                <BlurReveal as="span" delay={0.1} speedReveal={1.8} className="block text-white">
                  PERMANENCE IS THE
                </BlurReveal>
                <BlurReveal as="span" delay={0.25} speedReveal={1.8} className="block text-white/60">
                  ULTIMATE LUXURY.
                </BlurReveal>
              </h2>

              {/* TextReveal paragraph — word by word as you scroll */}
              <div className="mt-5 sm:mt-6 max-w-2xl">
                <TextReveal
                  body={BODY_TEXT}
                  progress={textProgress}
                  className="text-sm sm:text-base md:text-lg font-light leading-relaxed drop-shadow-lg"
                >
                  {(tokens: string[]) => (
                    <p className="flex flex-wrap justify-center gap-x-[0.28em] gap-y-1">
                      {tokens.map((word, i) => (
                        <WordToken key={i} word={word.trim()} index={i} />
                      ))}
                    </p>
                  )}
                </TextReveal>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-6 sm:mt-8 w-full sm:w-auto max-w-md sm:max-w-none">
                <Link
                  to="/product/star-wars-the-mandalorian-seasons-1-3"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-[11px] sm:text-xs tracking-wider sm:tracking-widest uppercase rounded-full transition-all duration-200 shadow-2xl active:scale-95 text-center"
                >
                  <span>ACQUIRE THE MANDALORIAN 1–3 (£24.99)</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>

                <Link
                  to="/shop"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-mono font-semibold text-[11px] sm:text-xs tracking-wider sm:tracking-widest uppercase rounded-full transition-all duration-200 text-center"
                >
                  <span>BROWSE ALL 11 ARCHIVE DISCS</span>
                </Link>
              </div>
            </div>
          );
        }}
      </ScrollExpand>
    </section>
  );
};
