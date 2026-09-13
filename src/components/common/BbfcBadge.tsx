import React from 'react';
import { AgeRating } from '../../types';
import { cn } from '../../lib/formatters';

interface BbfcBadgeProps {
  rating: AgeRating | string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const BbfcBadge: React.FC<BbfcBadgeProps> = ({
  rating,
  size = 'xs',
  showLabel = false,
  className,
}) => {
  const cleanRating = (rating || '15').toString().toUpperCase().trim();

  // Official UK BBFC color standards
  const getColors = () => {
    switch (cleanRating) {
      case 'U':
        return 'bg-[#008938] text-white border-[#006e2c]'; // BBFC Green
      case 'PG':
        return 'bg-[#F9BA00] text-black border-[#d9a200]'; // BBFC Yellow
      case '12':
      case '12A':
        return 'bg-[#FF6F00] text-white border-[#d95e00]'; // BBFC Orange
      case '15':
        return 'bg-[#C2185B] text-white border-[#a0134a]'; // BBFC Magenta/Crimson
      case '18':
        return 'bg-[#D32F2F] text-white border-[#b71c1c]'; // BBFC Red
      case 'R18':
        return 'bg-[#1a1a1a] text-red-500 border-red-500';
      default:
        return 'bg-gray-700 text-white border-gray-800';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-4 h-4 text-[9px] font-extrabold';
      case 'sm':
        return 'w-5 h-5 text-[10px] font-extrabold';
      case 'md':
        return 'w-6 h-6 text-xs font-extrabold';
    }
  };

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 align-middle select-none', className)}
      title={`Official BBFC ${cleanRating} Certificate (UK & Ireland)`}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full border shadow-2xs font-mono font-bold tracking-tight',
          getColors(),
          getSizeClasses()
        )}
      >
        {cleanRating}
      </span>
      {showLabel && (
        <span className="text-[11px] font-mono font-medium text-gray-500">
          BBFC {cleanRating}
        </span>
      )}
    </span>
  );
};
