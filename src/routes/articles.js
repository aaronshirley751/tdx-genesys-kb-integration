const express = require('express');
const { param, validationResult } = require('express-validator');
const TDXService = require('../services/tdxService');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

const router = express.Router();
const tdxService = new TDXService();

// Validation rules
const articleValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Article ID must be a positive integer')
    .toInt()
];

/**
 * @route GET /api/v1/articles/:id
 * @desc Get a specific knowledge base article
 * @access Private (requires API key)
 * @param {number} id - Article ID (required)
 */
router.get('/:id', articleValidation, async (req, res, next) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const cacheKey = `article:${id}`;

    // Check cache first
    const cachedArticle = cache.get(cacheKey);
    if (cachedArticle) {
      logger.info('Article cache hit', { articleId: id, cacheKey });
      return res.json({
        ...cachedArticle,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Fetching TDX article', { articleId: id });

    // Get article from TDX
    const article = await tdxService.getArticle(id);

    if (!article) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Article with ID ${id} not found`
      });
    }

    // Cache the article
    cache.set(cacheKey, article);

    logger.info('Article retrieved successfully', {
      articleId: id,
      title: article.title
    });

    res.json({
      ...article,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Article retrieval error', {
      error: error.message,
      stack: error.stack,
      articleId: req.params.id
    });
    next(error);
  }
});

/**
 * @route GET /api/v1/articles
 * @desc Get multiple articles by IDs
 * @access Private (requires API key)
 * @param {string} ids - Comma-separated article IDs
 */
router.get('/', async (req, res, next) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ids parameter is required'
      });
    }

    // Parse and validate IDs
    const articleIds = ids.split(',').map(id => {
      const parsed = parseInt(id.trim());
      if (isNaN(parsed) || parsed < 1) {
        throw new Error(`Invalid article ID: ${id}`);
      }
      return parsed;
    });

    if (articleIds.length > 20) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum 20 articles can be requested at once'
      });
    }

    logger.info('Fetching multiple TDX articles', {
      articleIds,
      count: articleIds.length
    });

    // Get articles in parallel
    const articlePromises = articleIds.map(async (id) => {
      const cacheKey = `article:${id}`;
      const cachedArticle = cache.get(cacheKey);
      
      if (cachedArticle) {
        return { ...cachedArticle, cached: true };
      }

      try {
        const article = await tdxService.getArticle(id);
        if (article) {
          cache.set(cacheKey, article);
          return { ...article, cached: false };
        }
        return null;
      } catch (error) {
        logger.warn('Failed to fetch article', { articleId: id, error: error.message });
        return null;
      }
    });

    const articles = await Promise.all(articlePromises);
    const validArticles = articles.filter(article => article !== null);

    logger.info('Multiple articles retrieved', {
      requested: articleIds.length,
      found: validArticles.length
    });

    res.json({
      articles: validArticles,
      requestedCount: articleIds.length,
      foundCount: validArticles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Multiple articles retrieval error', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    next(error);
  }
});

module.exports = router;