import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Disc } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const SpykerEditorialChapter: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleLine1Ref = useRef<HTMLSpanElement>(null);
  const titleLine2Ref = useRef<HTMLSpanElement>(null);
  const paragraphsRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Left side editorial manifesto entrance timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
        },
        defaults: { ease: 'power3.out' },
      });

      tl.fromTo(
        [titleLine1Ref.current, titleLine2Ref.current],
        { opacity: 0, y: 45 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.15 }
      )
        .fromTo(
          paragraphsRef.current?.children ? Array.from(paragraphsRef.current.children) : [],
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.15 },
          '-=0.5'
        )
        .fromTo(
          linkRef.current,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4'
        );

      // Right side staggered cards entrance
      const cards = [card1Ref.current, card2Ref.current, card3Ref.current].filter(Boolean);
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 65,
          scale: 0.97,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card1Ref.current || sectionRef.current,
            start: 'top 82%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Spyker-style subtle scroll parallax on offset Card 2
      if (card2Ref.current) {
        gsap.to(card2Ref.current, {
          y: -30,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#06080b] text-white py-24 sm:py-32 lg:py-40 overflow-hidden border-b border-white/[0.08] select-none"
    >
      {/* Ambient Radial Deep Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(circle 900px at 15% 45%, rgba(45, 65, 105, 0.45) 0%, transparent 100%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Asymmetric Editorial Column / Spyker Pure Passion Style */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 flex flex-col items-start">
            <h2 className="font-display font-black uppercase text-4xl sm:text-6xl lg:text-7xl leading-[0.88] tracking-[-0.03em] text-white mb-8">
              <span ref={titleLine1Ref} className="block overflow-hidden will-change-transform">
                PURE
              </span>
              <span
                ref={titleLine2Ref}
                className="block overflow-hidden text-white/40 will-change-transform"
              >
                PERMANENCE.
              </span>
            </h2>

            <div
              ref={paragraphsRef}
              className="space-y-5 text-sm sm:text-base text-white/70 font-light leading-relaxed max-w-lg mb-10"
            >
              <p className="will-change-transform">
                In an era dominated by expiring streaming licences, algorithmic compression artifacts,
                and sudden digital library deletions, physical media is an act of deliberate cultural
                preservation. A film pressed onto a dual-layer optical disc cannot be altered, censored,
                or wiped from your shelves.
              </p>
              <p className="will-change-transform">
                The AZ Rayan collection is hand-curated by physical media purists in Central London.
                From complete prestige television sagas to historic musical archives, every title is
                verified for optical disc integrity, uncompressed Dolby multi-channel fidelity, and
                tactile slipcase presentation.
              </p>
            </div>

            <Link
              ref={linkRef}
              to="/about"
              className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.2em] text-white hover:text-white/70 transition-colors group border-b border-white/20 pb-1 cursor-pointer will-change-transform"
            >
              <span>Our Archival Philosophy</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1.5" />
            </Link>
          </div>

          {/* Right Floating Staggered Media Grid / Spyker Parallax Style */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-10">
            {/* Card 1: Top Right */}
            <div ref={card1Ref} className="flex flex-col group will-change-transform">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#0b0e15] shadow-2xl border border-white/10 hover:border-white/25 transition-all duration-500">
                <img
                  src="/catalog/the-book-of-boba-fett-season-1.jpeg"
                  alt="Star Wars: The Book of Boba Fett Complete Season 1 DVD Box Set"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 will-change-transform"
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
            <div ref={card2Ref} className="flex flex-col sm:mt-24 group will-change-transform">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#0b0e15] shadow-2xl border border-white/10 hover:border-white/25 transition-all duration-500">
                <img
                  src="/catalog/the-mandalorian-seasons-1-3.jpeg"
                  alt="The Mandalorian Seasons 1-3 Collector Box Set"
                  className="w-full h-full object-cover scale-[1.03] transition-transform duration-700 ease-out group-hover:scale-108 will-change-transform"
                  loading="lazy"
                />
                <div className="absolute top-3.5 left-3.5 bg-black/85 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-white/15 shadow-lg">
                  Complete 24 Episodes
                </div>
                {/* Sleek bottom-right specification badge that neatly frames the media */}
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
              ref={card3Ref}
              className="flex flex-col sm:col-span-2 sm:max-w-lg sm:mx-auto lg:ml-auto group pt-4 sm:pt-0 will-change-transform"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#0b0e15] shadow-2xl border border-white/10 hover:border-white/25 transition-all duration-500">
                <img
                  src="/catalog/the-beatles-get-back.jpeg"
                  alt="The Beatles: Get Back 3-Disc Documentary Archive"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 will-change-transform"
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
