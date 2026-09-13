import React from 'react';
import { cn } from '../../lib/formatters';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'new' | 'sale' | 'best-seller' | 'low-stock' | 'format' | 'neutral' | 'age';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-sm select-none';

  const variants = {
    new: 'bg-brand-blue text-white font-bold',
    sale: 'bg-brand-red text-white font-bold',
    'best-seller': 'bg-dark text-white',
    'low-stock': 'bg-amber-600 text-white',
    format: 'bg-gray-100 text-dark border border-gray-200 font-medium',
    neutral: 'bg-gray-100 text-gray-700',
    age: 'border border-gray-400 text-dark font-mono text-[10px] w-6 h-6 rounded-full p-0 flex items-center justify-center',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
};
