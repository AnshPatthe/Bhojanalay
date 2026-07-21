import CategoryRepository from './category.repository.js';
import MenuItemRepository from './menuItem.repository.js';
import Modifier from '../../models/Modifier.js';
import AppError from '../../utils/AppError.js';

class MenuService {
  // Categories
  async getCategories(restaurantId) {
    return CategoryRepository.findByRestaurant(restaurantId);
  }

  async createCategory(restaurantId, data) {
    return CategoryRepository.create({ ...data, restaurantId });
  }

  async updateCategory(categoryId, data) {
    return CategoryRepository.update(categoryId, data);
  }

  async deleteCategory(categoryId) {
    // Delete all menu items in this category first
    await MenuItemRepository.deleteMany({ categoryId });
    return CategoryRepository.delete(categoryId);
  }

  // Menu Items
  async getMenuItems(restaurantId, categoryId) {
    const filter = { restaurantId };
    if (categoryId) filter.categoryId = categoryId;
    return MenuItemRepository.find(filter);
  }

  async createMenuItem(restaurantId, data) {
    return MenuItemRepository.create({ ...data, restaurantId });
  }

  async updateMenuItem(menuItemId, data) {
    return MenuItemRepository.update(menuItemId, data);
  }

  async deleteMenuItem(menuItemId) {
    // Delete associated modifiers
    await Modifier.deleteMany({ menuItemId });
    return MenuItemRepository.delete(menuItemId);
  }

  // Modifiers
  async getModifiers(menuItemId) {
    return Modifier.find({ menuItemId });
  }

  async createModifier(menuItemId, data) {
    return Modifier.create({ ...data, menuItemId });
  }

  async updateModifier(modifierId, data) {
    return Modifier.findByIdAndUpdate(modifierId, data, { new: true, runValidators: true }).exec();
  }

  async deleteModifier(modifierId) {
    return Modifier.findByIdAndDelete(modifierId).exec();
  }
}

export default new MenuService();
