import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';

export const IncentiveBreakdown = ({ incentives = {}, currencyCode = 'INR' }) => {
  const items = [
    { label: 'Target Incentive', value: incentives.targetIncentive || 0 },
    { label: 'Weekend Bonus', value: incentives.weekendBonus || 0 },
    { label: 'Festival Bonus', value: incentives.festivalBonus || 0 },
    { label: 'Online Order Incentive', value: incentives.onlineOrderIncentive || 0 },
    { label: 'Customer Appreciation Bonus', value: incentives.customerAppreciationBonus || 0 },
    { label: 'Referral Bonus', value: incentives.referralBonus || 0 }
  ];

  return (
    <div className="bg-white rounded-2xl border border-dark-150 p-5 text-left w-full">
      <h3 className="text-xs font-extrabold uppercase text-dark-800 tracking-wider mb-4 border-b border-dark-100 pb-2">
        Incentive & Bonus Breakdown
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
        {items.map((item, idx) => (
          <div key={idx} className="p-3 bg-emerald-50/10 rounded-xl border border-emerald-500/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-dark-500 tracking-tight block mb-1">{item.label}</span>
            <span className="text-sm font-extrabold text-emerald-600 font-heading">
              {formatCurrency(item.value, currencyCode)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncentiveBreakdown;
