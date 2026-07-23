import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { calculateTotalDeductions } from '../utils/salaryCalculator';

export const DeductionTable = ({ deductions = {}, currencyCode = 'INR' }) => {
  const items = [
    { label: 'Provident Fund (PF)', value: deductions.pf },
    { label: 'Employee State Insurance (ESI)', value: deductions.esi },
    { label: 'Professional Tax', value: deductions.professionalTax },
    { label: 'Advance Salary Paid', value: deductions.advanceSalary },
    { label: 'Loan Deduction', value: deductions.loanDeduction },
    { label: 'Late Fine Charges', value: deductions.lateFine },
    { label: 'Leave Deduction', value: deductions.leaveDeduction },
    { label: 'Uniform Charges', value: deductions.uniformCharges },
    { label: 'Other Deduction', value: deductions.otherDeduction }
  ];

  const totalDeduction = calculateTotalDeductions(deductions);

  return (
    <div className="bg-white rounded-2xl border border-dark-150 overflow-hidden flex flex-col justify-between w-full h-full text-left">
      <div className="p-4 bg-dark-50 border-b border-dark-150">
        <h3 className="text-xs font-extrabold uppercase text-dark-800 tracking-wider">Deductions</h3>
      </div>
      
      <div className="divide-y divide-dark-100 flex-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center py-2.5 px-4 text-xs">
            <span className="text-dark-500 font-medium">{item.label}</span>
            <span className="text-dark-800 font-bold">{formatCurrency(item.value || 0, currencyCode)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center p-4 bg-rose-50/20 border-t border-rose-500/10 text-xs font-extrabold">
        <span className="text-rose-800 uppercase tracking-wider">Total Deductions</span>
        <span className="text-rose-600 text-sm">{formatCurrency(totalDeduction, currencyCode)}</span>
      </div>
    </div>
  );
};

export default DeductionTable;
