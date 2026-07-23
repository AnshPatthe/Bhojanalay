import express from 'express';
import {
  getPayrollByEmployee,
  getPayrollsByMonth,
  generatePayroll,
  downloadPayslip,
  getAttendanceSummary,
  getIncentivesSummary
} from './payroll.controller.js';
import { protect, restrictTo } from '../../middleware/auth.middleware.js';
import { protectWaiter } from '../../middleware/waiter.middleware.js';
import AppError from '../../utils/AppError.js';

const router = express.Router();

// Middleware to authorize either standard employee/admin OR waiter
const protectAny = async (req, res, next) => {
  let hasUser = false;
  
  // Try standard protect
  try {
    await new Promise((resolve, reject) => {
      protect(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    hasUser = true;
  } catch (err) {
    // If standard protect fails, try protectWaiter
    try {
      await new Promise((resolve, reject) => {
        protectWaiter(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      hasUser = true;
    } catch (waiterErr) {
      // Both failed
    }
  }

  if (hasUser) {
    return next();
  }
  
  return next(new AppError('Unauthorized access. Please login as Admin or Waiter.', 401));
};

// Admin only endpoints
router.post('/generate', protect, restrictTo('employees:manage'), generatePayroll);

// Shared endpoints (Admin & Waiters)
router.use(protectAny);

router.get('/:employeeId', getPayrollByEmployee);
router.get('/month/:month', getPayrollsByMonth);
router.get('/download/:employeeId', downloadPayslip);
router.get('/attendance/:employeeId', getAttendanceSummary);
router.get('/incentives/:employeeId', getIncentivesSummary);

export default router;
