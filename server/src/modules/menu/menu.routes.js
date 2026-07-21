import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getModifiers,
  createModifier,
  deleteModifier
} from './menu.controller.js';
import { protect, restrictTo } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // Apply protection globally to menu actions

router.route('/categories')
  .get(getCategories)
  .post(restrictTo('menu:write'), createCategory);

router.route('/categories/:categoryId')
  .put(restrictTo('menu:write'), updateCategory)
  .delete(restrictTo('menu:write'), deleteCategory);

router.route('/items')
  .get(getMenuItems)
  .post(restrictTo('menu:write'), createMenuItem);

router.route('/items/:menuItemId')
  .put(restrictTo('menu:write'), updateMenuItem)
  .delete(restrictTo('menu:write'), deleteMenuItem);

router.route('/items/:menuItemId/modifiers')
  .get(getModifiers)
  .post(restrictTo('menu:write'), createModifier);

router.route('/modifiers/:modifierId')
  .delete(restrictTo('menu:write'), deleteModifier);

export default router;
