import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { cn } from '../../lib/formatters';
import './AccordionGallery.css';

export interface AccordionGalleryItem {
  image: string;
  label: string;
  link: string;
  alt?: string;
  eyebrow?: string;
  meta?: string;
}

interface AccordionGalleryProps {
  items: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  grayscale?: boolean;
  className?: string;
}

export const AccordionGallery: React.FC<AccordionGalleryProps> = ({
  items,
  defaultIndex = 0,
  accentColor = '#1769e0',
  overlayColor = '#060a12',
  textColor = '#ffffff',
  height = 500,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  duration = 0.65,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 7,
  stagger = 0.06,
  grayscale = true,
  className,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const mediaRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const textRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), Math.max(items.length - 1, 0)));

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = items.length;

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

  const applyLayout = useCallback((animate: boolean) => {
    const panels = panelRefs.current;
    if (!panels.length || count === 0) return;

    const ratio = Math.min(Math.max(expandRatio, 0.2), 0.9);
    const grow = count > 1 ? (ratio * (count - 1)) / (1 - ratio) : 1;
    const mediaSize = mediaSizeRef.current;

    timelineRef.current?.kill();
    const animationDuration = animate && !prefersReduced ? duration : 0;
    const timeline = gsap.timeline();

    panels.forEach((panel, index) => {
      if (!panel) return;
      const isActive = index === active;
      const media = mediaRefs.current[index];
      const bar = barRefs.current[index];
      const text = textRefs.current[index];
      const rotation = isActive ? 0 : index < active ? tilt : -tilt;

      timeline.to(panel, {
        flexGrow: isActive ? grow : 1,
        rotateY: rotation,
        duration: animationDuration,
        ease,
      }, 0);

      if (media) {
        const drift = Math.max(-1.5, Math.min(1.5, active - index));
        const shift = drift * parallax * mediaSize * 0.06;
        timeline.to(media, {
          xPercent: -50,
          yPercent: -50,
          x: isActive ? 0 : shift,
          '--ag-gray': grayscale ? (isActive ? 0 : 1) : 0,
          '--ag-dim': isActive ? 0 : 0.38,
          duration: animationDuration,
          ease,
        }, 0);
      }

      if (bar && text) {
        timeline.to([bar, text], {
          opacity: isActive ? 1 : 0,
          x: isActive ? 0 : -14,
          duration: isActive ? animationDuration : animationDuration * 0.6,
          ease,
          stagger: isActive && !prefersReduced ? stagger : 0,
        }, 0);
      }
    });

    timelineRef.current = timeline;
  }, [active, count, duration, ease, expandRatio, grayscale, parallax, prefersReduced, stagger, tilt]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || count === 0) return;

    const measure = () => {
      const usableWidth = Math.max(root.getBoundingClientRect().width - gap * (count - 1), 120);
      const size = Math.max(140, usableWidth * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      root.style.setProperty('--ag-media-size', `${size}px`);
      applyLayout(!firstRunRef.current);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [applyLayout, count, expandRatio, gap]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
    };
  }, []);

  const handleClick = (index: number, event: React.MouseEvent<HTMLAnchorElement>) => {
    if (index !== active) {
      event.preventDefault();
      setActive(index);
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index + 1) % count);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index - 1 + count) % count);
    }
  };

  if (!items.length) return null;

  return (
    <div
      ref={rootRef}
      className={cn('accordion-gallery', className)}
      style={{
        '--ag-accent': accentColor,
        '--ag-overlay': overlayColor,
        '--ag-text': textColor,
        '--ag-gap': `${gap}px`,
        '--ag-radius': `${radius}px`,
        height: `${height}px`,
      } as React.CSSProperties}
      role="list"
      aria-label="Latest DVD releases"
    >
      {items.map((item, index) => {
        const isActive = index === active;
        return (
          <Link
            key={`${item.link}-${index}`}
            ref={(element) => { panelRefs.current[index] = element; }}
            to={item.link}
            className={cn('ag-panel', isActive && 'ag-panel--active')}
            onClick={(event) => handleClick(index, event)}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            role="listitem"
            aria-current={isActive ? 'true' : undefined}
            aria-label={`${item.label}${item.meta ? `, ${item.meta}` : ''}`}
          >
            <span className="ag-panel__frame">
              <span
                className="ag-panel__media"
                ref={(element) => { mediaRefs.current[index] = element; }}
              >
                <img src={item.image} alt={item.alt || item.label} draggable="false" loading="lazy" />
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>

            <span className="ag-panel__label" aria-hidden="true">
              <span className="ag-panel__bar" ref={(element) => { barRefs.current[index] = element; }} />
              <span className="ag-panel__copy" ref={(element) => { textRefs.current[index] = element; }}>
                {item.eyebrow && <span className="ag-panel__eyebrow">{item.eyebrow}</span>}
                <span className="ag-panel__text">{item.label}</span>
                {item.meta && <span className="ag-panel__meta">{item.meta}</span>}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
};
