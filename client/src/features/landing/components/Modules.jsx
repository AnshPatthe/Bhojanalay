import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Monitor, Box, Users, Heart } from 'lucide-react';

const modules = [
  {
    icon: <CreditCard className="h-6 w-6 text-brand-650" />,
    title: 'POS & Billing',
    description: 'Sleek checkout panel supporting multiple payment options: cash, cards, UPI. Scope orders by dine-in, delivery, or takeaway.'
  },
  {
    icon: <Monitor className="h-6 w-6 text-emerald-600" />,
    title: 'Kitchen Displays',
    description: 'Live order tracking feeds for kitchen staff. Color-coded timers ensure chefs prepare meals and update order statuses instantly.'
  },
  {
    icon: <Box className="h-6 w-6 text-brand-500" />,
    title: 'Stock Inventory',
    description: 'Keep tabs on branch raw ingredients. Automated low-stock thresholds prevent menu gaps before items run out.'
  },
  {
    icon: <Users className="h-6 w-6 text-accent-600" />,
    title: 'Staff Scheduling',
    description: 'Assign role-based access permissions to managers, cashier nodes, chefs, and servers, tracking payroll hourly rates.'
  },
  {
    icon: <Heart className="h-6 w-6 text-rose-500" />,
    title: 'Guest Profiles',
    description: 'Build a loyal customer database linked by phone numbers. Accrue and redeem reward points directly during checkouts.'
  }
];

export const Modules = () => {
  return (
    <div className="py-24 bg-dark-50 dark:bg-dark-950/20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Built for Modern Kitchen Operations
          </h2>
          <p className="text-lg text-dark-500 dark:text-dark-400">
            Ditch multiple disjointed software subscriptions. Vyavastha provides a unified backend core to run your entire restaurant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {modules.map((mod, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-850 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-lg bg-dark-50 dark:bg-dark-800 flex items-center justify-center mb-6">
                {mod.icon}
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3 dark:text-white">{mod.title}</h3>
              <p className="text-dark-500 dark:text-dark-400 text-sm leading-relaxed">{mod.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Modules;
