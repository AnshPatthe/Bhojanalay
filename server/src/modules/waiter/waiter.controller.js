import Waiter from '../../models/Waiter.js';
import Table from '../../models/Table.js';
import MenuItem from '../../models/MenuItem.js';
import Category from '../../models/Category.js';
import Order from '../../models/Order.js';
import OrderItem from '../../models/OrderItem.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';
import { getIO } from '../../socket/socketServer.js';
import SOCKET_EVENTS from '../../socket/socketEvents.js';
import OrderService from '../orders/order.service.js';
import jwt from 'jsonwebtoken';
import Leave from '../../models/Leave.js';
import Attendance from '../../models/Attendance.js';
import Payroll from '../../models/Payroll.js';

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

  res.status(201).json({
    status: 'success',
    data: {
      ...result.order.toObject(),
      items: result.items
    }
  });
});

export const getOrders = catchAsync(async (req, res, next) => {
  const query = { branchId: req.waiter.branchId };
  if (req.query.all !== 'true' && !req.query.status) {
    query.status = { $in: ['pending', 'preparing', 'ready', 'billing'] };
  } else if (req.query.status) {
    query.status = req.query.status;
  }

  const orders = await Order.find(query).sort({ createdAt: -1 });

  const populatedOrders = await Promise.all(
    orders.map(async (order) => {
      const items = await OrderItem.find({ orderId: order._id });
      return {
        ...order.toObject(),
        items
      };
    })
  );
  
  res.status(200).json({ status: 'success', data: populatedOrders });
});

export const getWaiters = catchAsync(async (req, res, next) => {
  const waiters = await Waiter.find({ branchId: req.waiter.branchId, status: 'active' }).select('name email status _id');
  res.status(200).json({ status: 'success', data: waiters });
});

export const getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, branchId: req.waiter.branchId });
  if (!order) return next(new AppError('Order not found', 404));
  
  const items = await OrderItem.find({ orderId: order._id });

  res.status(200).json({
    status: 'success',
    data: {
      ...order.toObject(),
      items
    }
  });
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  // Waiter updating status – passes null as employeeId so it checks waiter locks
  const order = await OrderService.updateOrderStatus(
    req.params.id,
    status,
    null
  );

  const items = await OrderItem.find({ orderId: order._id });

  res.status(200).json({
    status: 'success',
    data: {
      ...order.toObject(),
      items
    }
  });
});

export const applyLeave = catchAsync(async (req, res, next) => {
  const { startDate, endDate, type, reason } = req.body;
  if (!startDate || !endDate || !type) {
    return next(new AppError('Start date, end date, and leave type are required.', 400));
  }

  const leave = await Leave.create({
    waiterId: req.waiter._id,
    restaurantId: req.waiter.restaurantId,
    branchId: req.waiter.branchId,
    startDate,
    endDate,
    type,
    reason,
    status: 'Pending'
  });

  // Notify Admin via WebSocket room
  try {
    const io = getIO();
    io.to(req.waiter.branchId.toString()).emit(SOCKET_EVENTS.LEAVE_APPLIED, {
      leaveId: leave._id,
      waiterId: req.waiter._id,
      waiterName: req.waiter.name,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason
    });
  } catch (err) {
    console.log('Socket leave notification failed:', err.message);
  }

  res.status(201).json({ status: 'success', data: leave });
});

export const getLeaves = catchAsync(async (req, res, next) => {
  const leaves = await Leave.find({ waiterId: req.waiter._id }).sort({ startDate: -1 });
  res.status(200).json({ status: 'success', data: leaves });
});

export const getLeaveBalance = catchAsync(async (req, res, next) => {
  const approvedLeaves = await Leave.find({ waiterId: req.waiter._id, status: 'Approved' });
  
  let sickTaken = 0;
  let casualTaken = 0;
  let earnedTaken = 0;
  
  approvedLeaves.forEach(l => {
    const days = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    if (l.type === 'Sick') sickTaken += days;
    else if (l.type === 'Casual') casualTaken += days;
    else if (l.type === 'Earned') earnedTaken += days;
  });

  res.status(200).json({
    status: 'success',
    data: {
      sick: { allocated: 10, taken: sickTaken, remaining: Math.max(0, 10 - sickTaken) },
      casual: { allocated: 15, taken: casualTaken, remaining: Math.max(0, 15 - casualTaken) },
      earned: { allocated: 12, taken: earnedTaken, remaining: Math.max(0, 12 - earnedTaken) }
    }
  });
});

