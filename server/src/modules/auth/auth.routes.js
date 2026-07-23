import express from 'express';
import {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  verifyOTP,
  resetPassword,
  getMe,
  updateProfile,
  getBranches
} from './auth.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register-restaurant', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.get('/branches', protect, getBranches);

export default router;
