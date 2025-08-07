const express = require('express');
const TDXService = require('../services/tdxService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      api: 'OK',
      tdx: 'CHECKING',
      cache: 'OK'
    }
  };

  try {
    // Test TDX connectivity
    const tdxService = new TDXService();
    await tdxService.testConnection();
    healthCheck.services.tdx = 'OK';
    
    logger.info('Health check passed');
    res.status(200).json(healthCheck);
    
  } catch (error) {
    healthCheck.status = 'ERROR';
    healthCheck.services.tdx = 'ERROR';
    healthCheck.error = error.message;
    
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(503).json(healthCheck);
  }
});

/**
 * @route GET /health/detailed
 * @desc Detailed health check with system information
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  const detailedHealth = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      }
    },
    services: {
      api: 'OK',
      tdx: 'CHECKING',
      cache: 'OK'
    },
    configuration: {
      port: process.env.PORT || 3000,
      rateLimit: {
        window: process.env.RATE_LIMIT_WINDOW || 15,
        max: process.env.RATE_LIMIT_MAX || 100
      },
      cache: {
        ttl: process.env.CACHE_TTL || 300,
        maxSize: process.env.CACHE_MAX_SIZE || 1000
      }
    }
  };

  try {
    // Test TDX connectivity with more details
    const tdxService = new TDXService();
    const connectionTest = await tdxService.testConnection();
    detailedHealth.services.tdx = 'OK';
    detailedHealth.tdxDetails = connectionTest;
    
    logger.info('Detailed health check passed');
    res.status(200).json(detailedHealth);
    
  } catch (error) {
    detailedHealth.status = 'ERROR';
    detailedHealth.services.tdx = 'ERROR';
    detailedHealth.error = {
      message: error.message,
      code: error.code || 'UNKNOWN'
    };
    
    logger.error('Detailed health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(503).json(detailedHealth);
  }
});

module.exports = router;