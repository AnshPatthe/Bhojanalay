import express from 'express';
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  processPayment,
  updateOrderItemStatus,
  cancelOrder,
  cancelOrderItem,
  recallOrder,
  splitBill,
  mergeTables,
  splitTables,
  transferOrder
} from './order.controller.js';
import { protect, restrictTo } from '../../middleware/auth.middleware.js';
import { protectWaiter } from '../../middleware/waiter.middleware.js';

const router = express.Router();

const protectAny = (req, res, next) => {
  protectWaiter(req, res, (err) => {
    if (!err && req.waiter) {
      return next();
    }
    
    protect(req, res, (err2) => {
      if (!err2 && req.employee) {
        return next();
      }
      return res.status(401).json({ status: 'fail', message: 'Unauthorized. Please login.' });
    });
  });
};

// Item status, cancellations, split bill, and waiter transfer
router.patch('/items/:itemId/status', protectAny, updateOrderItemStatus);
router.patch('/:orderId/items/:itemId/cancel', protectAny, cancelOrderItem);
router.patch('/:orderId/cancel', protectAny, cancelOrder);
router.post('/:orderId/split-bill', protectAny, splitBill);
router.post('/:orderId/transfer-waiter', protectAny, transferOrder);

// Middleware to protect subsequent routes for admin/branch employees
router.use(protect);

router.route('/')
  .get(restrictTo('order:read'), getOrders)
  .post(restrictTo('order:write'), createOrder);

router.post('/merge-tables', restrictTo('order:write'), mergeTables);
router.post('/split-tables', restrictTo('order:write'), splitTables);

router.route('/:orderId/status')
  .patch(restrictTo('order:write'), updateOrderStatus);

router.route('/:orderId/pay')
  .post(restrictTo('order:write'), processPayment);

router.patch('/:orderId/recall', restrictTo('order:write'), recallOrder);

export default router;
