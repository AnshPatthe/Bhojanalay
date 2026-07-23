import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';

export const PerformanceSummary = ({ performance = {}, currencyCode = 'INR' }) => {
  const stats = [
    { label: 'Orders Served', value: performance.ordersServed || 624, suffix: ' Orders' },
    { label: 'Tables Managed', value: performance.tablesManaged || 120, suffix: ' Tables' },
    { label: 'Customer Rating', value: `${performance.customerRating || 4.8} / 5` },
    { label: 'Tips Earned', value: formatCurrency(performance.tipsEarned || 8250, currencyCode) },
    { label: 'Avg Service Time', value: `${performance.avgServiceTime || 11} min` },
    { label: 'Shifts Completed', value: `${performance.shiftsCompleted || 24} Shifts` }
  ];

  return (
    <div className="bg-white rounded-2xl border border-dark-150 p-5 text-left w-full">
      <h3 className="text-xs font-extrabold uppercase text-dark-800 tracking-wider mb-4 border-b border-dark-100 pb-2">
        Waiter Performance Metrics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
        {stats.map((stat, idx) => (
          <div key={idx} className="p-4 bg-dark-50/50 rounded-2xl border border-dark-100/50 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider block mb-1">{stat.label}</span>
            <span className="text-base font-black text-dark-800 font-heading">
              {stat.value}
              {stat.suffix && <span className="text-xs font-medium text-dark-500"> {stat.suffix}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceSummary;
