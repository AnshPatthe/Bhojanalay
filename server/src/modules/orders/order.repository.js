import mongoose from 'mongoose';
import BaseRepository from '../../repositories/BaseRepository.js';
import Order from '../../models/Order.js';

class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  async findActiveByBranch(branchId) {
    return this.find(
      { branchId, status: { $in: ['pending', 'preparing', 'ready', 'billing'] } },
      'customerId employeeId',
      '',
      { createdAt: 1 }
    );
  }

  async findByRestaurant(restaurantId) {
    return this.find({ restaurantId }, '', '', { createdAt: -1 });
  }

  async getDashboardStats(restaurantId, startDate, endDate) {
    return this.model.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);
  }
}

export default new OrderRepository();
