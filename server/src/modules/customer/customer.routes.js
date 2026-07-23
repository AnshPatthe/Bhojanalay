import express from 'express';
import { getTableOrderContext, createCustomerOrder } from './customer.controller.js';

const router = express.Router();

// Public Customer QR Ordering Endpoints
router.get('/table/:tableId', getTableOrderContext);
router.post('/order', createCustomerOrder);

export default router;
