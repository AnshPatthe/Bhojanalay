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
    req.body.status
  );

  res.status(200).json({
    status: 'success',
    data: order
  });
});

export const updateOrderItemStatus = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid item status.', 400));
  }

  const item = await OrderItem.findByIdAndUpdate(
    itemId,
    { status },
    { new: true, runValidators: true }
  );

  if (!item) {
    return next(new AppError('Order item not found.', 404));
  }

  const order = await Order.findById(item.orderId);
  if (!order) {
    return next(new AppError('Order not found for this item.', 404));
  }

  const items = await OrderItem.find({ orderId: order._id });

  // Update order status to 'ready' if all active items are ready or served
  const activeItems = items.filter(i => i.status !== 'cancelled');
  const allReady = activeItems.every(i => ['ready', 'served'].includes(i.status));
  if (allReady && activeItems.length > 0 && order.status !== 'ready' && order.status !== 'billing' && order.status !== 'completed' && order.status !== 'cancelled') {
    order.status = 'ready';
    await order.save();
  }

  try {
    const io = getIO();
    io.to(order.branchId.toString()).emit('order_status_updated', {
      orderId: order._id,
      status: order.status,
      order: {
        ...order.toObject(),
        items
      }
    });
    io.to(order.branchId.toString()).emit('tables_updated');
  } catch (socketErr) {
    console.error('[Socket] Failed to broadcast item status update', socketErr.message);
  }

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
