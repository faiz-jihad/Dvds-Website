import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/formatters';

interface StarRatingProps {
  rating: number; // 0 to 5 (can be fractional like 4.5)
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showCount?: boolean;
  count?: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showCount = false,
  count,
  className,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const currentRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = currentRating >= starValue;
          const isHalf = !isFilled && currentRating >= starValue - 0.5;

          return (
            <button
              key={index}
              type={interactive ? 'button' : undefined}
              disabled={!interactive}
              onClick={() => interactive && onRatingChange?.(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              className={cn(
                'relative transition-transform duration-150',
                interactive ? 'cursor-pointer hover:scale-115 p-0.5 focus:outline-none' : 'cursor-default p-0'
              )}
              aria-label={interactive ? `${starValue} star${starValue > 1 ? 's' : ''}` : undefined}
            >
              <Star
                className={cn(
                  starSizes[size],
                  'transition-colors',
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]'
                    : isHalf
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'fill-transparent text-gray-300 dark:text-gray-700'
                )}
              />
            </button>
          );
        })}
      </div>

      {showCount && count !== undefined && count > 0 && (
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
          ({count})
        </span>
      )}
    </div>
  );
};
