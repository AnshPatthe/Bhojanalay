import * as React from 'react';
import { cn } from '@/utils/cn';

export const Radio = React.forwardRef(({ className, label, ...props }, ref) => {
  return (
    <label className="flex items-center space-x-2 cursor-pointer select-none">
      <input
        type="radio"
        className={cn(
          "h-4 w-4 border-dark-300 text-brand-600 focus:ring-brand-500 dark:border-dark-800 dark:bg-dark-900 transition-colors cursor-pointer",
          className
        )}
        ref={ref}
        {...props}
      />
      {label && (
        <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
          {label}
        </span>
      )}
    </label>
  );
});

Radio.displayName = "Radio";
export default Radio;
