const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * Must be the last middleware in the stack
 */
const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let status = 500;
  let response = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Handle specific error types
  if (error.code === 'TDX_SERVICE_ERROR') {
    status = error.status || 502;
    response.error = 'TDX Service Error';
    response.message = 'Failed to communicate with TeamDynamix';
    
    // Include more details in development
    if (process.env.NODE_ENV === 'development') {
      response.details = error.message;
      response.originalError = error.originalError?.message;
    }
  } else if (error.name === 'ValidationError') {
    status = 400;
    response.error = 'Validation Error';
    response.message = error.message;
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    status = 502;
    response.error = 'Service Unavailable';
    response.message = 'Unable to connect to external service';
  } else if (error.code === 'ETIMEDOUT') {
    status = 504;
    response.error = 'Gateway Timeout';
    response.message = 'Request to external service timed out';
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    status = 400;
    response.error = 'Bad Request';
    response.message = 'Invalid JSON in request body';
  }

  // Include error details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = error.message;
  }

  // Log additional context for certain errors
  if (status >= 500) {
    logger.error('Server error occurred', {
      errorCode: error.code,
      errorName: error.name,
      status,
      requestBody: req.body,
      requestQuery: req.query,
      requestParams: req.params
    });
  }

  res.status(status).json(response);
};

module.exports = errorHandler;