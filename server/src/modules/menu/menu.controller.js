import MenuService from './menu.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';

// Categories
export const getCategories = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId || req.query.restaurantId;
  if (!restaurantId) return next(new AppError('Restaurant context is required', 400));

  const categories = await MenuService.getCategories(restaurantId);
  res.status(200).json({ status: 'success', data: categories });
});

export const createCategory = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId;
  if (!restaurantId) return next(new AppError('Only active employees can create categories', 400));

  const category = await MenuService.createCategory(restaurantId, req.body);
  res.status(201).json({ status: 'success', data: category });
});

export const updateCategory = catchAsync(async (req, res, next) => {
  const category = await MenuService.updateCategory(req.params.categoryId, req.body);
  res.status(200).json({ status: 'success', data: category });
});

export const deleteCategory = catchAsync(async (req, res, next) => {
  await MenuService.deleteCategory(req.params.categoryId);
  res.status(204).json({ status: 'success', data: null });
});

// Menu Items
export const getMenuItems = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId || req.query.restaurantId;
  if (!restaurantId) return next(new AppError('Restaurant context is required', 400));

  const menuItems = await MenuService.getMenuItems(restaurantId, req.query.categoryId);
  res.status(200).json({ status: 'success', data: menuItems });
});

export const createMenuItem = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId;
  if (!restaurantId) return next(new AppError('Only active employees can create menu items', 400));

  const menuItem = await MenuService.createMenuItem(restaurantId, req.body);
  res.status(201).json({ status: 'success', data: menuItem });
});

export const updateMenuItem = catchAsync(async (req, res, next) => {
  const menuItem = await MenuService.updateMenuItem(req.params.menuItemId, req.body);
  res.status(200).json({ status: 'success', data: menuItem });
});

export const deleteMenuItem = catchAsync(async (req, res, next) => {
  await MenuService.deleteMenuItem(req.params.menuItemId);
  res.status(204).json({ status: 'success', data: null });
});

// Modifiers
export const getModifiers = catchAsync(async (req, res, next) => {
  const modifiers = await MenuService.getModifiers(req.params.menuItemId);
  res.status(200).json({ status: 'success', data: modifiers });
});

export const createModifier = catchAsync(async (req, res, next) => {
  const modifier = await MenuService.createModifier(req.params.menuItemId, req.body);
  res.status(201).json({ status: 'success', data: modifier });
});

export const deleteModifier = catchAsync(async (req, res, next) => {
  await MenuService.deleteModifier(req.params.modifierId);
  res.status(204).json({ status: 'success', data: null });
});
