/**
 * Error Handling Middleware
 * Centralized error handling for the application
 * Formats errors for API responses and logs them appropriately
 */

const mongoose = require('mongoose');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Handle Mongoose validation errors
 * @param {Error} err - Mongoose error
 * @returns {AppError}
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(e => ({
    field: e.path,
    message: e.message,
    value: e.value,
  }));
  
  return new ValidationError('Validation failed', errors);
};

/**
 * Handle Mongoose duplicate key errors
 * @param {Error} err - Mongoose error
 * @returns {AppError}
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  
  return new ConflictError(
    `A record with ${field} '${value}' already exists`
  );
};

/**
 * Handle Mongoose cast errors (invalid ObjectId)
 * @param {Error} err - Mongoose error
 * @returns {AppError}
 */
const handleCastError = (err) => {
  return new ValidationError(
    `Invalid ${err.path}: ${err.value}. Expected a valid ID.`
  );
};

/**
 * Handle JWT errors
 * @param {Error} err - JWT error
 * @returns {AppError}
 */
const handleJWTError = () => {
  return new AuthenticationError('Invalid token. Please log in again.');
};

/**
 * Handle JWT expiration errors
 * @param {Error} err - JWT error
 * @returns {AppError}
 */
const handleJWTExpiredError = () => {
  return new AuthenticationError('Token expired. Please log in again.');
};

/**
 * Handle Multer errors (file upload)
 * @param {Error} err - Multer error
 * @returns {AppError}
 */
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File too large. Maximum size is 10MB.');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new ValidationError('Too many files. Maximum is 5 files.');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError(`Unexpected field: ${err.field}`);
  }
  return new ValidationError(err.message);
};

/**
 * Format error for development environment
 * @param {Error} err - Error object
 * @returns {Object}
 */
const formatDevError = (err) => {
  return {
    success: false,
    error: {
      message: err.message,
      code: err.code || 'INTERNAL_ERROR',
      status: err.status,
      statusCode: err.statusCode,
      stack: err.stack,
      ...(err.errors && { errors: err.errors }),
    },
  };
};

/**
 * Format error for production environment
 * @param {Error} err - Error object
 * @returns {Object}
 */
const formatProdError = (err) => {
  // Operational errors - send details to client
  if (err.isOperational) {
    return {
      success: false,
      error: {
        message: err.message,
        code: err.code || 'INTERNAL_ERROR',
        ...(err.errors && { errors: err.errors }),
      },
    };
  }
  
  // Programming or unknown errors - don't leak details
  console.error('ERROR:', err);
  return {
    success: false,
    error: {
      message: 'Something went wrong',
      code: 'INTERNAL_ERROR',
    },
  };
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Transform specific error types
  let error = { ...err, message: err.message };
  
  if (err instanceof mongoose.Error.ValidationError) {
    error = handleValidationError(err);
  } else if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  } else if (err instanceof mongoose.Error.CastError) {
    error = handleCastError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (err.name === 'MulterError') {
    error = handleMulterError(err);
  }
  
  // Format response based on environment
  const isDev = process.env.NODE_ENV === 'development';
  const response = isDev ? formatDevError(error) : formatProdError(error);
  
  // Log error for monitoring (in production, use proper logging service)
  if (!isDev && error.statusCode >= 500) {
    console.error({
      timestamp: new Date().toISOString(),
      error: error.message,
      code: error.code,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      userId: req.userId,
      ip: req.ip,
    });
  }
  
  res.status(error.statusCode || 500).json(response);
};

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors automatically
 * @param {Function} fn - Async function
 * @returns {Function}
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request validation middleware factory
 * @param {Function} validator - Validation function
 * @returns {Function}
 */
const validateRequest = (validator) => {
  return async (req, res, next) => {
    try {
      const validated = await validator(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      if (error.name === 'ValidationError' || error.errors) {
        const validationError = new ValidationError(
          'Validation failed',
          error.errors || [{ message: error.message }]
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};

/**
 * Global unhandled rejection handler
 */
const setupUnhandledRejectionHandler = () => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    
    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Global uncaught exception handler
 */
const setupUncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    
    // Immediate shutdown
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateRequest,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};
