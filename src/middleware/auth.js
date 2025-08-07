const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Supports API key authentication for Genesys integration
 */
const authMiddleware = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const expectedApiKey = process.env.API_KEY;

    // Skip auth in development if no API key is configured
    if (process.env.NODE_ENV === 'development' && !expectedApiKey) {
      logger.warn('Development mode: API key authentication skipped');
      return next();
    }

    if (!expectedApiKey) {
      logger.error('API key not configured in environment');
      return res.status(500).json({
        error: 'Server Configuration Error',
        message: 'Authentication not properly configured'
      });
    }

    if (!apiKey) {
      logger.warn('Authentication failed: No API key provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required. Provide key in X-API-Key header or Authorization: Bearer {key}'
      });
    }

    if (apiKey !== expectedApiKey) {
      logger.warn('Authentication failed: Invalid API key', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        providedKeyLength: apiKey.length
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    // Authentication successful
    logger.debug('Authentication successful', {
      ip: req.ip,
      path: req.path
    });

    next();

  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication processing failed'
    });
  }
};

module.exports = authMiddleware;