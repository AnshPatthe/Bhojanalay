import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Avatar } from '@/components/ui';

const reviews = [
  {
    name: 'Chef Marcus Aurelius',
    role: 'Executive Chef & Owner, Le Bistro',
    content: 'The real-time kitchen display has cut ticket wait times by 22%. Chefs get clear visual indicators and order timers. It has brought order to our kitchen chaos.',
    rating: 5
  },
  {
    name: 'Sarah Jenkins',
    role: 'Franchise Director, Blue Bottle Diners',
    content: 'Orchestrating menu updates across 8 branches used to take hours. With Vyavastha, a single change in our console propagates to all locations instantly.',
    rating: 5
  },
  {
    name: 'Rajesh Patel',
    role: 'Operations Manager, Curry Leaf Chain',
    content: 'The low-stock alerts have saved us from ordering blockages multiple times. Multi-tenant dashboard scoping keeps each branch completely isolated.',
    rating: 5
  }
];

export const Testimonials = () => {
  return (
    <div className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Loved by Kitchen Teams Worldwide</h2>
          <p className="text-lg text-dark-500 dark:text-dark-400">Discover how restaurant operators use Vyavastha to streamline their workflows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-850 p-8 rounded-xl shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex space-x-1 mb-6 text-amber-500">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="text-dark-600 dark:text-dark-300 italic text-sm sm:text-base leading-relaxed mb-6">"{rev.content}"</p>
              </div>

              <div className="flex items-center space-x-4">
                <Avatar name={rev.name} size="md" />
                <div>
                  <h4 className="font-heading font-semibold text-sm">{rev.name}</h4>
                  <p className="text-xs text-dark-500 dark:text-dark-400">{rev.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
