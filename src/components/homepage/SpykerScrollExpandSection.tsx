import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollExpand } from '../motion/ScrollExpand';
import { TextReveal } from '../TextReveal';
import { ChevronRight } from 'lucide-react';

export const SpykerScrollExpandSection: React.FC = () => {
  const manifestoText =
    "Streaming platforms dynamically compress bitrates and silently delete titles without warning. A physical optical disc in your collection is an immutable piece of cinema history that you own forever.";

  return (
    <section className="relative bg-[#050609] border-b border-white/[0.08] select-none">
      <ScrollExpand
        useWindowScroll={true}
        startWidth={84}
        startHeight={78}
        startRadius={20}
        endRadius={0}
        mediaZoom={1.12}
        scrollDistance={1.2}
        holdDistance={0.85}
        smoothing={0}
        overlayScrim={0.75}
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
          <div className="flex flex-col items-center justify-center text-center px-4 max-w-2xl sm:max-w-3xl mx-auto pointer-events-none">
            {/* Monumental Title properly proportioned to fit the cinematic card frame */}
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[0.92] text-white drop-shadow-[0_4px_35px_rgba(0,0,0,0.95)]">
              BUILT FOR <br />
              <span className="text-white/45">PERMANENCE.</span>
            </h2>

            {/* Subline */}
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-mono tracking-[0.2em] text-white/75 uppercase max-w-xl drop-shadow-md">
              Uncompressed Optical Mastering • Sovereign Shelf Ownership
            </p>
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
        {(progress) => {
          // Map scroll progress from [0.40, 0.82] into [0, 1] for word-by-word TextReveal
          const revealProgress = Math.max(0, Math.min(1, (progress - 0.40) / 0.42));

          return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center text-center px-4 my-auto">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase text-white leading-[0.95] drop-shadow-2xl">
                PERMANENCE IS THE <br />
                <span className="text-white/60">ULTIMATE LUXURY.</span>
              </h2>

              {/* Word-by-word Interactive Text Reveal requested by user */}
              <div className="mt-4 sm:mt-5 max-w-2xl mx-auto">
                <TextReveal body={manifestoText} progress={revealProgress}>
                  {(tokens) => (
                    <p className="text-xs sm:text-base md:text-lg leading-relaxed drop-shadow-lg font-light">
                      {tokens.map((token, index) => (
                        <TextReveal.Token key={index} index={index}>
                          {(isActive) => (
                            <span
                              className={`inline-block transition-all duration-200 ${
                                isActive
                                  ? 'text-white opacity-100 font-normal drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                                  : 'text-white/25 opacity-25'
                              }`}
                            >
                              {token}&nbsp;
                            </span>
                          )}
                        </TextReveal.Token>
                      ))}
                    </p>
                  )}
                </TextReveal>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 sm:mt-8 w-full sm:w-auto">
                <Link
                  to="/product/star-wars-the-mandalorian-seasons-1-3"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs tracking-wider uppercase rounded-full transition-all duration-200 shadow-2xl active:scale-95 text-center"
                >
                  <span>ACQUIRE THE MANDALORIAN (£24.99)</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>

                <Link
                  to="/shop"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-mono font-semibold text-xs tracking-wider uppercase rounded-full transition-all duration-200 text-center"
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

export default SpykerScrollExpandSection;
