import InventoryService from './inventory.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';

export const getInventory = catchAsync(async (req, res, next) => {
  const branchId = req.employee?.branchId?._id || req.headers['x-branch-id'];
  if (!branchId) {
    return next(new AppError('Branch context required.', 400));
  }

  const inventory = await InventoryService.getInventory(branchId);

  res.status(200).json({
    status: 'success',
    data: inventory
  });
});

export const addInventoryItem = catchAsync(async (req, res, next) => {
  const employee = req.employee;
  const branchId = employee?.branchId?._id || req.headers['x-branch-id'];
  if (!employee || !branchId) {
    return next(new AppError('Employee branch context required.', 400));
  }

  const item = await InventoryService.addInventoryItem(
    employee.restaurantId?._id || employee.restaurantId,
    branchId,
    req.body
  );

  res.status(201).json({
    status: 'success',
    data: item
  });
});

export const updateInventoryItem = catchAsync(async (req, res, next) => {
  const item = await InventoryService.updateInventoryItem(
    req.params.itemId,
    req.body
  );

  res.status(200).json({
    status: 'success',
    data: item
  });
});

export const deleteInventoryItem = catchAsync(async (req, res, next) => {
  await InventoryService.deleteInventoryItem(req.params.itemId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

export const getLowStock = catchAsync(async (req, res, next) => {
  const branchId = req.employee?.branchId?._id || req.headers['x-branch-id'];
  if (!branchId) {
    return next(new AppError('Branch context required.', 400));
  }

  const items = await InventoryService.getLowStock(branchId);

  res.status(200).json({
    status: 'success',
    data: items
  });
});
