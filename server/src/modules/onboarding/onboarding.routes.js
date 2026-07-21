import express from 'express';
import { onboard } from './onboarding.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, onboard);

export default router;
