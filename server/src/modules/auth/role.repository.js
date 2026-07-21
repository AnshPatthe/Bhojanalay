import BaseRepository from '../../repositories/BaseRepository.js';
import Role from '../../models/Role.js';

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  async findByNameAndRestaurant(name, restaurantId) {
    return this.findOne({ name, restaurantId });
  }

  async createDefaultRoles(restaurantId) {
    // Create Owner, Manager, Waiter, Cashier, Chef roles
    const roles = [
      {
        restaurantId,
        name: 'Owner',
        description: 'Full administrative control of the restaurant and subscription',
        permissions: ['menu:read', 'menu:write', 'order:read', 'order:write', 'inventory:read', 'inventory:write', 'employees:manage', 'billing:manage'],
        isSystemRole: true
      },
      {
        restaurantId,
        name: 'Manager',
        description: 'Manages branches, menu, and employees, but cannot delete restaurant settings',
        permissions: ['menu:read', 'menu:write', 'order:read', 'order:write', 'inventory:read', 'inventory:write', 'employees:manage'],
        isSystemRole: true
      },
      {
        restaurantId,
        name: 'Chef',
        description: 'Manages menus and kitchen order preparation states',
        permissions: ['menu:read', 'menu:write', 'order:read', 'order:write'],
        isSystemRole: true
      },
      {
        restaurantId,
        name: 'Cashier',
        description: 'Manages checkout, order entries, and payments',
        permissions: ['menu:read', 'order:read', 'order:write'],
        isSystemRole: true
      },
      {
        restaurantId,
        name: 'Waiter',
        description: 'Takes orders and coordinates tables',
        permissions: ['menu:read', 'order:read', 'order:write'],
        isSystemRole: true
      }
    ];

    return this.model.insertMany(roles);
  }
}

export default new RoleRepository();
