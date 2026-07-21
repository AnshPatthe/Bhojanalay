import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Breadcrumb = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex", className)}>
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 text-dark-400 mx-1" />}
              {isLast ? (
                <span className="text-sm font-medium text-dark-600 dark:text-dark-200">
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href || '#'}
                  className="text-sm font-medium text-dark-400 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200 transition-colors"
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
