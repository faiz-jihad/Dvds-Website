import React from 'react';
import { cn } from '../../lib/formatters';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  badge?: React.ReactNode;
  badgeText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, badge, badgeText, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-brand-blue text-white hover:bg-brand-blue-hover shadow-sm',
      secondary: 'bg-white text-dark border border-gray-300 hover:border-dark hover:bg-gray-50',
      outline: 'bg-transparent text-dark border border-gray-200 hover:border-gray-400 hover:bg-gray-50',
      ghost: 'bg-transparent text-dark hover:bg-gray-100',
      destructive: 'bg-brand-red text-white hover:bg-brand-red-hover shadow-sm',
      dark: 'bg-dark text-white hover:bg-black shadow-sm',
    };

    const sizes = {
      sm: 'h-9 px-3.5 text-xs rounded-sm gap-1.5',
      md: 'h-11 px-5 text-sm rounded-md gap-2',
      lg: 'h-12 px-7 text-base rounded-md gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
        {badgeText && (
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/20 text-current border border-white/25">
            {badgeText}
          </span>
        )}
        {badge && <span className="ml-2 inline-flex items-center">{badge}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
