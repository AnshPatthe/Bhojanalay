import * as React from 'react';
import { cn } from '@/utils/cn';

export const Avatar = ({ src, name, size = 'md', className }) => {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg"
  };

  const getInitials = (n) => {
    if (!n) return '';
    return n.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-dark-100 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 items-center justify-center font-semibold text-dark-600 dark:text-dark-300 select-none",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};

export default Avatar;
