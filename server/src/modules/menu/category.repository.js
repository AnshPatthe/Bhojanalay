import BaseRepository from '../../repositories/BaseRepository.js';
import Category from '../../models/Category.js';

class CategoryRepository extends BaseRepository {
  constructor() {
    super(Category);
  }

  async findByRestaurant(restaurantId) {
    return this.find({ restaurantId }, '', '', { sortOrder: 1, name: 1 });
  }

  async findActiveByRestaurant(restaurantId) {
    return this.find({ restaurantId, isActive: true }, '', '', { sortOrder: 1, name: 1 });
  }
}

export default new CategoryRepository();
