import BaseRepository from '../../repositories/BaseRepository.js';
import MenuItem from '../../models/MenuItem.js';

class MenuItemRepository extends BaseRepository {
  constructor() {
    super(MenuItem);
  }

  async findByRestaurantId(restaurantId) {
    return this.find({ restaurantId }, 'categoryId', '', { name: 1 });
  }

  async findByCategory(categoryId) {
    return this.find({ categoryId, isAvailable: true }, '', '', { name: 1 });
  }
}

export default new MenuItemRepository();