export const clockIn = catchAsync(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Check if waiter has an Approved Leave for today
  const activeApprovedLeave = await Leave.findOne({
    waiterId: req.waiter._id,
    status: 'Approved',
    startDate: { $lte: todayEnd },
    endDate: { $gte: today }
  });

  if (activeApprovedLeave) {
    return next(new AppError('You are on approved leave today. Enjoy your day off! 🏖️', 400));
  }

  let attendance = await Attendance.findOne({
    waiterId: req.waiter._id,
    date: today
  });

  if (attendance && attendance.clockIn) {
    return next(new AppError('Already clocked in for today.', 400));
  }

  if (attendance) {
    attendance.clockIn = new Date();
    attendance.status = 'Present';
    await attendance.save();
  } else {
    attendance = await Attendance.create({
      waiterId: req.waiter._id,
      restaurantId: req.waiter.restaurantId,
      branchId: req.waiter.branchId,
      date: today,
      clockIn: new Date(),
      status: 'Present'
    });
  }

  res.status(200).json({ status: 'success', data: attendance });
});

export const clockOut = catchAsync(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    waiterId: req.waiter._id,
    date: today
  });

  if (!attendance || !attendance.clockIn) {
    return next(new AppError('You have not clocked in yet today.', 400));
  }

  if (attendance.clockOut) {
    return next(new AppError('Already clocked out for today.', 400));
  }

  attendance.clockOut = new Date();
  
  const diffMs = attendance.clockOut - attendance.clockIn;
  const hoursWorked = diffMs / (1000 * 60 * 60);
  if (hoursWorked > 8) {
    attendance.overtimeHours = parseFloat((hoursWorked - 8).toFixed(2));
  }

  await attendance.save();

  res.status(200).json({ status: 'success', data: attendance });
});

export const getAttendance = catchAsync(async (req, res, next) => {
  const attendance = await Attendance.find({ waiterId: req.waiter._id }).sort({ date: -1 });
  res.status(200).json({ status: 'success', data: attendance });
});

export const getPayroll = catchAsync(async (req, res, next) => {
  let payrolls = await Payroll.find({ waiterId: req.waiter._id }).sort({ month: -1 });

  if (payrolls.length === 0) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const mockPayroll = {
      month: currentMonth,
      baseSalary: 1800,
      workingDays: 24,
      overtimeHours: 6,
      overtimePay: 90,
      incentives: 150,
      deductions: 50,
      netSalary: 1990,
      status: 'Paid'
    };
    payrolls = [mockPayroll];
  }

  res.status(200).json({ status: 'success', data: payrolls });
});

export const updateProfile = catchAsync(async (req, res, next) => {
  const { name, phone, dob, profilePhoto, password } = req.body;

  const waiter = await Waiter.findById(req.waiter._id);
  if (!waiter) {
    return next(new AppError('Waiter account not found', 404));
  }

  if (name !== undefined) waiter.name = name;
  if (phone !== undefined) waiter.phone = phone;
  if (dob !== undefined) waiter.dob = dob;
  if (profilePhoto !== undefined) waiter.profilePhoto = profilePhoto;

  if (password) {
    waiter.password = password;
  }

  await waiter.save();

  const populatedWaiter = await Waiter.findById(waiter._id).populate('restaurantId', 'name currency');
  const waiterData = populatedWaiter.toObject();
  waiterData.password = undefined;

  res.status(200).json({
    status: 'success',
    data: {
      ...waiterData,
      restaurantName: populatedWaiter.restaurantId?.name || '',
      restaurantCurrency: populatedWaiter.restaurantId?.currency || 'USD'
    }
  });
});
