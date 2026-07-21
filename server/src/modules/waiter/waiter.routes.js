import express from 'express';
import {
  login,
  getTables,
  getMenu,
  createOrder,
  updateOrderStatus,
  getOrders,
  getOrderById
} from './waiter.controller.js';
import { protectWaiter } from '../../middleware/waiter.middleware.js';

const router = express.Router();

router.post('/login', login);

router.use(protectWaiter);

router.get('/tables', getTables);
router.get('/menu', getMenu);
router.post('/orders', createOrder);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id', updateOrderStatus);

export default router;
