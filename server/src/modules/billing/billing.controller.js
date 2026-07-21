import Bill from '../../models/Bill.js';
import Order from '../../models/Order.js';
import OrderItem from '../../models/OrderItem.js';
import Table from '../../models/Table.js';
import Payment from '../../models/Payment.js';
import Branch from '../../models/Branch.js';
import Restaurant from '../../models/Restaurant.js';
import Waiter from '../../models/Waiter.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';
import { getIO } from '../../socket/socketServer.js';
import mongoose from 'mongoose';

export const getBillByTable = catchAsync(async (req, res, next) => {
  const { tableId } = req.params;

  const activeOrder = await Order.findOne({
    tableId,
    status: { $in: ['pending', 'preparing', 'ready', 'billing'] }
  });

  if (!activeOrder) {
    return res.status(404).json({
      status: 'fail',
      message: 'No active order found for this table.'
    });
  }

  const items = await OrderItem.find({ orderId: activeOrder._id });
  const bill = await Bill.findOne({ orderId: activeOrder._id, paymentStatus: 'unpaid' });

  res.status(200).json({
    status: 'success',
    data: {
      order: {
        ...activeOrder.toObject(),
        items
      },
      bill
    }
  });
});

export const generateBill = catchAsync(async (req, res, next) => {
  const { tableId, orderId } = req.body;

  if (!tableId && !orderId) {
    return next(new AppError('Table ID or Order ID is required to generate bill.', 400));
  }

  let query = {};
  if (tableId) {
    query = { tableId, status: { $in: ['pending', 'preparing', 'ready', 'billing'] } };
  } else {
    query = { _id: orderId };
  }

  const activeOrder = await Order.findOne(query);

  if (!activeOrder) {
    return next(new AppError('No active order found for this table.', 404));
  }

  const items = await OrderItem.find({ orderId: activeOrder._id });
  if (items.length === 0) {
    return next(new AppError('Cannot generate a bill for an empty order.', 400));
  }

  let bill = await Bill.findOne({ orderId: activeOrder._id, paymentStatus: 'unpaid' });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const branch = await Branch.findById(activeOrder.branchId);
  const gstPercentage = branch && branch.gstPercentage !== undefined ? branch.gstPercentage : 5;
  const gstAmount = parseFloat(((subtotal * gstPercentage) / 100).toFixed(2));
  const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

  const billItems = items.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal
  }));

  if (bill) {
    bill.items = billItems;
    bill.subtotal = subtotal;
    bill.gstPercentage = gstPercentage;
    bill.gstAmount = gstAmount;
    bill.grandTotal = grandTotal;
    bill.waiterId = activeOrder.waiterId || req.billingActor.id;
    await bill.save();
  } else {
    // Generate a unique invoice number: INV-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Bill.countDocuments({ invoiceNumber: new RegExp(`^INV-${dateStr}`) });
    const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    bill = await Bill.create({
      restaurantId: activeOrder.restaurantId,
      branchId: activeOrder.branchId,
      tableId: activeOrder.tableId,
      waiterId: activeOrder.waiterId || req.billingActor.id,
      orderId: activeOrder._id,
      invoiceNumber,
      items: billItems,
      subtotal,
      gstPercentage,
      gstAmount,
      grandTotal,
      paymentStatus: 'unpaid'
    });
  }

  res.status(200).json({
    status: 'success',
    data: bill
  });
});

