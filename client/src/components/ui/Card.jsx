import * as React from 'react';
import { cn } from '@/utils/cn';

export const Card = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-dark-200 dark:border-dark-850 bg-white dark:bg-dark-900 text-dark-900 dark:text-white shadow-sm overflow-hidden",
        className
      )}
      {...props}
    />
  );
};

export const CardHeader = ({ className, ...props }) => {
  return <div className={cn("flex flex-col space-y-1.5 p-6 border-b border-dark-100 dark:border-dark-800", className)} {...props} />;
};

export const CardTitle = ({ className, ...props }) => {
  return <h3 className={cn("text-lg font-semibold leading-none tracking-tight font-heading", className)} {...props} />;
};

export const CardDescription = ({ className, ...props }) => {
  return <p className={cn("text-sm text-dark-500 dark:text-dark-400", className)} {...props} />;
};

export const CardContent = ({ className, ...props }) => {
  return <div className={cn("p-6", className)} {...props} />;
};

export const CardFooter = ({ className, ...props }) => {
  return <div className={cn("flex items-center p-6 pt-0 border-t border-dark-100 dark:border-dark-800 mt-6", className)} {...props} />;
};

export default Card;
