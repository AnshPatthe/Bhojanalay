import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Modal = ({ isOpen, onClose, title, children, className }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-dark-950/40 dark:bg-dark-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={cn(
              "relative z-10 w-full max-w-lg rounded-xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-6 shadow-2xl dark:text-white flex flex-col max-h-[90vh]",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              {title && <h3 className="text-lg font-semibold font-heading">{title}</h3>}
              <button
                onClick={onClose}
                className="rounded-full p-1 hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors text-dark-400 dark:text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="text-dark-600 dark:text-dark-300 overflow-y-auto flex-1 min-h-0 pr-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
