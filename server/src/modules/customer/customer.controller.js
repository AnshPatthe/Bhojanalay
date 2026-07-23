import Table from '../../models/Table.js';
import MenuItem from '../../models/MenuItem.js';
import Category from '../../models/Category.js';
import OrderService from '../orders/order.service.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';
import { getIO } from '../../socket/socketServer.js';

export const getTableOrderContext = catchAsync(async (req, res, next) => {
  const { tableId } = req.params;

  const table = await Table.findById(tableId).populate('restaurantId', 'name currency logo description');
  if (!table) {
    return next(new AppError('Table not found or invalid QR code', 404));
  }

  const restaurantId = table.restaurantId._id || table.restaurantId;
  const categories = await Category.find({ restaurantId }).sort({ name: 1 });
  const menuItems = await MenuItem.find({ restaurantId, isAvailable: true }).sort({ name: 1 });

  res.status(200).json({
    status: 'success',
    data: {
      table: {
        _id: table._id,
        tableNumber: table.tableNumber,
        floor: table.floor,
        capacity: table.capacity,
        status: table.status
      },
      restaurant: table.restaurantId,
      categories,
      items: menuItems
    }
  });
});

export const createCustomerOrder = catchAsync(async (req, res, next) => {
  const { tableId, items, customerName, notes } = req.body;

  if (!tableId || !items || items.length === 0) {
    return next(new AppError('Table ID and order items are required.', 400));
  }

  const table = await Table.findById(tableId);
  if (!table) {
    return next(new AppError('Table not found.', 404));
  }

  if (table.status === 'Billing') {
    return next(new AppError('This table is locked for billing.', 400));
  }

  const orderData = {
    tableNumber: table.tableNumber,
    tableId: table._id,
    orderType: 'dine-in',
    items,
    customerName: customerName || `Table ${table.tableNumber} Guest`,
    notes: notes ? `[QR Order] ${notes}` : '[QR Customer Order]'
  };

  const result = await OrderService.createOrder(
    table.restaurantId,
    table.branchId,
    null,
    orderData
  );

  // Update table status to Occupied if Free/Available
  if (table.status === 'Available' || table.status === 'Free') {
    table.status = 'Occupied';
    await table.save();
  }

  // Socket notification to Kitchen, Waiter, and Dashboard
  try {
    const io = getIO();
    io.to(table.branchId.toString()).emit('new_order', {
      order: result.order,
      tableNumber: table.tableNumber
    });
    io.to(table.branchId.toString()).emit('tables_updated');
  } catch (socketErr) {
    console.error('[Socket] Failed to broadcast customer QR order:', socketErr.message);
  }

  res.status(201).json({
    status: 'success',
    message: 'Order placed successfully via Table QR Scan',
    data: result.order
  });
});
