import BaseRepository from '../../repositories/BaseRepository.js';
import Inventory from '../../models/Inventory.js';

class InventoryRepository extends BaseRepository {
  constructor() {
    super(Inventory);
  }

  async findByBranch(branchId) {
    return this.find({ branchId }, '', '', { itemName: 1 });
  }

  async findLowStockByBranch(branchId) {
    return this.model.find({
      branchId,
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    }).exec();
  }
}

export default new InventoryRepository();
