import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollExpand } from '../motion/ScrollExpand';
import { ChevronRight } from 'lucide-react';

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
        scrollDistance={1.1}
        holdDistance={0.45}
        smoothing={0.04}
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
            {/* Monumental Title properly proportioned to stay inside card */}
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase leading-[0.92] text-white drop-shadow-[0_4px_35px_rgba(0,0,0,0.95)]">
              BUILT FOR <br />
              <span className="text-white/45">PERMANENCE.</span>
            </h2>

            {/* Subline */}
            <p className="mt-3 text-xs sm:text-sm font-mono tracking-[0.2em] text-white/75 uppercase max-w-md drop-shadow-md">
              Uncompressed Optical Mastering • Sovereign Shelf Ownership
            </p>
          </div>
        }
        scrollHint={
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/85 hover:bg-black text-white text-xs font-mono tracking-[0.22em] uppercase border border-white/20 backdrop-blur-md shadow-2xl transition-transform hover:scale-105 cursor-pointer">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>SCROLL TO EXPAND THE VAULT</span>
            <span className="animate-bounce">↓</span>
          </div>
        }
      >
        {/* Full-width Expanded Canvas Content */}
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center p-6 sm:p-10 pt-20 sm:pt-24">
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase text-white leading-[0.92] max-w-3xl drop-shadow-2xl">
            PERMANENCE IS THE <br />
            <span className="text-white/60">ULTIMATE LUXURY.</span>
          </h2>

          <p className="mt-5 text-sm sm:text-base md:text-lg text-white/80 max-w-2xl font-light leading-relaxed drop-shadow-lg">
            Streaming platforms dynamically compress bitrates and silently delete titles without warning.
            A physical optical disc in your collection is an immutable piece of cinema history that you own forever.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
            <Link
              to="/product/star-wars-the-mandalorian-seasons-1-3"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs tracking-widest uppercase rounded-full transition-all duration-200 shadow-2xl active:scale-95"
            >
              <span>ACQUIRE THE MANDALORIAN 1–3 (£24.99)</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-mono font-semibold text-xs tracking-widest uppercase rounded-full transition-all duration-200"
            >
              <span>BROWSE ALL 11 ARCHIVE DISCS</span>
            </Link>
          </div>
        </div>
      </ScrollExpand>
    </section>
  );
};
