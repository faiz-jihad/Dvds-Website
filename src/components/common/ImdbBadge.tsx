import React from 'react';
import { Star, ExternalLink } from 'lucide-react';
import { getImdbData, getImdbUrl } from '../../lib/imdb';
import { cn } from '../../lib/formatters';

interface ImdbBadgeProps {
  product: {
    title: string;
    imdb_rating?: number | null;
    imdb_id?: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTenSuffix?: boolean;
  asLink?: boolean;
  className?: string;
}

export const ImdbBadge: React.FC<ImdbBadgeProps> = ({
  product,
  size = 'xs',
  showTenSuffix = false,
  asLink = false,
  className,
}) => {
  const data = getImdbData(product);
  const ratingStr = data.rating.toFixed(1);
  const imdbUrl = getImdbUrl(product);

  const sizeStyles = {
    xs: {
      wrap: 'text-[10px] gap-1',
      badge: 'px-1 py-0.2 rounded-[3px] text-[8px] tracking-tight',
      star: 'w-2.5 h-2.5',
      score: 'font-bold text-[10px]',
    },
    sm: {
      wrap: 'text-xs gap-1.5',
      badge: 'px-1.5 py-0.5 rounded text-[9px] tracking-tight',
      star: 'w-3 h-3',
      score: 'font-bold text-xs',
    },
    md: {
      wrap: 'text-sm gap-2',
      badge: 'px-2 py-0.5 rounded text-[11px] font-black tracking-tight',
      star: 'w-3.5 h-3.5',
      score: 'font-bold text-sm',
    },
    lg: {
      wrap: 'text-base gap-2.5',
      badge: 'px-2.5 py-1 rounded text-xs font-black tracking-tight',
      star: 'w-4 h-4',
      score: 'font-bold text-base',
    },
  }[size];

  const content = (
    <span
      className={cn(
        'inline-flex items-center select-none font-sans',
        sizeStyles.wrap,
        asLink && 'group/imdb hover:opacity-90 transition-opacity cursor-pointer',
        className
      )}
      title={`IMDb Rating: ${ratingStr}/10`}
    >
      {/* Iconic IMDb Yellow Emblem */}
      <span
        className={cn(
          'bg-[#F5C518] text-black font-black uppercase font-mono shadow-xs shrink-0',
          sizeStyles.badge
        )}
      >
        IMDb
      </span>

      {/* Star + Score */}
      <span className="inline-flex items-center gap-0.5 font-mono text-neutral-900 font-bold">
        <Star className={cn('fill-amber-400 text-amber-400 shrink-0', sizeStyles.star)} />
        <span className={sizeStyles.score}>{ratingStr}</span>
        {showTenSuffix && <span className="text-[10px] text-neutral-400 font-normal">/10</span>}
      </span>

      {asLink && (
        <ExternalLink className="w-2.5 h-2.5 text-neutral-400 opacity-0 group-hover/imdb:opacity-100 transition-opacity" />
      )}
    </span>
  );

  if (asLink) {
    return (
      <a
        href={imdbUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-block"
      >
        {content}
      </a>
    );
  }

  return content;
};
