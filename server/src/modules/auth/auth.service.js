import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import UserRepository from './user.repository.js';
import BranchRepository from '../branches/branch.repository.js';
import EmployeeRepository from '../staff/employee.repository.js';
import AppError from '../../utils/AppError.js';

class AuthService {
  generateAccessToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });
  }

  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
  }

  async signup(name, email, password) {
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email is already registered. Please login.', 400);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = await UserRepository.create({
      name,
      email,
      password,
      emailVerificationToken: verificationToken
    });

    // In a real-world scenario, we would trigger a background email send here.
    // For now, we return the user and verification token for testing.
    return {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        isEmailVerified: newUser.isEmailVerified
      },
      verificationToken
    };
  }

  async login(email, password) {
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    const user = await UserRepository.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Incorrect email or password', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('This user account has been disabled or suspended.', 403);
    }

    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Save refresh token to user document
    await UserRepository.update(user._id, { refreshToken });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      },
      accessToken,
      refreshToken
    };
  }

  async refresh(token) {
    if (!token) {
      throw new AppError('Refresh token is required', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token. Please login again.', 401);
    }

    const user = await UserRepository.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      throw new AppError('User not found or refresh token mismatch', 401);
    }

    const accessToken = this.generateAccessToken(user._id);
    const newRefreshToken = this.generateRefreshToken(user._id);

    await UserRepository.update(user._id, { refreshToken: newRefreshToken });

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(userId) {
    await UserRepository.update(userId, { refreshToken: null });
  }

  async verifyEmail(token) {
    const user = await UserRepository.findByVerificationToken(token);
    if (!user) {
      throw new AppError('Verification token is invalid or has expired.', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return { message: 'Email verified successfully!' };
  }

  async forgotPassword(email) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new AppError('There is no user with that email address.', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    await UserRepository.update(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    });

    return resetToken;
  }

  async resetPassword(token, password) {
    const user = await UserRepository.findByResetToken(token);
    if (!user) {
      throw new AppError('Token is invalid or has expired.', 400);
    }

    user.password = password; // pre-save hook hashes this
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Invalidate refresh tokens on password change
    user.refreshToken = undefined;
    
    await user.save();

    return { message: 'Password has been reset successfully.' };
  }

  async updateProfile(userId, data) {
    const { name, email, password, profilePhoto, branchId, restaurantId, gstPercentage } = data;

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const updates = {};
    if (name) updates.name = name;
    if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;

    if (email) {
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        throw new AppError('Email is already in use by another account.', 400);
      }
      updates.email = email;
    }

    if (password) {
      user.password = password;
      await user.save();
    }

    const updatedUser = await UserRepository.update(userId, updates);

    let updatedEmployee = null;
    if (branchId && restaurantId) {
      const branch = await BranchRepository.findById(branchId);
      if (!branch || branch.restaurantId.toString() !== restaurantId.toString()) {
        throw new AppError('Invalid branch selection.', 400);
      }

      if (gstPercentage !== undefined) {
        await BranchRepository.update(branchId, { gstPercentage: parseFloat(gstPercentage) });
      }

      const employee = await EmployeeRepository.findOne({ userId, restaurantId });
      if (employee) {
        await EmployeeRepository.update(employee._id, { branchId });
        updatedEmployee = await EmployeeRepository.findDetailedEmployee(userId, restaurantId);
      }
    } else if (restaurantId) {
      updatedEmployee = await EmployeeRepository.findDetailedEmployee(userId, restaurantId);
    }

    return {
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePhoto: updatedUser.profilePhoto || '',
        isEmailVerified: updatedUser.isEmailVerified,
        status: updatedUser.status
      },
      employee: updatedEmployee
    };
  }

  async getBranches(restaurantId) {
    return BranchRepository.findByRestaurantId(restaurantId);
  }
}

export default new AuthService();
