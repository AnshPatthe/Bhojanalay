import BaseRepository from '../../repositories/BaseRepository.js';
import Subscription from '../../models/Subscription.js';

class SubscriptionRepository extends BaseRepository {
  constructor() {
    super(Subscription);
  }

  async findByRestaurantId(restaurantId) {
    return this.findOne({ restaurantId });
  }
}

export default new SubscriptionRepository();
