import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import UserRepository from './user.repository.js';
import BranchRepository from '../branches/branch.repository.js';
import EmployeeRepository from '../staff/employee.repository.js';
import AppError from '../../utils/AppError.js';
import { sendEmail } from '../../utils/email.js';

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

    // Limit resend to every 60 seconds
    if (user.otpSentAt && (Date.now() - new Date(user.otpSentAt).getTime()) < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (Date.now() - new Date(user.otpSentAt).getTime())) / 1000);
      throw new AppError(`Please wait ${waitSeconds} seconds before requesting a new OTP.`, 400);
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otpCode = otp;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    user.otpSentAt = new Date();
    await user.save();

    // Professional HTML Email Template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #6366f1; margin: 0;">Vyavastha Restaurant OS</h2>
        </div>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin-bottom: 20px;" />
        <p style="font-size: 16px; color: #333;">Hello ${user.name},</p>
        <p style="font-size: 16px; color: #333;">We received a request to reset your password. Use the following One-Time Password (OTP) to proceed. This OTP is valid for <strong>5 minutes</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e1b4b; background-color: #f3f4f6; padding: 10px 20px; border-radius: 6px; border: 1px dashed #6366f1;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #666;">If you did not make this request, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin-top: 20px; margin-bottom: 20px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated message from Vyavastha ROS. Please do not reply directly to this email.</p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Vyavastha ROS - Password Reset OTP',
      message: `Your OTP for password reset is: ${otp}. It is valid for 5 minutes.`,
      html: emailHtml
    });

    return otp; // Return OTP for easy local testing
  }

  async verifyOTP(email, otp) {
    if (!email || !otp) {
      throw new AppError('Email and OTP code are required.', 400);
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // Check if OTP has expired
    if (!user.otpExpires || new Date(user.otpExpires).getTime() < Date.now()) {
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    // Check if attempts exceeded
    if (user.otpAttempts >= 5) {
      throw new AppError('Maximum OTP verification attempts exceeded. Please request a new OTP.', 400);
    }

    // Increment attempts
    user.otpAttempts += 1;
    await user.save();

    // Verify OTP
    if (user.otpCode !== otp) {
      const remaining = 5 - user.otpAttempts;
      throw new AppError(`Incorrect OTP. ${remaining} attempts remaining.`, 400);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    
    // Clear OTP fields
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.otpSentAt = undefined;
    await user.save();

    return resetToken;
  }

  async resetPassword(token, password) {
    // Strong password validation
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      throw new AppError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.', 400);
    }

    const user = await UserRepository.findByResetToken(token);
    if (!user) {
      throw new AppError('Reset token is invalid or has expired.', 400);
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
