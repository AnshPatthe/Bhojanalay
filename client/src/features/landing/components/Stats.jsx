import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: '10K+', label: 'Active Restaurants' },
  { value: '$500M+', label: 'Processed Volume' },
  { value: '99.99%', label: 'Platform Uptime' },
  { value: '150M+', label: 'Meals Served Annually' }
];

export const Stats = () => {
  return (
    <div className="border-y border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900/50 py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="text-3xl md:text-5xl font-extrabold text-gradient mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-dark-500 dark:text-dark-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;
