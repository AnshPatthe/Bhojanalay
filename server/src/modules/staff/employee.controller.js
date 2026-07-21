import EmployeeService from './employee.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';

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
