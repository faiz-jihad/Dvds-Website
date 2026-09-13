import React from 'react';
import { Disc } from 'lucide-react';
import { Button } from './Button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  actionHref,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-5">
        {icon || <Disc className="w-8 h-8 stroke-[1.5]" />}
      </div>
      <h3 className="font-display font-bold text-xl text-dark tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && actionHref && (
        <Link to={actionHref}>
          <Button variant="primary">{actionText}</Button>
        </Link>
      )}
      {actionText && !actionHref && onAction && (
        <Button variant="primary" onClick={onAction}>{actionText}</Button>
      )}
    </div>
  );
};
