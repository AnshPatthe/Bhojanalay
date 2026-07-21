import express from 'express';
import {
  getTables,
  addTable,
  updateTableStatus,
  updateTable,
  deleteTable
} from './table.controller.js';
import { protect, restrictTo } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('order:read'), getTables)
  .post(restrictTo('settings:write'), addTable);

router.route('/:tableId')
  .patch(restrictTo('settings:write'), updateTable)
  .delete(restrictTo('settings:write'), deleteTable);

router.route('/:tableId/status')
  .patch(restrictTo('order:write'), updateTableStatus);

export default router;
