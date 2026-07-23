import EmployeeService from './employee.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';
import Leave from '../../models/Leave.js';
import { getIO } from '../../socket/socketServer.js';
import SOCKET_EVENTS from '../../socket/socketEvents.js';

export const getEmployees = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId;
  if (!restaurantId) {
    return next(new AppError('Restaurant context required.', 400));
  }

  const employees = await EmployeeService.getEmployees(restaurantId);

  res.status(200).json({
    status: 'success',
    data: employees
  });
});

export const addEmployee = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId;
  if (!restaurantId) {
    return next(new AppError('Restaurant context required.', 400));
  }

  const employee = await EmployeeService.addEmployee(restaurantId, req.body);

  res.status(201).json({
    status: 'success',
    data: employee
  });
});

export const updateEmployee = catchAsync(async (req, res, next) => {
  const employee = await EmployeeService.updateEmployee(
    req.params.employeeId,
    req.body
  );

  res.status(200).json({
    status: 'success',
    data: employee
  });
});

export const deleteEmployee = catchAsync(async (req, res, next) => {
  await EmployeeService.deleteEmployee(req.params.employeeId);

  res.status(200).json({
    status: 'success',
    message: 'Employee deleted successfully.'
  });
});

export const getRoles = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId;
  if (!restaurantId) {
    return next(new AppError('Restaurant context required.', 400));
  }

  const roles = await EmployeeService.getRoles(restaurantId);

  res.status(200).json({
    status: 'success',
    data: roles
  });
});

export const getLeaveRequests = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId;
  if (!restaurantId) {
    return next(new AppError('Restaurant context required.', 400));
  }

  const leaves = await Leave.find({ restaurantId })
    .populate('waiterId', 'name email status')
    .populate('employeeId', 'userId')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: leaves
  });
});

export const updateLeaveStatus = catchAsync(async (req, res, next) => {
  const { leaveId } = req.params;
  const { status, adminRemarks } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return next(new AppError('Invalid status. Must be Approved or Rejected.', 400));
  }

  const leave = await Leave.findById(leaveId);
  if (!leave) {
    return next(new AppError('Leave request not found.', 404));
  }

  leave.status = status;
  if (adminRemarks !== undefined) {
    leave.adminRemarks = adminRemarks;
  }
  await leave.save();

  // Socket broadcast to branch room so waiter dashboard updates live
  try {
    const io = getIO();
    io.to(leave.branchId.toString()).emit(SOCKET_EVENTS.LEAVE_STATUS_UPDATED, {
      leaveId: leave._id,
      waiterId: leave.waiterId,
      status: leave.status,
      adminRemarks: leave.adminRemarks
    });
  } catch (err) {
    console.log('Socket leave status update broadcast failed:', err.message);
  }

  res.status(200).json({
    status: 'success',
    data: leave
  });
});
