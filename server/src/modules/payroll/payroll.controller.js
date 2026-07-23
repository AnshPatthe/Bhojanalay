import PayrollService from './payroll.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';

export const getPayrollByEmployee = catchAsync(async (req, res, next) => {
  const { employeeId } = req.params;
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId || req.waiter?.restaurantId;

  if (!restaurantId) {
    return next(new AppError('Restaurant context required.', 400));
  }

  const payrolls = await PayrollService.getPayrollByEmployee(employeeId, restaurantId);

  res.status(200).json({
    status: 'success',
    data: payrolls
  });
});

export const getPayrollsByMonth = catchAsync(async (req, res, next) => {
  const { month } = req.params; // "YYYY-MM"
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId || req.waiter?.restaurantId;

  if (!restaurantId) {
    return next(new AppError('Restaurant context required.', 400));
  }

  const payrolls = await PayrollService.getPayrollsByMonth(month, restaurantId);

  res.status(200).json({
    status: 'success',
    data: payrolls
  });
});

export const generatePayroll = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId;
  const branchId = req.employee?.branchId?._id || req.employee?.branchId;
  
  if (!restaurantId || !branchId) {
    return next(new AppError('Admin employee branch context required.', 400));
  }

  const { employeeId, month, ...payrollData } = req.body;
  if (!employeeId || !month) {
    return next(new AppError('Employee ID and month are required.', 400));
  }

  const generatedBy = req.user?._id;

  const payroll = await PayrollService.generatePayroll(
    restaurantId,
    branchId,
    employeeId,
    month,
    payrollData,
    generatedBy
  );

  res.status(201).json({
    status: 'success',
    data: payroll
  });
});

export const getAttendanceSummary = catchAsync(async (req, res, next) => {
  const { employeeId } = req.params;
  const { month } = req.query; // "YYYY-MM"

  if (!month) {
    return next(new AppError('Month query parameter (YYYY-MM) is required.', 400));
  }

  const summary = await PayrollService.getAttendanceSummary(employeeId, month);

  res.status(200).json({
    status: 'success',
    data: summary
  });
});

export const getIncentivesSummary = catchAsync(async (req, res, next) => {
  const { employeeId } = req.params;
  const { month } = req.query; // "YYYY-MM"

  if (!month) {
    return next(new AppError('Month query parameter (YYYY-MM) is required.', 400));
  }

  const summary = await PayrollService.getIncentivesSummary(employeeId, month);

  res.status(200).json({
    status: 'success',
    data: summary
  });
});

export const downloadPayslip = catchAsync(async (req, res, next) => {
  const { employeeId } = req.params;
  const { month } = req.query;
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId || req.waiter?.restaurantId;

  if (!restaurantId) {
    return next(new AppError('Restaurant context required.', 400));
  }

  // Retrieve complete payroll details for the payslip PDF build
  const query = { restaurantId, month };
  if (employeeId) {
    query.$or = [{ employeeId }, { waiterId: employeeId }];
  }

  const payroll = await PayrollService.getPayrollByEmployee(employeeId, restaurantId);

  res.status(200).json({
    status: 'success',
    data: payroll
  });
});
