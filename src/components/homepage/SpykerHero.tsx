import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Disc3 } from 'lucide-react';
import { gsap } from 'gsap';

export const SpykerHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const headlineLine1Ref = useRef<HTMLSpanElement>(null);
  const headlineLine2Ref = useRef<HTMLSpanElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may wait for user interaction in certain browser modes
      });
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        [headlineLine1Ref.current, headlineLine2Ref.current],
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1, delay: 0.2, stagger: 0.15 }
      )
        .fromTo(
          descRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.5'
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.4'
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[90vh] lg:min-h-screen bg-[#08090A] text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Cinematic Ambient Video Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/lsrzjokx/video/upload/v1789362877/use_english_dan_jangan_ada_tex_gwr_video_mvp.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-55 scale-105 will-change-transform"
        />
        {/* Cinematic Vignette & Radial Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090A] via-[#08090A]/50 to-[#08090A]/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090A]/85 via-transparent to-[#08090A]/85" />
        <div className="absolute inset-0 bg-[#08090A]/20" />
      </div>

      {/* Top Spacer for sticky navbar */}
      <div className="h-20 sm:h-28" />

      {/* Hero Content Center / Spyker Style */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 flex flex-col items-center text-center my-auto">
        {/* Monumental Condensed Headline */}
        <h1 className="font-display font-black uppercase text-4xl min-[380px]:text-5xl sm:text-7xl md:text-8xl lg:text-[108px] leading-[0.88] sm:leading-[0.84] tracking-[-0.03em] text-white mb-6">
          <span ref={headlineLine1Ref} className="block overflow-hidden">
            Films Worth
          </span>
          <span ref={headlineLine2Ref} className="block overflow-hidden text-neutral-300">
            Owning.
          </span>
        </h1>

        {/* Minimalist Editorial Description */}
        <p
          ref={descRef}
          className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl font-light leading-relaxed mb-10 text-balance"
        >
          Boutique DVD box sets, restored British cinema, and definitive collector editions preserved in tangible, uncompressed physical permanence. Dispatched across the UK.
        </p>

        {/* Spyker-Inspired High-End Action CTAs */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            to="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white text-[#08090A] hover:bg-neutral-200 px-9 py-4 rounded-full text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.16em] transition-all duration-300 shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Discover Archive</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/shop?category=tv-box-sets"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white hover:bg-white/5 px-8 py-4 rounded-full text-xs sm:text-sm font-mono font-semibold uppercase tracking-[0.16em] transition-all duration-300 backdrop-blur-sm"
          >
            <Disc3 className="w-4 h-4 text-brand-blue" />
            <span>Complete Box Sets</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
