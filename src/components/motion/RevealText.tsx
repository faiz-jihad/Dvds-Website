import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '../../lib/formatters';

gsap.registerPlugin(ScrollTrigger);

interface RevealTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span';
}

export const RevealText: React.FC<RevealTextProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.7,
  as: Component = 'div',
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !containerRef.current || !textRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        textRef.current,
        {
          yPercent: 100,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [delay, duration]);

  return (
    <div ref={containerRef} className={cn('overflow-hidden inline-block leading-tight', className)} {...props}>
      <Component ref={textRef as any} className="will-change-transform inline-block">
        {children}
      </Component>
    </div>
  );
};
