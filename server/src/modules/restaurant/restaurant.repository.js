import BaseRepository from '../../repositories/BaseRepository.js';
import Restaurant from '../../models/Restaurant.js';

class RestaurantRepository extends BaseRepository {
  constructor() {
    super(Restaurant);
  }

  async findByOwnerId(ownerId) {
    return this.find({ ownerId });
  }
}

export default new RestaurantRepository();
