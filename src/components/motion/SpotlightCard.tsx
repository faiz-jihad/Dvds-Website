import React, { useRef } from 'react';
import { cn } from '../../lib/formatters';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  spotlightColor = 'rgba(23, 105, 224, 0.16)',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!rootRef.current || event.pointerType === 'touch') return;
    const bounds = rootRef.current.getBoundingClientRect();
    rootRef.current.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    rootRef.current.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
  };

  return (
    <div
      ref={rootRef}
      onPointerMove={handlePointerMove}
      className={cn('group/spotlight relative isolate', className)}
      style={{
        '--spotlight-x': '50%',
        '--spotlight-y': '50%',
      } as React.CSSProperties}
    >
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--spotlight-x) var(--spotlight-y), ${spotlightColor}, transparent 46%)`,
        }}
      />
    </div>
  );
};
