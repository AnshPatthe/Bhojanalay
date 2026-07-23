import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { calculateGrossEarnings } from '../utils/salaryCalculator';

export const EarningsTable = ({ earnings = {}, currencyCode = 'INR' }) => {
  const items = [
    { label: 'Basic Salary', value: earnings.basicSalary },
    { label: 'House Rent Allowance (HRA)', value: earnings.hra },
    { label: 'Food Allowance', value: earnings.foodAllowance },
    { label: 'Travel Allowance', value: earnings.travelAllowance },
    { label: 'Incentive', value: earnings.incentives },
    { label: 'Service Charge Share', value: earnings.serviceChargeShare },
    { label: 'Overtime Pay', value: earnings.overtimePay },
    { label: 'Festival Bonus', value: earnings.festivalBonus },
    { label: 'Performance Bonus', value: earnings.performanceBonus },
    { label: 'Other Allowance', value: earnings.otherAllowance }
  ];

  const grossEarnings = calculateGrossEarnings(earnings);

  return (
    <div className="bg-white rounded-2xl border border-dark-150 overflow-hidden flex flex-col justify-between w-full h-full text-left">
      <div className="p-4 bg-dark-50 border-b border-dark-150">
        <h3 className="text-xs font-extrabold uppercase text-dark-800 tracking-wider">Earnings</h3>
      </div>
      
      <div className="divide-y divide-dark-100 flex-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center py-2.5 px-4 text-xs">
            <span className="text-dark-500 font-medium">{item.label}</span>
            <span className="text-dark-800 font-bold">{formatCurrency(item.value || 0, currencyCode)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center p-4 bg-emerald-50/20 border-t border-emerald-500/10 text-xs font-extrabold">
        <span className="text-emerald-800 uppercase tracking-wider">Gross Earnings</span>
        <span className="text-emerald-600 text-sm">{formatCurrency(grossEarnings, currencyCode)}</span>
      </div>
    </div>
  );
};

export default EarningsTable;
