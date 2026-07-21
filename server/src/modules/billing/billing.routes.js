import express from 'express';
import { getBillByTable, generateBill, payBill, getInvoice, closeTable, getTableHistory } from './billing.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { protectWaiter } from '../../middleware/waiter.middleware.js';

const router = express.Router();

// Middleware to allow either admin/employee or waiter
const protectAny = (req, res, next) => {
  protectWaiter(req, res, (err) => {
    if (!err && req.waiter) {
      req.billingActor = {
        type: 'waiter',
        id: req.waiter._id,
        restaurantId: req.waiter.restaurantId,
        branchId: req.waiter.branchId,
        name: req.waiter.name
      };
      return next();
    }
    
    protect(req, res, (err2) => {
      if (!err2 && req.employee) {
        req.billingActor = {
          type: 'employee',
          id: req.employee._id,
          restaurantId: req.employee.restaurantId,
          branchId: req.employee.branchId,
          name: req.employee.name || req.user.name
        };
        return next();
      }
      return res.status(401).json({ status: 'fail', message: 'Unauthorized. Please login.' });
    });
  });
};

router.use(protectAny);

router.post('/close-table', closeTable);
router.get('/history/:tableId', getTableHistory);
router.get('/:tableId', getBillByTable);
router.post('/generate', generateBill);
router.post('/pay', payBill);
router.get('/invoice/:invoiceId', getInvoice);

export default router;
