import Table from '../../models/Table.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';
import { getIO } from '../../socket/socketServer.js';

export const getTables = catchAsync(async (req, res, next) => {
  const branchId = req.employee?.branchId?._id || req.headers['x-branch-id'];
  if (!branchId) {
    return next(new AppError('Branch context required.', 400));
  }

  const tables = await Table.find({ branchId }).sort({ tableNumber: 1 });

  res.status(200).json({
    status: 'success',
    data: tables
  });
});

export const addTable = catchAsync(async (req, res, next) => {
  const employee = req.employee;
  const branchId = employee?.branchId?._id || req.headers['x-branch-id'];
  if (!employee || !branchId) {
    return next(new AppError('Employee branch context required.', 400));
  }

  const { tableNumber, capacity, floor } = req.body;

  if (!tableNumber) {
    return next(new AppError('Table number is required.', 400));
  }

  const existingTable = await Table.findOne({ branchId, tableNumber });
  if (existingTable) {
    return next(new AppError('Table already exists.', 400));
  }

  const newTable = await Table.create({
    restaurantId: employee.restaurantId?._id || employee.restaurantId,
    branchId,
    tableNumber,
    capacity: capacity || 4,
    floor: floor || 'Ground Floor',
    status: 'Available'
  });

  try {
    const io = getIO();
    io.to(branchId.toString()).emit('tables_updated');
  } catch (socketErr) {
    console.error('[Socket] Failed to broadcast tables_updated', socketErr.message);
  }

  res.status(201).json({
    status: 'success',
    data: newTable
  });
});

export const updateTableStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const validStatuses = ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Billing'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid table status.', 400));
  }

  const table = await Table.findByIdAndUpdate(
    req.params.tableId,
    { status },
    { new: true, runValidators: true }
  );

  if (!table) {
    return next(new AppError('Table not found.', 404));
  }

  try {
    const io = getIO();
    io.to(table.branchId.toString()).emit('tables_updated');
  } catch (socketErr) {
    console.error('[Socket] Failed to broadcast tables_updated', socketErr.message);
  }

  res.status(200).json({
    status: 'success',
    data: table
  });
});

export const updateTable = catchAsync(async (req, res, next) => {
  const { tableNumber, capacity, floor } = req.body;
  const { tableId } = req.params;

  const table = await Table.findById(tableId);
  if (!table) {
    return next(new AppError('Table not found.', 404));
  }

  if (tableNumber && tableNumber !== table.tableNumber) {
    const existingTable = await Table.findOne({ branchId: table.branchId, tableNumber });
    if (existingTable) {
      return next(new AppError('Table number already exists in this branch.', 400));
    }
    table.tableNumber = tableNumber;
  }

  if (capacity !== undefined) table.capacity = capacity;
  if (floor !== undefined) table.floor = floor;

  await table.save();

  try {
    const io = getIO();
    io.to(table.branchId.toString()).emit('tables_updated');
  } catch (socketErr) {
    console.error('[Socket] Failed to broadcast tables_updated', socketErr.message);
  }

  res.status(200).json({
    status: 'success',
    data: table
  });
});

export const deleteTable = catchAsync(async (req, res, next) => {
  const { tableId } = req.params;

  const table = await Table.findByIdAndDelete(tableId);
  if (!table) {
    return next(new AppError('Table not found.', 404));
  }

  try {
    const io = getIO();
    io.to(table.branchId.toString()).emit('tables_updated');
  } catch (socketErr) {
    console.error('[Socket] Failed to broadcast tables_updated', socketErr.message);
  }

  res.status(200).json({
    status: 'success',
    message: 'Table deleted successfully'
  });
});
