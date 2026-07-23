import AuthService from './auth.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';

const sendTokenResponse = (user, accessToken, refreshToken, statusCode, res) => {
  // Set refresh token in HttpOnly cookie
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    user
  });
};

export const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await AuthService.signup(name, email, password);

  // Sign tokens immediately upon register or require email verification?
  // Let's sign tokens and log them in, but return the verificationToken for UI convenience.
  const authData = await AuthService.login(email, password);

  sendTokenResponse(
    authData.user,
    authData.accessToken,
    authData.refreshToken,
    201,
    res
  );
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const authData = await AuthService.login(email, password);

  sendTokenResponse(
    authData.user,
    authData.accessToken,
    authData.refreshToken,
    200,
    res
  );
});

export const refresh = catchAsync(async (req, res) => {
  // Get refresh token from cookie or request body
  const token = req.cookies.refreshToken || req.body.refreshToken;
  const result = await AuthService.refresh(token);

  sendTokenResponse(
    { id: req.user?._id },
    result.accessToken,
    result.refreshToken,
    200,
    res
  );
});

export const logout = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (req.user) {
    await AuthService.logout(req.user._id);
  }

  res.clearCookie('refreshToken');
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

export const verifyEmail = catchAsync(async (req, res) => {
  const result = await AuthService.verifyEmail(req.params.token);
  res.status(200).json({
    status: 'success',
    ...result
  });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const otp = await AuthService.forgotPassword(req.body.email);
  res.status(200).json({
    status: 'success',
    message: 'OTP sent to your email address.',
    otp // Return for ease of development/testing
  });
});

export const verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const resetToken = await AuthService.verifyOTP(email, otp);
  res.status(200).json({
    status: 'success',
    message: 'OTP verified successfully.',
    resetToken
  });
});

export const resetPassword = catchAsync(async (req, res) => {
  const result = await AuthService.resetPassword(req.params.token, req.body.password);
  res.status(200).json({
    status: 'success',
    ...result
  });
});

export const getMe = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      profilePhoto: req.user.profilePhoto || '',
      isEmailVerified: req.user.isEmailVerified,
      status: req.user.status
    },
    employee: req.employee
      ? {
          id: req.employee._id,
          restaurantId: req.employee.restaurantId?._id || req.employee.restaurantId,
          restaurantName: req.employee.restaurantId?.name,
          restaurantCurrency: req.employee.restaurantId?.currency || 'USD',
          role: req.employee.roleId?.name,
          permissions: req.employee.roleId?.permissions,
          branchId: req.employee.branchId?._id || req.employee.branchId,
          branchName: req.employee.branchId?.name || 'Main Branch'
        }
      : null
  });
});

export const updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const result = await AuthService.updateProfile(userId, req.body);

  res.status(200).json({
    status: 'success',
    user: result.user,
    employee: result.employee
  });
});

export const getBranches = catchAsync(async (req, res, next) => {
  const restaurantId = req.employee?.restaurantId?._id || req.employee?.restaurantId;
  if (!restaurantId) {
    return next(new AppError('No restaurant context found.', 400));
  }

  const branches = await AuthService.getBranches(restaurantId);

  res.status(200).json({
    status: 'success',
    data: branches
  });
});
