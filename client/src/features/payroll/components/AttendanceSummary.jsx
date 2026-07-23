import React from 'react';

export const AttendanceSummary = ({ attendance = {} }) => {
  const cards = [
    { label: 'Total Days', value: attendance.totalDays || 31, color: 'text-dark-800 bg-dark-50' },
    { label: 'Present Days', value: attendance.presentDays || 30, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Weekly Off', value: attendance.weeklyOff || 4, color: 'text-blue-700 bg-blue-50' },
    { label: 'Paid Leave', value: attendance.paidLeave || 1, color: 'text-amber-700 bg-amber-50' },
    { label: 'Half Day', value: attendance.halfDay || 0, color: 'text-orange-700 bg-orange-50' },
    { label: 'Absent Days', value: attendance.absentDays || 0, color: 'text-rose-700 bg-rose-50' },
    { label: 'Overtime Hours', value: `${attendance.overtimeHours || 18} hrs`, color: 'text-indigo-700 bg-indigo-50' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-dark-150 p-5 text-left w-full">
      <h3 className="text-xs font-extrabold uppercase text-dark-800 tracking-wider mb-4 border-b border-dark-100 pb-2">
        Attendance & Shift Summary
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((card, idx) => (
          <div key={idx} className={`p-3 rounded-xl border border-dark-150/40 text-center flex flex-col justify-between ${card.color}`}>
            <span className="text-[10px] uppercase font-bold tracking-tight opacity-75">{card.label}</span>
            <span className="text-base font-black mt-1 font-heading">{card.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceSummary;
