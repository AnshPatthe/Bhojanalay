import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Drawer = ({ isOpen, onClose, title, children, side = 'right', className }) => {
  const isRight = side === 'right';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-dark-950/40 dark:bg-dark-950/60 backdrop-blur-sm"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: isRight ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: isRight ? "100%" : "-100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className={cn(
              "fixed inset-y-0 z-10 flex bg-white dark:bg-dark-900 border-l border-dark-200 dark:border-dark-800 shadow-2xl dark:text-white flex-col w-screen max-w-md p-6",
              isRight ? "right-0" : "left-0",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-dark-100 dark:border-dark-800 pb-4 mb-4">
              {title && <h3 className="text-lg font-semibold font-heading">{title}</h3>}
              <button
                onClick={onClose}
                className="rounded-full p-1 hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors text-dark-400 dark:text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
