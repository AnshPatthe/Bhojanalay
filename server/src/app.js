import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

import AppError from './utils/AppError.js';
import errorHandler from './middleware/error.middleware.js';

// Route Imports
import authRoutes from './modules/auth/auth.routes.js';
import onboardingRoutes from './modules/onboarding/onboarding.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import employeeRoutes from './modules/staff/employee.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import tableRoutes from './modules/tables/table.routes.js';
import waiterRoutes from './modules/waiter/waiter.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';

const app = express();

// Global Middlewares
app.use(helmet());

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [
  clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'development' || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting
const limiter = rateLimit({
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // 10000 requests per IP in dev, 100 in production
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes.'
});
app.use('/api', limiter);

// Mount API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/waiter', waiterRoutes);
app.use('/api/v1/billing', billingRoutes);

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Vyavastha OS Engine is healthy',
    timestamp: new Date().toISOString()
  });
});

// Fallback Route
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Mount Central Error Handler
app.use(errorHandler);

export default app;
