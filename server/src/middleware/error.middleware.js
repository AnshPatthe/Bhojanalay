import logger from '../config/logger.js';
import AppError from '../utils/AppError.js';

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    if (err.statusCode >= 500) {
      logger.error(`Server Error: ${err.message}`, err);
    } else {
      logger.warn(`Client/Operational Error (${err.statusCode}): ${err.message}`);
    }
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production Mode
    let error = { ...err };
    error.message = err.message;

    // Handle mongoose CastError
    if (err.name === 'CastError') {
      const message = `Invalid ${err.path}: ${err.value}`;
      error = new AppError(message, 400);
    }
    // Handle duplicate key
    if (err.code === 11000) {
      const match = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/) : null;
      const value = match ? match[0] : '';
      const message = `Duplicate field value: ${value}. Please use another value!`;
      error = new AppError(message, 400);
    }
    // Handle validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      const message = `Invalid input data. ${errors.join('. ')}`;
      error = new AppError(message, 400);
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
      error = new AppError('Invalid token. Please log in again!', 401);
    }
    if (err.name === 'TokenExpiredError') {
      error = new AppError('Your token has expired! Please log in again.', 401);
    }

    res.status(error.statusCode || 500).json({
      status: error.status || 'error',
      message: error.message || 'Something went wrong!'
    });
  }
};

export default errorHandler;
