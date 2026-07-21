import Waiter from '../../models/Waiter.js';
import Table from '../../models/Table.js';
import MenuItem from '../../models/MenuItem.js';
import Category from '../../models/Category.js';
import Order from '../../models/Order.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';
import { getIO } from '../../socket/socketServer.js';
import OrderService from '../orders/order.service.js';
import jwt from 'jsonwebtoken';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '12h' // Waiters need shift-long tokens, avoiding 15m expiration
  });
};

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const waiter = await Waiter.findOne({ email }).select('+password');
  if (!waiter || !(await waiter.comparePassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  
  if (waiter.status !== 'active') {
    return next(new AppError('Account is not active', 403));
  }

  const token = signToken(waiter._id);

  res.cookie('waiterToken', token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  const populatedWaiter = await Waiter.findById(waiter._id).populate('restaurantId', 'name currency');
  const waiterData = populatedWaiter.toObject();
  waiterData.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: {
      ...waiterData,
      restaurantName: populatedWaiter.restaurantId?.name || '',
      restaurantCurrency: populatedWaiter.restaurantId?.currency || 'USD'
    }
  });
});

export const getTables = catchAsync(async (req, res, next) => {
  const tables = await Table.find({ branchId: req.waiter.branchId }).sort({ tableNumber: 1 });
  res.status(200).json({ status: 'success', data: tables });
});

export const getMenu = catchAsync(async (req, res, next) => {
  const categories = await Category.find({ restaurantId: req.waiter.restaurantId });
  const menuItems = await MenuItem.find({ restaurantId: req.waiter.restaurantId });
  
  res.status(200).json({ 
    status: 'success', 
    data: { categories, items: menuItems } 
  });
});

export const createOrder = catchAsync(async (req, res, next) => {
  console.log('[WaiterController] Received createOrder payload:', JSON.stringify({ tableId: req.body.tableId, items: req.body.items }));
  const { tableId, items, notes } = req.body;
  if (!tableId || !items || items.length === 0) {
    return next(new AppError('Table and items are required.', 400));
  }

  const table = await Table.findOne({ _id: tableId, branchId: req.waiter.branchId });
  if (!table) return next(new AppError('Table not found.', 404));

  const orderData = {
    tableNumber: table.tableNumber,
    tableId: table._id,
    orderType: 'dine-in',
    items,
    notes,
    waiterId: req.waiter._id
  };

  const result = await OrderService.createOrder(
    req.waiter.restaurantId,
    req.waiter.branchId,
    null,
    orderData
  );

  res.status(201).json({ status: 'success', data: result.order });
});

export const getOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ 
    branchId: req.waiter.branchId,
    status: { $in: ['pending', 'preparing', 'ready'] }
  }).sort({ createdAt: -1 });
  
  res.status(200).json({ status: 'success', data: orders });
});

export const getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, branchId: req.waiter.branchId });
  if (!order) return next(new AppError('Order not found', 404));
  res.status(200).json({ status: 'success', data: order });
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, branchId: req.waiter.branchId },
    { status },
    { new: true, runValidators: true }
  );

  if (!order) return next(new AppError('Order not found', 404));

  if (status === 'completed' || status === 'cancelled') {
    try {
      if (order.orderType === 'dine-in' && order.tableNumber) {
        await Table.findOneAndUpdate(
          { branchId: req.waiter.branchId, tableNumber: order.tableNumber },
          { status: 'Available' }
        );
      }
    } catch (err) {
      console.error('Failed to release table', err);
    }
  }

  try {
    const io = getIO();
    io.to(req.waiter.branchId.toString()).emit('order_status_updated', { orderId: order._id, status, order });
    io.to(req.waiter.branchId.toString()).emit('tables_updated');
  } catch (err) {
    console.error('Socket error', err);
  }

  res.status(200).json({ status: 'success', data: order });
});
