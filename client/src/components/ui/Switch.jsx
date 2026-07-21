import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export const Switch = ({ checked, onChange, disabled = false, className }) => {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand-600" : "bg-dark-200 dark:bg-dark-800",
        className
      )}
      onClick={() => !disabled && onChange && onChange(!checked)}
      disabled={disabled}
    >
      <motion.span
        className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow ring-0"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
};

export default Switch;
