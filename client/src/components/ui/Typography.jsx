import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const typographyVariants = cva(
  "text-dark-900 dark:text-white transition-colors",
  {
    variants: {
      variant: {
        h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl font-heading",
        h2: "scroll-m-20 text-3xl font-semibold tracking-tight font-heading",
        h3: "scroll-m-20 text-2xl font-semibold tracking-tight font-heading",
        h4: "scroll-m-20 text-xl font-semibold tracking-tight font-heading",
        p: "leading-7 text-dark-600 dark:text-dark-300 text-sm sm:text-base",
        lead: "text-xl text-dark-500 dark:text-dark-400 font-medium",
        large: "text-lg font-semibold",
        small: "text-sm font-medium leading-none text-dark-500 dark:text-dark-450",
        muted: "text-sm text-dark-400 dark:text-dark-500"
      }
    },
    defaultVariants: {
      variant: "p"
    }
  }
);

export const Typography = ({ className, variant, children, as, ...props }) => {
  const Component = as || (variant === 'lead' || variant === 'large' || variant === 'muted' ? 'p' : variant) || 'p';
  return (
    <Component className={cn(typographyVariants({ variant }), className)} {...props}>
      {children}
    </Component>
  );
};

export default Typography;
