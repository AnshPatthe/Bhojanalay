import express from 'express';
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  processPayment,
  updateOrderItemStatus
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

router.patch('/items/:itemId/status', protectAny, updateOrderItemStatus);

router.use(protect);

router.route('/')
  .get(restrictTo('order:read'), getOrders)
  .post(restrictTo('order:write'), createOrder);

router.route('/:orderId/status')
  .patch(restrictTo('order:write'), updateOrderStatus);

router.route('/:orderId/pay')
  .post(restrictTo('order:write'), processPayment);

export default router;
