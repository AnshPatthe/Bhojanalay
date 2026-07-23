import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';

export const SalarySummary = ({ netSalary = 0, currencyCode = 'INR', attendance = {} }) => {
  return (
    <div className="bg-emerald-50/40 rounded-2xl border border-emerald-500/20 p-5 text-left flex flex-col justify-between w-full h-full">
      {/* Net Salary Amount */}
      <div>
        <span className="text-emerald-800 font-extrabold text-2xs uppercase tracking-wider block mb-1">
          Net Take-Home Salary
        </span>
        <div className="text-3xl font-black text-emerald-600 tracking-tight font-heading">
          {formatCurrency(netSalary, currencyCode)}
        </div>
      </div>

      {/* Mini Attendance Summary inside Summary Card */}
      <div className="grid grid-cols-3 gap-3 border-t border-emerald-500/10 pt-4 mt-4 text-xs">
        <div>
          <span className="text-dark-400 block font-semibold text-3xs uppercase">Working Days</span>
          <span className="text-dark-800 font-bold text-sm">{attendance.totalDays || 31}</span>
        </div>
        <div>
          <span className="text-dark-400 block font-semibold text-3xs uppercase">Present Days</span>
          <span className="text-emerald-600 block font-bold text-sm">{attendance.presentDays || 30}</span>
        </div>
        <div>
          <span className="text-dark-400 block font-semibold text-3xs uppercase">Weekly Off</span>
          <span className="text-dark-800 font-bold text-sm">{attendance.weeklyOff || 4}</span>
        </div>
        <div>
          <span className="text-dark-400 block font-semibold text-3xs uppercase">Paid Leaves</span>
          <span className="text-dark-800 font-bold text-sm">{attendance.paidLeave || 1}</span>
        </div>
        <div>
          <span className="text-dark-400 block font-semibold text-3xs uppercase">Absent</span>
          <span className="text-rose-600 block font-bold text-sm">{attendance.absentDays || 0}</span>
        </div>
        <div>
          <span className="text-dark-400 block font-semibold text-3xs uppercase">Overtime</span>
          <span className="text-indigo-600 block font-bold text-sm">{attendance.overtimeHours || 18} hrs</span>
        </div>
      </div>
    </div>
  );
};

export default SalarySummary;
