const express = require('express');
const { query, validationResult } = require('express-validator');
const TDXService = require('../services/tdxService');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

const router = express.Router();
const tdxService = new TDXService();

// Validation rules
const searchValidation = [
  query('query')
    .isLength({ min: 1, max: 500 })
    .withMessage('Query must be between 1 and 500 characters')
    .trim()
    .escape(),
  query('category')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters')
    .trim()
    .escape(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt()
];

/**
 * @route GET /api/v1/search
 * @desc Search knowledge base articles
 * @access Private (requires API key)
 * @param {string} query - Search query (required)
 * @param {string} category - Category filter (optional)
 * @param {number} limit - Number of results (optional, max 50)
 * @param {number} offset - Pagination offset (optional)
 */
router.get('/', searchValidation, async (req, res, next) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { query: searchQuery, category, limit = 10, offset = 0 } = req.query;

    // Create cache key
    const cacheKey = `search:${searchQuery}:${category || 'all'}:${limit}:${offset}`;
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info('Search cache hit', { query: searchQuery, cacheKey });
      return res.json({
        ...cachedResult,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Searching TDX knowledge base', {
      query: searchQuery,
      category,
      limit,
      offset
    });

    // Search articles
    const searchParams = {
      query: searchQuery,
      category,
      limit,
      offset
    };

    const results = await tdxService.searchArticles(searchParams);

    // Cache the results
    cache.set(cacheKey, results);

    logger.info('Search completed successfully', {
      query: searchQuery,
      resultCount: results.articles?.length || 0,
      totalResults: results.totalCount || 0
    });

    res.json({
      ...results,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Search error', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    next(error);
  }
});

module.exports = router;