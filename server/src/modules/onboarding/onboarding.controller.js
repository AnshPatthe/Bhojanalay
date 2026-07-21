import OnboardingService from './onboarding.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';

export const onboard = catchAsync(async (req, res, next) => {
  const { restaurant, branch } = req.body;

  if (!restaurant || !branch) {
    return next(new AppError('Please provide both restaurant and branch details to onboard.', 400));
  }

  const result = await OnboardingService.onboardRestaurant(
    req.user._id,
    restaurant,
    branch
  );

  res.status(201).json({
    status: 'success',
    data: result
  });
});
