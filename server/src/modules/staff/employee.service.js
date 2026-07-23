import EmployeeRepository from './employee.repository.js';
import UserRepository from '../auth/user.repository.js';
import RoleRepository from '../auth/role.repository.js';
import BranchRepository from '../branches/branch.repository.js';
import Waiter from '../../models/Waiter.js';
import AppError from '../../utils/AppError.js';

class EmployeeService {
  async getEmployees(restaurantId) {
    // Find all employee records for the restaurant and populate user/role/branch info
    return EmployeeRepository.find(
      { restaurantId },
      'userId roleId branchId',
      '',
      { createdAt: -1 }
    );
  }

  async addEmployee(restaurantId, data) {
    const { name, email, roleName, branchId, hourlyRate, password } = data;

    // 1. Verify branch exists
    const branch = await BranchRepository.findById(branchId);
    if (!branch || branch.restaurantId.toString() !== restaurantId.toString()) {
      throw new AppError('Invalid branch selection.', 400);
    }

    // 2. Find the requested Role
    const role = await RoleRepository.findOne({ restaurantId, name: roleName });
    if (!role) {
      throw new AppError(`Role '${roleName}' does not exist for this restaurant.`, 400);
    }

    // 3. Create or find User
    let user = await UserRepository.findByEmail(email);
    if (!user) {
      user = await UserRepository.create({
        name,
        email,
        password: 'TemporaryPassword123!', // Standard temp password
        isEmailVerified: true
      });
    }

    // 4. Check if they are already an employee in this restaurant branch
    const existingEmployee = await EmployeeRepository.findOne({
      userId: user._id,
      restaurantId
    });

    if (existingEmployee) {
      throw new AppError('User is already registered as an employee in this restaurant.', 400);
    }

    // 5. Create Employee
    const employee = await EmployeeRepository.create({
      userId: user._id,
      restaurantId,
      branchId,
      roleId: role._id,
      hourlyRate: hourlyRate || 0,
      status: 'active'
    });

    // 6. If Waiter, create dedicated Waiter account
    if (roleName === 'Waiter') {
      if (!password) {
        throw new AppError('Password is required for Waiter accounts.', 400);
      }
      const existingWaiter = await Waiter.findOne({ email });
      if (!existingWaiter) {
        await Waiter.create({
          restaurantId,
          branchId,
          name,
          email,
          password
        });
      }
    }

    return EmployeeRepository.findDetailedEmployee(user._id, restaurantId);
  }

  async updateEmployee(employeeId, data) {
    const { name, email, status, roleName, branchId, hourlyRate, password } = data;

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found.', 404);
    }

    const user = await UserRepository.findById(employee.userId);
    if (!user) {
      throw new AppError('Associated user not found.', 404);
    }
    const oldEmail = user.email;

    // 1. Update User Details (name, email)
    if (name || email) {
      const userUpdates = {};
      if (name) userUpdates.name = name;
      if (email) {
        // Check if email already in use by another user
        const existingUser = await UserRepository.findByEmail(email);
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
          throw new AppError('Email is already in use.', 400);
        }
        userUpdates.email = email;
      }
      await UserRepository.update(user._id, userUpdates);
    }

    // 2. Update Employee Details
    const updates = {};
    if (status) updates.status = status;
    if (hourlyRate !== undefined) updates.hourlyRate = hourlyRate;

    // Resolve Role if provided
    let finalRoleName = roleName;
    if (roleName) {
      const role = await RoleRepository.findOne({ restaurantId: employee.restaurantId, name: roleName });
      if (!role) throw new AppError('Requested role does not exist.', 400);
      updates.roleId = role._id;
    } else {
      // Find current role name to check if waiter updates are needed
      const currentRole = await RoleRepository.findById(employee.roleId);
      if (currentRole) {
        finalRoleName = currentRole.name;
      }
    }

    if (branchId) {
      const branch = await BranchRepository.findById(branchId);
      if (!branch) throw new AppError('Requested branch does not exist.', 400);
      updates.branchId = branch._id;
    }

    // 3. Update Waiter Account if role is Waiter or changes to/from Waiter
    const finalUser = await UserRepository.findById(employee.userId);
    const finalEmail = email || finalUser?.email;
    const finalName = name || finalUser?.name;

    if (finalRoleName === 'Waiter') {
      const existingWaiter = await Waiter.findOne({ email: oldEmail });
      if (existingWaiter) {
        existingWaiter.name = finalName;
        existingWaiter.email = finalEmail;
        if (status) existingWaiter.status = status;
        if (branchId) existingWaiter.branchId = branchId;
        if (password) {
          existingWaiter.password = password; // Trigger save/hash hook
        }
        await existingWaiter.save();
      } else {
        // Create waiter if it didn't exist
        await Waiter.create({
          restaurantId: employee.restaurantId,
          branchId: branchId || employee.branchId,
          name: finalName,
          email: finalEmail,
          password: password || 'TemporaryPassword123!',
          status: status || 'active'
        });
      }
    } else {
      // If role was changed from Waiter to something else, remove the Waiter account
      await Waiter.findOneAndDelete({ email: oldEmail });
    }

    await EmployeeRepository.update(employeeId, updates);
    return EmployeeRepository.findDetailedEmployee(employee.userId, employee.restaurantId);
  }

  async deleteEmployee(employeeId) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found.', 404);
    }

    // 1. Delete associated Waiter record if it exists
    const user = await UserRepository.findById(employee.userId);
    if (user) {
      await Waiter.findOneAndDelete({ email: user.email });
    }

    // 2. Delete Employee record
    await EmployeeRepository.delete(employeeId);

    // 3. Delete User record if they are not associated with any other employee branch
    if (user) {
      const userEmployees = await EmployeeRepository.find({ userId: employee.userId });
      if (userEmployees.length === 0) {
        await UserRepository.delete(employee.userId);
      }
    }
  }

  async getRoles(restaurantId) {
    return RoleRepository.find({ restaurantId });
  }
}

export default new EmployeeService();
