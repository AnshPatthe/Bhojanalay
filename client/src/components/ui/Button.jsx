import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-600/10",
        secondary: "bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 text-dark-800 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-800",
        accent: "bg-accent-600 text-white hover:bg-accent-700 shadow-md shadow-accent-600/10",
        danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-md shadow-rose-600/10",
        ghost: "hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-300",
        link: "text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";
export default Button;
