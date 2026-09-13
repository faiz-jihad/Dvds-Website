import React from 'react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { DvdProductCardSkeleton } from '../common/Skeleton';
import { cn } from '../../lib/formatters';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  className?: string;
  columns?: 3 | 4 | 5;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  className,
  columns = 4,
}) => {
  const colClasses = {
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  };

  if (isLoading) {
    return (
      <div className={cn('grid gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10', colClasses[columns], className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <DvdProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10', colClasses[columns], className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
