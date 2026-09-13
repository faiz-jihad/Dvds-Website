import React from 'react';
import { cn } from '../../lib/formatters';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full h-11 px-3.5 bg-white border border-gray-300 rounded-md text-sm text-dark placeholder:text-gray-400 transition-colors focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none disabled:bg-gray-50 disabled:text-gray-400',
            error && 'border-brand-red focus:border-brand-red focus:ring-brand-red',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-brand-red font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
