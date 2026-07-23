import React from 'react';
import { ChefHat } from 'lucide-react';

export const PayslipHeader = ({ restaurantName, branchName, address, phone, gstin, month }) => {
  // Format Month (e.g., "2026-03" -> "March 2026")
  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex justify-between items-start border-b border-dark-100 pb-6 w-full text-left">
      {/* Left Branding */}
      <div className="flex gap-4 items-start">
        <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0 border border-emerald-600/10">
          <ChefHat className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-dark-900 tracking-tight">{restaurantName || 'Vyavastha Restaurant'}</h1>
          <p className="text-xs text-dark-500 font-semibold">{branchName || 'Main Branch'}</p>
          <p className="text-2xs text-dark-400 max-w-xs">{address || 'Pune, Maharashtra'}</p>
          {phone && <p className="text-2xs text-dark-400">Phone: {phone}</p>}
          <p className="text-2xs text-dark-400 font-mono">GSTIN: {gstin || '27XXXXXXXX'}</p>
        </div>
      </div>

      {/* Right Header Title */}
      <div className="text-right space-y-1">
        <h2 className="text-lg font-extrabold tracking-wider text-dark-400 uppercase">Waiter Payslip</h2>
        <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-500/10">
          Salary Month: {formatMonth(month)}
        </div>
      </div>
    </div>
  );
};

export default PayslipHeader;
