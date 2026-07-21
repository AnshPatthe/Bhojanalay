import * as React from 'react';
import { cn } from '@/utils/cn';

export const Spinner = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3"
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-t-transparent border-brand-600 border-dark-300 dark:border-dark-700",
        sizeClasses[size],
        className
      )}
    />
  );
};

export default Spinner;
