import React from 'react';
import { Accordion } from '@/components/ui';

const faqItems = [
  {
    title: 'Is my restaurant data isolated from other tenants?',
    content: 'Yes, absolutely. Vyavastha uses strict database partition keys at the schema and repository levels (Multi-Tenant scoping). Every restaurant operates with isolated query boundaries, meaning no data leaks or cross-tenant query accesses can occur.'
  },
  {
    title: 'How fast do kitchen display order items update?',
    content: 'All state modifications for table orders, billing requests, and cooking updates broadcast instantly in real-time (latency under 100ms) to active browser clients using persistent Socket.IO connections.'
  },
  {
    title: 'Can I add multiple branches under one subscription plan?',
    content: 'Yes. The Pro plan allows configuring multiple physical branch offices. Branch managers can control their localized menus and raw ingredient inventory stock sheets independently.'
  },
  {
    title: 'Do you offer a lock-in contract option?',
    content: 'No contracts. Vyavastha is billed on a month-to-month subscription basis. You can cancel, downgrade, or upgrade plans at any point directly from your administration billing console.'
  },
  {
    title: 'How long does the free trial last?',
    content: 'Our trial lasts for 14 days. During the trial period, you get full access to all Pro plan features, including multi-branch configurations, to verify that Vyavastha is a fit for your kitchens.'
  }
];

export const FAQSection = () => {
  return (
    <div className="py-24 bg-dark-50 dark:bg-dark-950/20 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-dark-500 dark:text-dark-400">Got questions about our architecture, pricing, or capabilities? We have answers.</p>
        </div>

        <Accordion items={faqItems} />
      </div>
    </div>
  );
};

export default FAQSection;
