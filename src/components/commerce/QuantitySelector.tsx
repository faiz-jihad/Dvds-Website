import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/formatters';

interface QuantitySelectorProps {
  quantity: number;
  max?: number;
  min?: number;
  onChange: (quantity: number) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  max = 99,
  min = 1,
  onChange,
  className,
  size = 'md',
}) => {
  const handleDecrement = () => {
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  const heights = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-[#141A26] select-none',
        heights[size],
        className
      )}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={quantity <= min}
        className="px-2.5 h-full flex items-center justify-center text-gray-500 hover:text-dark dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
        aria-label="Decrease quantity"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-9 text-center font-semibold text-dark dark:text-white font-mono">
        {quantity}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={quantity >= max}
        className="px-2.5 h-full flex items-center justify-center text-gray-500 hover:text-dark dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
        aria-label="Increase quantity"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
