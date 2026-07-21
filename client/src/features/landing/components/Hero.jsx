import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative pt-32 pb-20 overflow-hidden bg-grid-pattern min-h-screen flex items-center justify-center">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 bg-brand-50/80 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-900/50 rounded-full px-3 py-1 mb-6"
        >
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-400 uppercase tracking-wider">Introducing Vyavastha OS</span>
          <ChevronRight className="h-4 w-4 text-brand-600 dark:text-brand-500" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6"
        >
          One Platform.<br />
          <span className="text-gradient">Manage Restaurant With Us..</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-dark-500 dark:text-dark-400 mb-10 leading-relaxed"
        >
          Vyavastha is a high-performance Restaurant Operating System designed to orchestrate billing, table orders, live kitchen prep feeds, and branch inventory in real-time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16"
        >
          <Button variant="primary" size="lg" className="group" onClick={() => navigate('/register')}>
            Launch Your Restaurant
            <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button variant="secondary" size="lg">
            <Play className="h-5 w-5 mr-2 fill-current" />
            Watch Demo Video
          </Button>
        </motion.div>

        {/* Product Showcase Graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 1, delay: 0.4 }}
          className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900"
        >
          <div className="h-10 bg-dark-50 dark:bg-dark-950 flex items-center px-4 border-b border-dark-200 dark:border-dark-800">
            <div className="flex space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="p-4 bg-dark-100 dark:bg-dark-950/30">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 h-64 bg-white dark:bg-dark-900 rounded-xl p-6 border border-dark-150 dark:border-dark-800 text-left flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-heading font-semibold text-lg">Sales Analysis Overview</h3>
                    <p className="text-xs text-dark-400">Real-time daily aggregates</p>
                  </div>
                  <span className="text-emerald-500 font-bold text-lg">+18.5%</span>
                </div>
                <div className="flex items-end space-x-2 h-32">
                  <div className="flex-1 bg-brand-500/20 rounded-t h-1/3" />
                  <div className="flex-1 bg-brand-500/40 rounded-t h-2/3" />
                  <div className="flex-1 bg-brand-500/60 rounded-t h-1/2" />
                  <div className="flex-1 bg-brand-650 rounded-t h-4/5" />
                  <div className="flex-1 bg-accent-500 rounded-t h-full" />
                </div>
              </div>
              <div className="col-span-1 h-64 bg-white dark:bg-dark-900 rounded-xl p-6 border border-dark-150 dark:border-dark-800 text-left flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-base">Active Tables</h3>
                  <p className="text-xs text-dark-400">Order queues per table</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs py-1 border-b border-dark-100 dark:border-dark-800">
                    <span>Table #12</span>
                    <span className="text-emerald-500 font-medium">Preparing</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-dark-100 dark:border-dark-800">
                    <span>Table #04</span>
                    <span className="text-amber-500 font-medium">Ready</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span>Table #09</span>
                    <span className="text-dark-450">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
