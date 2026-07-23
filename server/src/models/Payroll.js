import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Waiter',
    default: null
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  month: {
    type: String, // e.g. "2026-03"
    required: [true, 'Month is required'],
    index: true
  },
  baseSalary: {
    type: Number,
    required: [true, 'Base salary is required']
  },
  workingDays: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  overtimePay: {
    type: Number,
    default: 0
  },
  incentives: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    required: [true, 'Net salary is required']
  },
  status: {
    type: String,
    enum: ['Unpaid', 'Paid'],
    default: 'Unpaid'
  },
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    upiId: { type: String, default: '' }
  },
  earnings: {
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    foodAllowance: { type: Number, default: 0 },
    travelAllowance: { type: Number, default: 0 },
    incentives: { type: Number, default: 0 },
    serviceChargeShare: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    festivalBonus: { type: Number, default: 0 },
    performanceBonus: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 }
  },
  deductionsDetails: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    advanceSalary: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    lateFine: { type: Number, default: 0 },
    leaveDeduction: { type: Number, default: 0 },
    uniformCharges: { type: Number, default: 0 },
    otherDeduction: { type: Number, default: 0 }
  },
  attendanceSummary: {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    weeklyOff: { type: Number, default: 0 },
    paidLeave: { type: Number, default: 0 },
    halfDay: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 }
  },
  performanceSummary: {
    ordersServed: { type: Number, default: 0 },
    customerRating: { type: Number, default: 0 },
    tipsEarned: { type: Number, default: 0 },
    avgServiceTime: { type: Number, default: 0 },
    shiftsCompleted: { type: Number, default: 0 }
  },
  incentivesBreakdown: {
    targetIncentive: { type: Number, default: 0 },
    weekendBonus: { type: Number, default: 0 },
    festivalBonus: { type: Number, default: 0 },
    onlineOrderIncentive: { type: Number, default: 0 },
    customerAppreciationBonus: { type: Number, default: 0 },
    referralBonus: { type: Number, default: 0 }
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  generatedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

payrollSchema.index({ waiterId: 1, month: 1 }, { unique: true });
payrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const Payroll = mongoose.model('Payroll', payrollSchema);
export default Payroll;
