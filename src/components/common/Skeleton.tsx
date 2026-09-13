import React from 'react';
import { cn } from '../../lib/formatters';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-pulse rounded-sm bg-gray-200', className)}
      {...props}
    />
  );
};

export const DvdProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col">
      <div className="w-full aspect-[2/3] bg-gray-200 rounded-sm animate-pulse mb-3" />
      <div className="h-3 w-16 bg-gray-200 rounded-sm animate-pulse mb-2" />
      <div className="h-5 w-3/4 bg-gray-200 rounded-sm animate-pulse mb-2" />
      <div className="h-4 w-1/3 bg-gray-200 rounded-sm animate-pulse" />
    </div>
  );
};