export const payBill = catchAsync(async (req, res, next) => {
  const { billId, paymentMethod } = req.body;

  if (!billId || !paymentMethod) {
    return next(new AppError('Bill ID and payment method are required.', 400));
  }

  if (!['Cash', 'UPI', 'Card'].includes(paymentMethod)) {
    return next(new AppError('Invalid payment method. Choose Cash, UPI, or Card.', 400));
  }

  const bill = await Bill.findById(billId);
  if (!bill) {
    return next(new AppError('Bill not found.', 404));
  }

  if (bill.paymentStatus === 'paid') {
    return next(new AppError('This bill is already paid.', 400));
  }

  // Update Bill
  bill.paymentStatus = 'paid';
  bill.paymentMethod = paymentMethod;
  await bill.save();

  // Update Order
  const order = await Order.findById(bill.orderId);
  if (order) {
    order.status = 'completed';
    order.paymentStatus = 'paid';
    await order.save();
  }

  // Update Table status to Available
  if (bill.tableId) {
    await Table.findByIdAndUpdate(bill.tableId, { status: 'Available' });
  }

  // Store payment details in existing Payment model
  const payment = await Payment.create({
    orderId: bill.orderId,
    restaurantId: bill.restaurantId,
    branchId: bill.branchId,
    amount: bill.grandTotal,
    paymentMethod: paymentMethod.toLowerCase(),
    status: 'completed',
    transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  });

  // Emit websocket events for updates
  try {
    const io = getIO();
    io.to(bill.branchId.toString()).emit('order_status_updated', {
      orderId: bill.orderId,
      status: 'completed',
      paymentStatus: 'paid'
    });
    if (bill.tableId) {
      io.to(bill.branchId.toString()).emit('table_status_updated', {
        tableId: bill.tableId,
        status: 'Available'
      });
    }
    // Trigger generic sync/reload on clients
    io.to(bill.branchId.toString()).emit('tables_updated');
  } catch (err) {
    console.error('[Socket] Failed to broadcast billing updates', err.message);
  }

  res.status(200).json({
    status: 'success',
    data: {
      bill,
      payment
    }
  });
});

export const getInvoice = catchAsync(async (req, res, next) => {
  const { invoiceId } = req.params;

  const query = mongoose.Types.ObjectId.isValid(invoiceId)
    ? { _id: invoiceId }
    : { invoiceNumber: invoiceId };

  const bill = await Bill.findOne(query)
    .populate('restaurantId', 'name')
    .populate('branchId', 'name address phone gstNumber')
    .populate('tableId', 'tableNumber')
    .populate('waiterId', 'name')
    .populate('orderId');

  if (!bill) {
    return next(new AppError('Invoice not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: bill
  });
});

export const closeTable = catchAsync(async (req, res, next) => {
  const { tableId } = req.body;

  if (!tableId) {
    return next(new AppError('Table ID is required to close the table.', 400));
  }

  const table = await Table.findById(tableId);
  if (!table) {
    return next(new AppError('Table not found.', 404));
  }

  if (table.status === 'Available') {
    return next(new AppError('Table is already available.', 400));
  }

  const activeOrder = await Order.findOne({
    tableId,
    status: { $in: ['pending', 'preparing', 'ready'] }
  });

  if (!activeOrder) {
    return next(new AppError('No active order session found for this table.', 404));
  }

  const items = await OrderItem.find({ orderId: activeOrder._id });
  if (items.length === 0) {
    return next(new AppError('Cannot close a table with an empty order.', 400));
  }

  const unfinishedItems = items.filter(item => ['pending', 'preparing'].includes(item.status));
  if (unfinishedItems.length > 0) {
    return next(new AppError('Some items are not yet ready. Please mark all items as ready before closing the table.', 400));
  }

  table.status = 'Billing';
  await table.save();

  activeOrder.status = 'billing';
  await activeOrder.save();

  try {
    const io = getIO();
    io.to(table.branchId.toString()).emit('order_status_updated', {
      orderId: activeOrder._id,
      status: 'billing',
      order: {
        ...activeOrder.toObject(),
        items
      }
    });
    io.to(table.branchId.toString()).emit('tables_updated');
  } catch (socketErr) {
    console.error('[Socket] Failed to broadcast close table status', socketErr.message);
  }

  res.status(200).json({
    status: 'success',
    message: 'Table moved to Billing state successfully.',
    data: {
      table,
      order: activeOrder
    }
  });
});

export const getTableHistory = catchAsync(async (req, res, next) => {
  const { tableId } = req.params;
  const branchId = req.billingActor.branchId;
  const restaurantId = req.billingActor.restaurantId;

  if (!tableId) {
    return next(new AppError('Table ID is required to fetch history.', 400));
  }

  const bills = await Bill.find({
    tableId,
    branchId,
    restaurantId,
    paymentStatus: 'paid'
  })
  .populate('orderId')
  .populate('waiterId', 'name')
  .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: bills
  });
});
