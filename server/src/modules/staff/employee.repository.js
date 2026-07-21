import BaseRepository from '../../repositories/BaseRepository.js';
import Employee from '../../models/Employee.js';

class EmployeeRepository extends BaseRepository {
  constructor() {
    super(Employee);
  }

  async findByRestaurantId(restaurantId) {
    return this.find({ restaurantId }, 'userId roleId branchId', '', { joinedAt: -1 });
  }

  async findByBranchId(branchId) {
    return this.find({ branchId }, 'userId roleId', '');
  }

  async findByUserIdAndRestaurantId(userId, restaurantId) {
    return this.findOne({ userId, restaurantId }, 'roleId branchId');
  }

  async findDetailedEmployee(userId, restaurantId) {
    return this.model.findOne({ userId, restaurantId })
      .populate('userId', 'name email status')
      .populate('restaurantId', 'name currency')
      .populate('roleId', 'name permissions')
      .populate('branchId', 'name city gstPercentage')
      .exec();
  }
}

export default new EmployeeRepository();
