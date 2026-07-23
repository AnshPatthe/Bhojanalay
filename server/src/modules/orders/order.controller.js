import OrderService from './order.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';
import OrderItem from '../../models/OrderItem.js';
import Order from '../../models/Order.js';
import { getIO } from '../../socket/socketServer.js';

export const createOrder = catchAsync(async (req, res, next) => {
  const employee = req.employee;
  if (!employee) {
    return next(new AppError('Only active employees can create orders.', 403));
  }

  const result = await OrderService.createOrder(
    employee.restaurantId?._id || employee.restaurantId,
    employee.branchId?._id || req.headers['x-branch-id'],
    employee._id,
    req.body
  );

  res.status(201).json({
    status: 'success',
    data: result
  });
});

export const getOrders = catchAsync(async (req, res, next) => {
  const branchId = req.employee?.branchId?._id || req.headers['x-branch-id'];
  if (!branchId) {
    return next(new AppError('Branch context is required.', 400));
  }

  const orders = await OrderService.getOrders(branchId, {
    status: req.query.status,
    paymentStatus: req.query.paymentStatus
  });

  res.status(200).json({
    status: 'success',
    data: orders
  });
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const order = await OrderService.updateOrderStatus(
    req.params.orderId,
    req.body.status,
    req.employee?._id || null
  );

  res.status(200).json({
    status: 'success',
    data: order
  });
});

export const updateOrderItemStatus = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { status } = req.body;
  const employeeId = req.employee?._id || null;

  const item = await OrderService.updateOrderItemStatus(itemId, status, employeeId);

  res.status(200).json({
    status: 'success',
    data: item
  });
});

export const processPayment = catchAsync(async (req, res, next) => {
  const employee = req.employee;
  if (!employee) {
    return next(new AppError('Employee context required to process payments.', 403));
  }

  const result = await OrderService.processPayment(
    employee.restaurantId?._id || employee.restaurantId,
    employee.branchId?._id,
    req.params.orderId,
    req.body
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

export const cancelOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const employeeId = req.employee?._id || null;

  const order = await OrderService.cancelOrder(orderId, reason, employeeId);

  res.status(200).json({
    status: 'success',
    data: order
  });
});

export const cancelOrderItem = catchAsync(async (req, res, next) => {
  const { orderId, itemId } = req.params;
  const { reason } = req.body;
  const employeeId = req.employee?._id || null;

  const item = await OrderService.cancelOrderItem(orderId, itemId, reason, employeeId);

  res.status(200).json({
    status: 'success',
    data: item
  });
});

export const recallOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const employeeId = req.employee?._id || null;

  const order = await OrderService.recallOrderToPreparing(orderId, employeeId);

  res.status(200).json({
    status: 'success',
    data: order
  });
});

export const splitBill = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { count } = req.body;

  const bill = await OrderService.splitBill(orderId, parseInt(count, 10));

  res.status(200).json({
    status: 'success',
    data: bill
  });
});

export const mergeTables = catchAsync(async (req, res, next) => {
  const branchId = req.employee?.branchId?._id || req.headers['x-branch-id'];
  const { tables } = req.body;

  const result = await OrderService.mergeTables(branchId, tables);

  res.status(200).json({
    status: 'success',
    data: result
  });
});

export const splitTables = catchAsync(async (req, res, next) => {
  const branchId = req.employee?.branchId?._id || req.headers['x-branch-id'];
  const { tableNumber } = req.body;

  const result = await OrderService.splitMergedTables(branchId, tableNumber);

  res.status(200).json({
    status: 'success',
    data: result
  });
});

export const transferOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { newWaiterId } = req.body;

  const order = await OrderService.transferOrder(orderId, newWaiterId);

  res.status(200).json({
    status: 'success',
    data: order
  });
});


