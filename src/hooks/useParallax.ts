import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useParallax<T extends HTMLElement = HTMLDivElement>(speed: number = 0.3) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !ref.current) return;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        y: () => speed * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.5,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [speed]);

  return ref;
}
