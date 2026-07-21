import RestaurantRepository from '../restaurant/restaurant.repository.js';
import BranchRepository from '../branches/branch.repository.js';
import EmployeeRepository from '../staff/employee.repository.js';
import RoleRepository from '../auth/role.repository.js';
import SubscriptionRepository from '../auth/subscription.repository.js';
import AppError from '../../utils/AppError.js';

class OnboardingService {
  async onboardRestaurant(ownerId, restaurantData, branchData) {
    // 1. Create Restaurant
    const restaurant = await RestaurantRepository.create({
      name: restaurantData.name,
      type: restaurantData.type,
      currency: restaurantData.currency || 'USD',
      timezone: restaurantData.timezone || 'UTC',
      logo: restaurantData.logo || '',
      ownerId
    });

    // 2. Create Default Roles for this Restaurant
    const roles = await RoleRepository.createDefaultRoles(restaurant._id);
    const ownerRole = roles.find(r => r.name === 'Owner');

    if (!ownerRole) {
      throw new AppError('Failed to create default roles during onboarding.', 500);
    }

    // 3. Create the First Branch
    const branch = await BranchRepository.create({
      restaurantId: restaurant._id,
      name: branchData.name || `${restaurantData.name} - Head Office`,
      country: branchData.country,
      state: branchData.state,
      city: branchData.city,
      address: branchData.address,
      phone: branchData.phone,
      email: branchData.email || ''
    });

    // 4. Register the Owner user as an Employee in the restaurant, linked to the Branch and Owner Role
    const employee = await EmployeeRepository.create({
      userId: ownerId,
      restaurantId: restaurant._id,
      branchId: branch._id,
      roleId: ownerRole._id,
      status: 'active'
    });

    // 5. Initialize standard Subscription
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 14); // 14-day trial

    const subscription = await SubscriptionRepository.create({
      restaurantId: restaurant._id,
      planName: 'pro',
      status: 'trialing',
      price: 29.00,
      billingCycle: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd
    });

    return {
      restaurant,
      branch,
      employee,
      subscription
    };
  }
}

export default new OnboardingService();
