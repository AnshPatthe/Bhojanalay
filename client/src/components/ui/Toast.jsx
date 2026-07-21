import * as React from 'react';
import { Toaster } from 'react-hot-toast';

export const Toast = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: 'border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 text-dark-900 dark:text-white rounded-lg shadow-xl',
        duration: 3000,
        style: {
          padding: '12px 16px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif'
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#ffffff'
          }
        },
        error: {
          iconTheme: {
            primary: '#f43f5e',
            secondary: '#ffffff'
          }
        }
      }}
    />
  );
};

export default Toast;
