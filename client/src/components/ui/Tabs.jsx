import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export const Tabs = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn("flex space-x-1 border-b border-dark-200 dark:border-dark-800 pb-px", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium text-dark-500 dark:text-dark-400 hover:text-dark-800 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-none",
              isActive && "text-brand-600 dark:text-brand-400"
            )}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-500"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
