import jwt from 'jsonwebtoken';
import Waiter from '../models/Waiter.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

export const protectWaiter = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.waiterToken) {
    token = req.cookies.waiterToken;
  }

  if (!token) {
    return next(new AppError('You are not logged in as a waiter.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    }
    return next(new AppError('Invalid token! Please log in again.', 401));
  }

  const waiter = await Waiter.findById(decoded.id);
  
  if (!waiter) {
    return next(new AppError('The waiter belonging to this token no longer exists.', 401));
  }

  if (waiter.status !== 'active') {
    return next(new AppError('This waiter account is not active.', 403));
  }

  req.waiter = waiter;
  next();
});
