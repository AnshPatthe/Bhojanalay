import express from 'express';
import {
  login,
  getTables,
  getMenu,
  createOrder,
  updateOrderStatus,
  getOrders,
  getOrderById,
  applyLeave,
  getLeaves,
  getLeaveBalance,
  clockIn,
  clockOut,
  getAttendance,
  getPayroll,
  getWaiters,
  updateProfile
} from './waiter.controller.js';
import { protectWaiter } from '../../middleware/waiter.middleware.js';

const router = express.Router();

router.post('/login', login);

router.use(protectWaiter);

router.get('/list', getWaiters);
router.get('/tables', getTables);
router.get('/menu', getMenu);
router.post('/orders', createOrder);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id', updateOrderStatus);

// Leave management
router.post('/leaves', applyLeave);
router.get('/leaves', getLeaves);
router.get('/leaves/balance', getLeaveBalance);

// Attendance Clocking
router.post('/attendance/clock-in', clockIn);
router.post('/attendance/clock-out', clockOut);
router.get('/attendance', getAttendance);

// Payroll
router.get('/payroll', getPayroll);

// Profile Update
router.put('/profile', updateProfile);

export default router;
