import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import UserRepository from '../modules/auth/user.repository.js';
import EmployeeRepository from '../modules/staff/employee.repository.js';

export const protect = catchAsync(async (req, res, next) => {
  let token;

  // Retrieve token from Authorization header or Cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // Verify access token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired! Please refresh.', 401));
    }
    return next(new AppError('Invalid token! Please log in again.', 401));
  }

  // Find user
  const user = await UserRepository.findById(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (user.status !== 'active') {
    return next(new AppError('This user account has been disabled or suspended.', 403));
  }

  req.user = user;

  // Optional Context: Restaurant ID & Branch ID context
  let restaurantId = req.headers['x-restaurant-id'] || req.query.restaurantId;
  const branchId = req.headers['x-branch-id'] || req.query.branchId;

  if (!restaurantId) {
    // If no restaurant context provided, find any active employee record for the user
    const userEmployee = await EmployeeRepository.findOne({ userId: user._id });
    if (userEmployee) {
      restaurantId = userEmployee.restaurantId;
    }
  }

  if (restaurantId) {
    const employee = await EmployeeRepository.findDetailedEmployee(user._id, restaurantId);
    if (employee) {
      req.employee = employee;
      req.role = employee.roleId;
      req.branchId = employee.branchId?._id || branchId;
    }
  }

  next();
});

// Enforce specific permission requirements
export const restrictTo = (...requiredPermissions) => {
  return (req, res, next) => {
    // Owners (system or user) bypassed or checked
    if (!req.employee) {
      return next(new AppError('Access denied. No employee context found for this restaurant.', 403));
    }

    const { roleId } = req.employee;
    if (!roleId) {
      return next(new AppError('Access denied. No role assigned to employee.', 403));
    }

    // Check if employee's role has the required permissions or is owner
    const isOwner = roleId.name.toLowerCase() === 'owner';
    if (isOwner) {
      return next(); // Owner has all permissions
    }

    const rolePermissions = roleId.permissions || [];
    const hasPermission = requiredPermissions.every(perm => rolePermissions.includes(perm));

    if (!hasPermission) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};
