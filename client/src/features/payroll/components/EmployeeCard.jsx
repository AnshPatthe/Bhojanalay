import React from 'react';

export const EmployeeCard = ({ employee = {}, bankDetails = {}, month }) => {
  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return 'N/A';
    const [year, m] = monthStr.split('-');
    const date = new Date(year, parseInt(m) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get last day of month
  const getPayDate = (monthStr) => {
    if (!monthStr) return 'N/A';
    const [year, m] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(m), 0);
    return formatDate(date);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-dark-50 rounded-2xl border border-dark-150 p-5 text-left w-full">
      {/* Employee Details Column */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase text-dark-400 tracking-wider mb-2">Employee Summary</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Employee Name</span>
            <span className="text-dark-800 font-bold">{employee.name || 'Rahul Patil'}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Employee ID</span>
            <span className="text-dark-800 font-bold font-mono">{employee.employeeId || employee._id?.substring(0, 6).toUpperCase() || 'WT-104'}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Designation</span>
            <span className="text-dark-800 font-bold">{employee.designation || 'Senior Waiter'}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Department</span>
            <span className="text-dark-800 font-bold">{employee.department || 'Service'}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Joining Date</span>
            <span className="text-dark-800 font-bold">{formatDate(employee.joinedAt || '2025-06-12')}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Pay Period</span>
            <span className="text-dark-800 font-bold">{formatMonth(month)}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Pay Date</span>
            <span className="text-dark-800 font-bold">{getPayDate(month)}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Employment Type</span>
            <span className="text-dark-800 font-bold">{employee.type || 'Full-Time'}</span>
          </div>
        </div>
      </div>

      {/* Bank Details Column */}
      <div className="space-y-3 md:border-l md:border-dark-200/60 md:pl-6">
        <h3 className="text-xs font-extrabold uppercase text-dark-400 tracking-wider mb-2">Bank Details</h3>
        <div className="grid grid-cols-1 gap-y-3 text-xs">
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Bank Name</span>
            <span className="text-dark-800 font-bold">{bankDetails.bankName || 'State Bank of India'}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">Account Number</span>
            <span className="text-dark-800 font-bold font-mono">{bankDetails.accountNumber || 'XXXXXXXX4820'}</span>
          </div>
          <div>
            <span className="text-dark-400 block font-semibold text-2xs uppercase">IFSC Code</span>
            <span className="text-dark-800 font-bold font-mono">{bankDetails.ifscCode || 'SBIN0001234'}</span>
          </div>
          {bankDetails.upiId && (
            <div>
              <span className="text-dark-400 block font-semibold text-2xs uppercase">UPI ID</span>
              <span className="text-dark-800 font-bold font-mono">{bankDetails.upiId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;
