import InventoryRepository from './inventory.repository.js';
import AppError from '../../utils/AppError.js';

class InventoryService {
  async getInventory(branchId) {
    return InventoryRepository.findByBranch(branchId);
  }

  async addInventoryItem(restaurantId, branchId, data) {
    const { itemName, quantity, unit, reorderLevel, costPrice, supplierName } = data;

    // Check if item already exists in this branch
    const existingItem = await InventoryRepository.findOne({ branchId, itemName });
    if (existingItem) {
      throw new AppError(`Item '${itemName}' already exists in inventory. Update quantity instead.`, 400);
    }

    return InventoryRepository.create({
      restaurantId,
      branchId,
      itemName,
      quantity: quantity || 0,
      unit,
      reorderLevel: reorderLevel || 10,
      costPrice: costPrice || 0,
      supplierName: supplierName || ''
    });
  }

  async updateInventoryItem(itemId, data) {
    const item = await InventoryRepository.findById(itemId);
    if (!item) {
      throw new AppError('Inventory item not found.', 404);
    }

    if (data.itemName && data.itemName !== item.itemName) {
      const existing = await InventoryRepository.findOne({
        branchId: item.branchId,
        itemName: data.itemName,
        _id: { $ne: itemId }
      });
      if (existing) {
        throw new AppError(`Item '${data.itemName}' already exists in inventory.`, 400);
      }
    }

    return InventoryRepository.update(itemId, data);
  }

  async deleteInventoryItem(itemId) {
    const item = await InventoryRepository.findById(itemId);
    if (!item) {
      throw new AppError('Inventory item not found.', 404);
    }

    return InventoryRepository.delete(itemId);
  }

  async getLowStock(branchId) {
    return InventoryRepository.findLowStockByBranch(branchId);
  }
}

export default new InventoryService();
