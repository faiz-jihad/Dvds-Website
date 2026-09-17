import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ScrollExpand.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

export interface ScrollExpandProps {
  src?: string;
  mediaType?: 'image' | 'video';
  poster?: string;
  alt?: string;
  title?: React.ReactNode;
  scrollHint?: React.ReactNode;
  customMedia?: React.ReactNode;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  children?: React.ReactNode | ((progress: number) => React.ReactNode);
  className?: string;
  style?: React.CSSProperties;
}

export const ScrollExpand: React.FC<ScrollExpandProps> = ({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  scrollHint = '',
  customMedia,
  startWidth = 84,
  startHeight = 78,
  startRadius = 20,
  endRadius = 0,
  mediaZoom = 1.10,
  scrollDistance = 1.2,
  holdDistance = 0.8,
  smoothing = 0,
  overlayScrim = 0.72,
  useWindowScroll = false,
  enabled = true,
  children,
  className = '',
  style,
  ...rest
}) => {
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const stageHRef = useRef<number>(0);

  const setProgressRef = useRef(setProgress);
  useEffect(() => { setProgressRef.current = setProgress; }, [setProgress]);

  const propsRef = useRef({
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled,
  });

  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled,
  };

  const applyProgress = useCallback((p: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;
    const c = propsRef.current;

    const e = smoothstep(0, 1, p);

    // Responsive initial card sizing
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const baseW = isMobile ? 88 : c.startWidth;
    const baseH = isMobile ? 56 : c.startHeight;

    const w = baseW + (100 - baseW) * e;
    const h = baseH + (100 - baseH) * e;
    const ix = Math.max(0, (100 - w) / 2);
    const iy = Math.max(0, (100 - h) / 2);
    const r = c.startRadius + (c.endRadius - c.startRadius) * e;
    frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;

    media.style.transform = `scale(${c.mediaZoom + (1 - c.mediaZoom) * e})`;

    if (scrimRef.current) {
      scrimRef.current.style.opacity = `${c.overlayScrim * e}`;
    }

    // Hint: fades out smoothly as soon as scrolling initiates (0% -> 15%)
    if (hintRef.current) {
      const gone = smoothstep(0, 0.15, p);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${15 * gone}px, 0)`;
      hintRef.current.style.pointerEvents = p < 0.10 ? 'auto' : 'none';
    }

    // Title: stays crisp and visible from 0% to 18%, then dissolves smoothly during 18% -> 48%
    if (titleRef.current) {
      const out = smoothstep(0.18, 0.48, p);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `translate3d(0, ${-25 * out}px, 0) scale(${1 + 0.02 * out})`;
      titleRef.current.style.pointerEvents = 'none';
    }

    // Overlay (expanded content): starts emerging at 38% for seamless cross-fade, fully active by 68%
    if (overlayRef.current) {
      const inn = smoothstep(0.38, 0.68, p);
      overlayRef.current.style.opacity = `${inn}`;
      overlayRef.current.style.transform = `translate3d(0, ${20 * (1 - inn)}px, 0)`;
      overlayRef.current.style.pointerEvents = p > 0.60 ? 'auto' : 'none';
    }

    // Expose progress to React for function-children (TextReveal etc)
    setProgressRef.current(p);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let current = 0;
    let target = 0;
    let stageH = 0;
    let running = false;

    const measure = () => {
      const c = propsRef.current;
      stageH = c.useWindowScroll ? window.innerHeight : root.clientHeight;
      stageHRef.current = stageH;
      if (stageH <= 0) return;

      stage.style.height = `${stageH}px`;
      stage.style.top = '0px';

      const scrollSpan = stageH * Math.max(0.01, c.scrollDistance);
      const holdSpan = stageH * Math.max(0, c.holdDistance);
      track.style.height = `${stageH + scrollSpan + holdSpan}px`;

      const w = root.clientWidth || window.innerWidth;
      stage.style.setProperty('--se-title-size', `${clamp(w * 0.06, 24, 72)}px`);
    };

    const readProgress = () => {
      const c = propsRef.current;
      if (!c.enabled) return 1;
      const scrollSpan = stageH * Math.max(0.01, c.scrollDistance);

      if (c.useWindowScroll) {
        const rect = track.getBoundingClientRect();
        const scrolled = -rect.top;
        return clamp(scrolled / scrollSpan, 0, 1);
      }

      return clamp(root.scrollTop / scrollSpan, 0, 1);
    };

    const tick = () => {
      const c = propsRef.current;
      const k = c.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * c.smoothing));
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      applyProgress(current);
      raf = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();
    target = readProgress();
    current = target;
    applyProgress(current);

    const scroller = useWindowScroll ? window : root;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(root);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

  const handleHintClick = useCallback(() => {
    const c = propsRef.current;
    const stageH = stageHRef.current || window.innerHeight;
    const scrollSpan = stageH * Math.max(0.01, c.scrollDistance);
    if (c.useWindowScroll && trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const targetY = window.scrollY + rect.top + scrollSpan * 0.95;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    } else if (rootRef.current) {
      rootRef.current.scrollTo({ top: scrollSpan * 0.95, behavior: 'smooth' });
    }
  }, []);

  const media =
    mediaType === 'video' ? (
      <video
        ref={mediaRef as unknown as React.RefObject<HTMLVideoElement>}
        className="scroll-expand__media"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
      />
    ) : (
      <img
        ref={mediaRef as unknown as React.RefObject<HTMLImageElement>}
        className="scroll-expand__media"
        src={src}
        alt={alt}
        draggable={false}
      />
    );

  return (
    <div
      ref={rootRef}
      className={`scroll-expand ${useWindowScroll ? '' : 'scroll-expand--scroller'} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className="scroll-expand__track">
        <div ref={stageRef} className="scroll-expand__stage">
          <div ref={frameRef} className="scroll-expand__frame">
            {customMedia ? (
              <div
                ref={mediaRef as unknown as React.RefObject<HTMLDivElement>}
                className="scroll-expand__media"
              >
                {customMedia}
              </div>
            ) : (
              media
            )}
            <div ref={scrimRef} className="scroll-expand__scrim" />
            {children ? (
              <div ref={overlayRef} className="scroll-expand__overlay">
                {typeof children === 'function' ? children(progress) : children}
              </div>
            ) : null}
          </div>
          {title ? (
            <div ref={titleRef} className="scroll-expand__title">
              {title}
            </div>
          ) : null}
          {scrollHint ? (
            <div
              ref={hintRef}
              className="scroll-expand__hint"
              onClick={handleHintClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleHintClick();
                }
              }}
            >
              {scrollHint}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;
