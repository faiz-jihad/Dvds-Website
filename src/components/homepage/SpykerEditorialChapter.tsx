import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export const SpykerEditorialChapter: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Check if already in viewport on mount (e.g. after scroll / refresh)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setIsVisible(true);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight * 0.9) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.05, rootMargin: '100px 0px 0px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 w-full bg-[#06080b] text-white py-16 sm:py-28 lg:py-40 border-b border-white/[0.08] select-none"
    >
      {/* Ambient Radial Deep Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(circle 900px at 15% 45%, rgba(45, 65, 105, 0.45) 0%, transparent 100%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Asymmetric Editorial Column / Sticky Pure Passion Style */}
          <div
            className={`lg:col-span-5 lg:sticky lg:top-32 flex flex-col items-start transition-all duration-700 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="font-display font-black uppercase text-3xl min-[380px]:text-4xl sm:text-6xl lg:text-7xl leading-[0.92] sm:leading-[0.88] tracking-[-0.03em] text-white mb-6 sm:mb-8">
              <span className="block overflow-hidden">PURE</span>
              <span className="block overflow-hidden text-white/40">PERMANENCE.</span>
            </h2>

            <div className="space-y-5 text-sm sm:text-base text-white/70 font-light leading-relaxed max-w-lg mb-10">
              <p>
                In an era dominated by expiring streaming licences, algorithmic compression artifacts,
                and sudden digital library deletions, physical media is an act of deliberate cultural
                preservation. A film pressed onto a dual-layer optical disc cannot be altered, censored,
                or wiped from your shelves.
              </p>
              <p>
                The DVDs Zone collection is hand-curated by physical media purists in the United Kingdom.
                From complete prestige television sagas to historic musical archives, every title is
                verified for optical disc integrity, uncompressed Dolby multi-channel fidelity, and
                tactile slipcase presentation.
              </p>
            </div>

            <Link
              to="/about"
              className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.2em] text-white hover:text-white/70 transition-colors group border-b border-white/20 pb-1 cursor-pointer"
            >
              <span>Our Archival Philosophy</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1.5" />
            </Link>
          </div>

          {/* Right Floating Staggered Media Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-10">
            {/* Card 1: Top Right */}
            <div
              className={`flex flex-col group transition-all duration-700 delay-100 ease-out ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
              }`}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#0b0e15] shadow-2xl border border-white/10 hover:border-white/25 transition-all duration-500">
                <img
                  src="/catalog/the-book-of-boba-fett-season-1.jpeg"
                  alt="Star Wars: The Book of Boba Fett Complete Season 1 DVD Box Set"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3.5 left-3.5 bg-black/85 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-white/15 shadow-lg">
                  Boutique Box Set
                </div>
                <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-white/70 text-[9px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/10">
                  7 EPISODES • DOLBY 5.1
                </div>
              </div>
              <figcaption className="mt-4 text-xs font-light text-white/60 leading-relaxed">
                <strong className="font-semibold text-white block mb-1 font-sans text-xs uppercase tracking-wider group-hover:text-white transition-colors">
                  Star Wars: The Book of Boba Fett — Complete Season 1
                </strong>
                Complete seven-episode live-action Lucasfilm series presented in 16:9 anamorphic
                widescreen with spatial Dolby Digital 5.1 audio tracks and full sleeve art.
              </figcaption>
            </div>

            {/* Card 2: Offset Lower / Middle */}
            <div
              className={`flex flex-col sm:mt-24 group transition-all duration-700 delay-200 ease-out ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
              }`}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#0b0e15] shadow-2xl border border-white/10 hover:border-white/25 transition-all duration-500">
                <img
                  src="/catalog/the-mandalorian-seasons-1-3.jpeg"
                  alt="The Mandalorian Seasons 1-3 Collector Box Set"
                  className="w-full h-full object-cover scale-[1.03] transition-transform duration-700 ease-out group-hover:scale-108"
                  loading="lazy"
                />
                <div className="absolute top-3.5 left-3.5 bg-black/85 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-white/15 shadow-lg">
                  Complete 24 Episodes
                </div>
                <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md text-white/80 text-[9px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/15 shadow-md">
                  24.00 FPS • DVD-9 MASTER
                </div>
              </div>
              <figcaption className="mt-4 text-xs font-light text-white/60 leading-relaxed">
                <strong className="font-semibold text-white block mb-1 font-sans text-xs uppercase tracking-wider group-hover:text-white transition-colors">
                  The Mandalorian — Seasons 1–3 Collector Slipcase
                </strong>
                All 24 saga chapters of Din Djarin and Grogu in uncompressed disc transfers. Housed in a
                custom illustrated collector slipcase with comprehensive episode booklets.
              </figcaption>
            </div>

            {/* Card 3: Offset Lower Right */}
            <div
              className={`flex flex-col sm:col-span-2 sm:max-w-lg sm:mx-auto lg:ml-auto group pt-4 sm:pt-0 transition-all duration-700 delay-300 ease-out ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
              }`}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#0b0e15] shadow-2xl border border-white/10 hover:border-white/25 transition-all duration-500">
                <img
                  src="/catalog/the-beatles-get-back.jpeg"
                  alt="The Beatles: Get Back 3-Disc Documentary Archive"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3.5 left-3.5 bg-black/85 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-white/15 shadow-lg flex items-center gap-1.5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  <span>3-Disc Historical Master</span>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-white/70 text-[9px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/10">
                  468 MINS • ROOFTOP PERFORMANCE
                </div>
              </div>
              <figcaption className="mt-4 text-xs font-light text-white/60 leading-relaxed">
                <strong className="font-semibold text-white block mb-1 font-sans text-xs uppercase tracking-wider group-hover:text-white transition-colors">
                  The Beatles: Get Back — Peter Jackson 3-Part Archive
                </strong>
                Over 468 minutes of meticulously restored January 1969 Apple Studio sessions
                culminating in the legendary central London rooftop performance.
              </figcaption>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpykerEditorialChapter;
