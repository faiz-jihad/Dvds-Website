import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  delay?: number;
  y?: number;
  duration?: number;
  stagger?: number;
}) {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    // Check reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !elementRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elementRef.current,
        {
          opacity: 0,
          y: options?.y ?? 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: options?.duration ?? 0.8,
          delay: options?.delay ?? 0,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: elementRef.current,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, elementRef);

    return () => ctx.revert();
  }, [options?.delay, options?.y, options?.duration]);

  return elementRef;
}
