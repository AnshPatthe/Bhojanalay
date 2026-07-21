import * as React from 'react';
import { cn } from '@/utils/cn';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-dark-200 dark:bg-dark-800",
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
