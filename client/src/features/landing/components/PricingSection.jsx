import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

export const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Basic',
      description: 'Ideal for small cafes and standalone food trucks.',
      price: billingCycle === 'monthly' ? 19 : 15,
      features: [
        'Single Branch access',
        'Max 150 orders/day',
        'Standard Menu management',
        '2 Staff logins',
        'Email customer support'
      ]
    },
    {
      name: 'Pro',
      description: 'Best for scaling full-service bistros & dining halls.',
      price: billingCycle === 'monthly' ? 29 : 23,
      features: [
        'Multi-Branch routing',
        'Unlimited orders',
        'Advanced Modifier groups',
        'Real-time Kitchen Display Sync',
        'Stock low-inventory Alerts',
        'Loyalty Guest rewards points',
        '24/7 Priority support'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      description: 'Perfect for large chains, franchises, and cloud kitchens.',
      price: 'Custom',
      features: [
        'Unlimited Branches & Warehouses',
        'Custom franchise permissions roles',
        'Whitelabel QR menus',
        'API integration access',
        'Dedicated success Manager',
        'Custom SLA uptime guarantee'
      ]
    }
  ];

  return (
    <div className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-dark-500 dark:text-dark-400">All plans begin with a 14-day free trial. No credit card required.</p>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center items-center mt-8 space-x-4">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-brand-600 font-semibold' : 'text-dark-500'}`}>Monthly</span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-12 h-6 bg-dark-200 dark:bg-dark-800 rounded-full focus:outline-none transition-colors"
            >
              <motion.span
                className="absolute left-1 top-1 w-4 h-4 rounded-full bg-brand-650"
                animate={{ x: billingCycle === 'monthly' ? 0 : 24 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-brand-600 font-semibold' : 'text-dark-500'}`}>
              Yearly <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-full px-2 py-0.5 ml-1">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`bg-white dark:bg-dark-900 border p-8 rounded-xl shadow-sm flex flex-col justify-between relative ${
                plan.popular
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-dark-200 dark:border-dark-850'
              }`}
            >
              {plan.popular && (
                <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Recommended
                </span>
              )}
              <div>
                <h3 className="font-heading text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-dark-500 dark:text-dark-400 text-xs leading-relaxed mb-6">{plan.description}</p>

                <div className="flex items-baseline mb-8">
                  {typeof plan.price === 'number' ? (
                    <>
                      <span className="text-4xl md:text-5xl font-extrabold tracking-tight">${plan.price}</span>
                      <span className="text-dark-400 text-sm ml-2">/ month</span>
                    </>
                  ) : (
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start space-x-3 text-sm">
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span className="text-dark-600 dark:text-dark-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                variant={plan.popular ? 'primary' : 'secondary'}
                className="w-full mt-4"
                onClick={() => navigate('/register')}
              >
                {plan.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
