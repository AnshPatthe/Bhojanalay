import BaseRepository from '../../repositories/BaseRepository.js';
import Branch from '../../models/Branch.js';

class BranchRepository extends BaseRepository {
  constructor() {
    super(Branch);
  }

  async findByRestaurantId(restaurantId) {
    return this.find({ restaurantId });
  }

  async findActiveByRestaurantId(restaurantId) {
    return this.find({ restaurantId, isActive: true });
  }
}

export default new BranchRepository();
