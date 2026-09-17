"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface TextRevealContextValue {
  progress: number;
  totalTokens: number;
}

const TextRevealContext = createContext<TextRevealContextValue>({
  progress: 0,
  totalTokens: 0,
});

export interface TextRevealProps {
  body: string;
  className?: string;
  style?: React.CSSProperties;
  progress?: number;
  children: (tokens: string[]) => React.ReactNode;
}

export interface TextRevealTokenProps {
  index: number;
  children: React.ReactNode | ((isActive: boolean, tokenProgress: number) => React.ReactNode);
}

export const TextRevealToken: React.FC<TextRevealTokenProps> = ({ index, children }) => {
  const { progress, totalTokens } = useContext(TextRevealContext);

  const step = totalTokens > 0 ? 1 / totalTokens : 1;
  const tokenStart = index * step;
  const tokenEnd = (index + 1) * step;

  // Active when scroll progress reaches or passes this token's threshold
  const isActive = totalTokens > 0 && progress >= (index + 0.3) * step;
  const tokenProgress = Math.max(0, Math.min(1, (progress - tokenStart) / (tokenEnd - tokenStart || 1)));

  if (typeof children === 'function') {
    return <>{children(isActive, tokenProgress)}</>;
  }

  return <>{children}</>;
};

export const TextReveal: React.FC<TextRevealProps> & {
  Token: typeof TextRevealToken;
} = ({ body = '', className = '', style, progress: progressProp, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalProgress, setInternalProgress] = useState(0);

  const effectiveProgress = progressProp !== undefined ? progressProp : internalProgress;

  // Split body into tokens (preserving words and trailing whitespace)
  const tokens = useMemo(() => {
    if (!body) return [];
    const matched = body.match(/\S+\s*/g);
    return matched || body.split(' ');
  }, [body]);

  useEffect(() => {
    if (progressProp !== undefined) return;
    const el = containerRef.current;
    if (!el) return;

    let rafId = 0;

    const updateProgress = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const scrollable = rect.height - vh;

      let p = 0;
      if (scrollable > 10) {
        p = -rect.top / scrollable;
      } else {
        p = (vh * 0.7 - rect.top) / (rect.height + vh * 0.4);
      }

      const clamped = Math.max(0, Math.min(1, p));
      setInternalProgress(clamped);
    };

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateProgress();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [progressProp]);

  return (
    <TextRevealContext.Provider value={{ progress: effectiveProgress, totalTokens: tokens.length }}>
      <div ref={containerRef} className={className} style={style}>
        {children(tokens)}
      </div>
    </TextRevealContext.Provider>
  );
};

TextReveal.Token = TextRevealToken;

export default TextReveal;
