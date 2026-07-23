import Payroll from '../../models/Payroll.js';
import Attendance from '../../models/Attendance.js';
import Order from '../../models/Order.js';
import Waiter from '../../models/Waiter.js';
import Employee from '../../models/Employee.js';
import User from '../../models/User.js';
import AppError from '../../utils/AppError.js';
import mongoose from 'mongoose';

class PayrollService {
  async getPayrollByEmployee(employeeId, restaurantId) {
    const query = { restaurantId };
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      query.$or = [{ employeeId }, { waiterId: employeeId }];
    } else {
      throw new AppError('Invalid Employee/Waiter ID format.', 400);
    }
    return Payroll.find(query).sort({ month: -1 });
  }

  async getPayrollsByMonth(month, restaurantId) {
    return Payroll.find({ month, restaurantId })
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('waiterId', 'name email status');
  }

  async generatePayroll(restaurantId, branchId, employeeId, month, data, generatedBy) {
    // Determine if it is a waiter or standard employee
    let waiterId = null;
    let empId = null;

    const waiter = await Waiter.findOne({ _id: employeeId, restaurantId });
    if (waiter) {
      waiterId = waiter._id;
    } else {
      const employee = await Employee.findOne({ _id: employeeId, restaurantId });
      if (employee) {
        empId = employee._id;
      }
    }

    if (!waiterId && !empId) {
      throw new AppError('Employee or Waiter not found under this restaurant.', 404);
    }

    const query = { restaurantId, month };
    if (waiterId) query.waiterId = waiterId;
    if (empId) query.employeeId = empId;

    let payroll = await Payroll.findOne(query);

    const payrollData = {
      restaurantId,
      branchId,
      employeeId: empId,
      waiterId,
      month,
      baseSalary: data.baseSalary || 0,
      workingDays: data.workingDays || 0,
      overtimeHours: data.overtimeHours || 0,
      overtimePay: data.overtimePay || 0,
      incentives: data.incentives || 0,
      deductions: data.deductions || 0,
      netSalary: data.netSalary || 0,
      status: data.status || 'Unpaid',
      bankDetails: data.bankDetails || {},
      earnings: data.earnings || {},
      deductionsDetails: data.deductionsDetails || {},
      attendanceSummary: data.attendanceSummary || {},
      performanceSummary: data.performanceSummary || {},
      incentivesBreakdown: data.incentivesBreakdown || {},
      generatedBy,
      generatedDate: new Date()
    };

    if (payroll) {
      // Update existing
      Object.assign(payroll, payrollData);
      await payroll.save();
    } else {
      // Create new
      payroll = await Payroll.create(payrollData);
    }

    return payroll;
  }

  async getAttendanceSummary(employeeId, month) {
    // month is "YYYY-MM"
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1; // 0-indexed month

    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const query = {
      date: { $gte: startOfMonth, $lte: endOfMonth }
    };

    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      query.$or = [{ employeeId }, { waiterId: employeeId }];
    } else {
      throw new AppError('Invalid Employee ID format.', 400);
    }

    const attendanceRecords = await Attendance.find(query);

    let presentDays = 0;
    let absentDays = 0;
    let paidLeave = 0;
    let halfDay = 0;
    let overtimeHours = 0;

    attendanceRecords.forEach(record => {
      overtimeHours += record.overtimeHours || 0;
      if (record.status === 'Present') presentDays++;
      else if (record.status === 'Absent') absentDays++;
      else if (record.status === 'Leave') paidLeave++;
      else if (record.status === 'Half-day') halfDay++;
    });

    const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    // Default 4 weekly offs
    const weeklyOff = 4;

    return {
      totalDays: totalDaysInMonth,
      presentDays,
      weeklyOff,
      paidLeave,
      halfDay,
      absentDays: Math.max(0, totalDaysInMonth - presentDays - weeklyOff - paidLeave - halfDay),
      overtimeHours
    };
  }

  async getIncentivesSummary(employeeId, month) {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;

    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    // Fetch order stats for the waiter
    const query = {
      waiterId: employeeId,
      status: 'completed',
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    };

    const orders = await Order.find(query);

    const ordersServed = orders.length;

    // Tables Managed: count unique table numbers
    const uniqueTables = new Set(orders.map(o => o.tableNumber).filter(Boolean));
    const tablesManaged = uniqueTables.size;

    // Service Time: average diff of readyAt - preparingAt
    let totalServiceTime = 0;
    let serviceTimeCount = 0;

    orders.forEach(order => {
      if (order.readyAt && order.preparingAt) {
        const diffMins = Math.round((new Date(order.readyAt) - new Date(order.preparingAt)) / (1000 * 60));
        if (diffMins > 0) {
          totalServiceTime += diffMins;
          serviceTimeCount++;
        }
      }
    });

    const avgServiceTime = serviceTimeCount > 0 ? Math.round(totalServiceTime / serviceTimeCount) : 11; // default 11 mins

    // Mock calculations based on actual count
    const tipsEarned = ordersServed * 20; // 20 INR tip average
    const customerRating = parseFloat((4.5 + Math.random() * 0.5).toFixed(1)); // 4.5 to 5.0 rating

    // Target Incentive: base incentive for serving orders
    const targetIncentive = ordersServed * 10;
    const weekendBonus = Math.floor(ordersServed / 10) * 150;
    const festivalBonus = 500;
    const onlineOrderIncentive = 300;
    const customerAppreciationBonus = customerRating >= 4.8 ? 500 : 0;
    const referralBonus = 0;

    return {
      performance: {
        ordersServed,
        tablesManaged,
        customerRating,
        tipsEarned,
        avgServiceTime,
        shiftsCompleted: 24 // placeholder matching standard present days
      },
      incentives: {
        targetIncentive,
        weekendBonus,
        festivalBonus,
        onlineOrderIncentive,
        customerAppreciationBonus,
        referralBonus
      }
    };
  }
}

export default new PayrollService();
