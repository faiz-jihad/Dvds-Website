import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '../../lib/formatters';

gsap.registerPlugin(ScrollTrigger);

interface RevealImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export const RevealImage: React.FC<RevealImageProps> = ({
  containerClassName,
  className,
  alt,
  src,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !containerRef.current || !imgRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        imgRef.current,
        {
          scale: 1.08,
          opacity: 0.8,
        },
        {
          scale: 1,
          opacity: 1,
          duration: 1.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={cn('overflow-hidden relative', containerClassName)}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        className={cn('w-full h-full object-cover transition-transform duration-500 will-change-transform', className)}
        {...props}
      />
    </div>
  );
};
