import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '../common/Button';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

export const BrandDiscScroll: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !sectionRef.current || !discRef.current) return;

    const ctx = gsap.context(() => {
      // Disc rotates smoothly linked to scroll progress (not endlessly)
      gsap.fromTo(
        discRef.current,
        {
          rotation: -35,
          xPercent: 10,
        },
        {
          rotation: 65,
          xPercent: -5,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );

      // Subtle parallax on text
      if (textRef.current) {
        gsap.to(textRef.current, {
          yPercent: -15,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-dark text-white overflow-hidden py-28 md:py-40 my-16 border-y border-neutral-800"
    >
      {/* Background Watermark Typography */}
      <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none opacity-5">
        <span className="font-display font-extrabold text-[18vw] uppercase tracking-tighter text-white">
          DISC ARCHIVE
        </span>
      </div>

      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Editorial Text Content */}
        <div ref={textRef} className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-xs font-mono text-brand-blue-soft">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
            <span>THE PHYSICAL MEDIA ADVANTAGE</span>
          </div>

          <h2 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight leading-[1.08] text-white">
            Build a collection <br />
            <span className="text-neutral-400">worth keeping.</span>
          </h2>

          <p className="text-neutral-400 text-base md:text-lg max-w-xl font-light leading-relaxed">
            Streaming licenses expire and catalogues vanish overnight. A physical DVD collection belongs to you permanently — with uncompressed commentaries, deleted scenes, tangible cover art, and the ceremony of sliding a disc into the player.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link to="/shop">
              <Button variant="primary" size="lg">
                Explore The Vault
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="lg" className="border-neutral-700 text-white hover:bg-neutral-900 hover:border-white">
                Our Preservation Ethos
              </Button>
            </Link>
          </div>
        </div>

        {/* Oversized Cinematic DVD Disc Graphic */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
          <div
            ref={discRef}
            className="w-72 h-72 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] relative pointer-events-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] will-change-transform"
          >
            <img
              src="/brand/disc-motif.svg"
              alt="AZ Rayan DVD Disc Motif"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
