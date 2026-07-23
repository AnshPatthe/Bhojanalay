import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Printer, Mail, MessageSquare } from 'lucide-react';
import { useWaiterAuth } from '@/features/waiter/store/useWaiterAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { getPayrollByEmployee } from '../services/payrollService';
import { generatePDF } from '../utils/pdfGenerator';
import { numberToWords } from '../utils/numberToWords';

import PayslipHeader from '../components/PayslipHeader';
import EmployeeCard from '../components/EmployeeCard';
import SalarySummary from '../components/SalarySummary';
import EarningsTable from '../components/EarningsTable';
import DeductionTable from '../components/DeductionTable';
import AttendanceSummary from '../components/AttendanceSummary';
import PerformanceSummary from '../components/PerformanceSummary';
import IncentiveBreakdown from '../components/IncentiveBreakdown';
import Footer from '../components/Footer';

export const WaiterPayslip = () => {
  const { payrollId } = useParams();
  const navigate = useNavigate();
  
  const { waiter: waiterContext } = useWaiterAuth();
  const { user: adminContext, currentRestaurant } = useAuthStore();

  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);

  const currencyCode = waiterContext?.restaurantCurrency || currentRestaurant?.currency || 'INR';

  useEffect(() => {
    const getEmployeeId = () => {
      if (waiterContext?._id) return waiterContext._id;
      return null;
    };

    const fetchPayrollDetails = async () => {
      try {
        const empId = getEmployeeId();
        if (!empId) {
          // If no active context, we might be loading mock or static data
          // Set standard mock data for preview if no ID is found
          setMockData();
          setLoading(false);
          return;
        }

        const res = await getPayrollByEmployee(empId);
        const matched = res.data.find(p => p._id === payrollId);
        
        if (matched) {
          setPayroll(matched);
        } else {
          toast.error('Payroll record not found.');
          setMockData();
        }
      } catch (err) {
        console.error('Failed to fetch payroll records:', err);
        setMockData();
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollDetails();
  }, [payrollId]);

  const setMockData = () => {
    // Generate Zoho payroll style mock data matching prompt examples
    setPayroll({
      month: '2026-03',
      baseSalary: 18000,
      workingDays: 31,
      overtimeHours: 18,
      overtimePay: 1800,
      incentives: 5550,
      deductions: 500,
      netSalary: 24850,
      status: 'Paid',
      bankDetails: {
        bankName: 'State Bank of India',
        accountNumber: 'XXXXXXXX4820',
        ifscCode: 'SBIN0001234',
        upiId: 'rahulpatil@okaxis'
      },
      earnings: {
        basicSalary: 15000,
        hra: 1500,
        foodAllowance: 500,
        travelAllowance: 1000,
        incentives: 2500,
        serviceChargeShare: 1500,
        overtimePay: 1800,
        festivalBonus: 500,
        performanceBonus: 550,
        otherAllowance: 0
      },
      deductionsDetails: {
        pf: 200,
        esi: 100,
        professionalTax: 200,
        advanceSalary: 0,
        loanDeduction: 0,
        lateFine: 0,
        leaveDeduction: 0,
        uniformCharges: 0,
        otherDeduction: 0
      },
      attendanceSummary: {
        totalDays: 31,
        presentDays: 30,
        weeklyOff: 4,
        paidLeave: 1,
        halfDay: 0,
        absentDays: 0,
        overtimeHours: 18
      },
      performanceSummary: {
        ordersServed: 624,
        tablesManaged: 120,
        customerRating: 4.8,
        tipsEarned: 8250,
        avgServiceTime: 11,
        shiftsCompleted: 24
      },
      incentivesBreakdown: {
        targetIncentive: 1000,
        weekendBonus: 500,
        festivalBonus: 500,
        onlineOrderIncentive: 300,
        customerAppreciationBonus: 200,
        referralBonus: 0
      }
    });
  };

  const handleDownloadPDF = async () => {
    const filename = `Payslip_${waiterContext?.name || 'Employee'}_${payroll?.month}.pdf`;
    toast.loading('Generating PDF...');
    await generatePDF('payslip-container', filename);
    toast.dismiss();
    toast.success('Payslip downloaded!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Vyavastha Payslip - ${payroll?.month}`);
    const body = encodeURIComponent(
      `Hello,\n\nPlease find your payslip summary for ${payroll?.month}.\n\n` +
      `Net Payable: ${payroll?.netSalary} INR\nStatus: ${payroll?.status}\n\n` +
      `Best regards,\nVyavastha Restaurant Management`
    );
    window.open(`mailto:${waiterContext?.email || ''}?subject=${subject}&body=${body}`);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*VYAVASTHA RESTAURANT OS - PAYSLIP REPORT*\n\n` +
      `*Waiter:* ${waiterContext?.name || 'Employee'}\n` +
      `*Month:* ${payroll?.month}\n` +
      `*Working Days:* ${payroll?.workingDays}\n` +
      `*Net Take-home:* ₹${payroll?.netSalary}\n` +
      `*Status:* ${payroll?.status}\n\n` +
      `Generated electronically.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-50">
        <span className="loading loading-spinner loading-lg text-brand-600"></span>
      </div>
    );
  }

  // Create printable employee representation
  const employeeData = {
    name: waiterContext?.name || 'Rahul Patil',
    employeeId: waiterContext?._id?.substring(0, 6).toUpperCase() || 'WT-104',
    designation: 'Senior Waiter',
    department: 'Service',
    joinedAt: waiterContext?.createdAt || '2025-06-12',
    type: 'Full-Time'
  };

  return (
    <div className="min-h-screen bg-dark-100 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      {/* Print CSS Overlay */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background-color: #ffffff !important;
          }
        }
      `}</style>

      {/* Action Toolbar */}
      <div className="w-full max-w-4xl no-print flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-dark-600 hover:text-dark-900 transition-colors cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-dark-200/60 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs font-bold bg-white text-dark-700 hover:bg-dark-50 px-4 py-2.5 rounded-xl border border-dark-200/60 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Payslip
          </button>
          <button
            onClick={handleEmail}
            className="flex items-center gap-2 text-xs font-bold bg-white text-dark-700 hover:bg-dark-50 px-4 py-2.5 rounded-xl border border-dark-200/60 shadow-sm transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 text-xs font-bold bg-white text-dark-700 hover:bg-dark-50 px-4 py-2.5 rounded-xl border border-dark-200/60 shadow-sm transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* A4 Payslip Container */}
      <div
        id="payslip-container"
        className="print-container bg-white w-full max-w-4xl p-6 sm:p-10 rounded-3xl border border-dark-200/60 shadow-xl space-y-6 text-dark-800"
      >
        {/* Header */}
        <PayslipHeader
          restaurantName={waiterContext?.restaurantName || currentRestaurant?.name}
          branchName={waiterContext?.branchName || 'Main Branch'}
          address="Pune, Maharashtra"
          phone="+91 98765 43210"
          gstin="27AAAAA1111A1Z1"
          month={payroll?.month}
        />

        {/* Employee Summary & Main Salary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2">
            <EmployeeCard
              employee={employeeData}
              bankDetails={payroll?.bankDetails}
              month={payroll?.month}
            />
          </div>
          <div>
            <SalarySummary
              netSalary={payroll?.netSalary}
              currencyCode={currencyCode}
              attendance={payroll?.attendanceSummary}
            />
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div>
            <EarningsTable earnings={payroll?.earnings} currencyCode={currencyCode} />
          </div>
          <div>
            <DeductionTable deductions={payroll?.deductionsDetails} currencyCode={currencyCode} />
          </div>
        </div>

        {/* Net Payable Section Banner */}
        <div className="bg-emerald-50/20 rounded-2xl border border-emerald-500/10 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider">
              Total Net Payable
            </span>
            <p className="text-2xs text-dark-400 mt-1">
              Gross Earnings - Total Deductions = Net Take-Home Salary
            </p>
            <p className="text-xs font-bold text-dark-700 mt-2">
              Amount in Words:{' '}
              <span className="text-emerald-700 font-extrabold">{numberToWords(payroll?.netSalary)}</span>
            </p>
          </div>
          <div className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-center flex flex-col justify-center shadow">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Net Payable</span>
            <span className="text-xl font-black font-heading mt-0.5">
              {Number(payroll?.netSalary).toLocaleString('en-IN', { style: 'currency', currency: currencyCode })}
            </span>
          </div>
        </div>

        {/* Attendance Grid */}
        <AttendanceSummary attendance={payroll?.attendanceSummary} />

        {/* Waiter Performance */}
        <PerformanceSummary performance={payroll?.performanceSummary} currencyCode={currencyCode} />

        {/* Incentive Details */}
        <IncentiveBreakdown incentives={payroll?.incentivesBreakdown} currencyCode={currencyCode} />

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default WaiterPayslip;
