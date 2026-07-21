import express from 'express';
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getRoles
} from './employee.controller.js';
import { protect, restrictTo } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('employees:manage'), getEmployees)
  .post(restrictTo('employees:manage'), addEmployee);

router.route('/roles')
  .get(getRoles);

router.route('/:employeeId')
  .put(restrictTo('employees:manage'), updateEmployee)
  .delete(restrictTo('employees:manage'), deleteEmployee);

export default router;
