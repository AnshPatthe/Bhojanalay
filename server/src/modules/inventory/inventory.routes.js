import express from 'express';
import {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStock
} from './inventory.controller.js';
import { protect, restrictTo } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('inventory:read'), getInventory)
  .post(restrictTo('inventory:write'), addInventoryItem);

router.route('/low-stock')
  .get(restrictTo('inventory:read'), getLowStock);

router.route('/:itemId')
  .put(restrictTo('inventory:write'), updateInventoryItem)
  .delete(restrictTo('inventory:write'), deleteInventoryItem);

export default router;
