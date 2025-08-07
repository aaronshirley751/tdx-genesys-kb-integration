const NodeCache = require('node-cache');

// Create cache instance
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL) || 300, // Default 5 minutes
  maxKeys: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Don't clone objects for better performance
});

// Add event listeners for debugging
cache.on('set', (key, value) => {
  console.debug(`Cache SET: ${key}`);
});

cache.on('del', (key, value) => {
  console.debug(`Cache DEL: ${key}`);
});

cache.on('expired', (key, value) => {
  console.debug(`Cache EXPIRED: ${key}`);
});

// Enhanced cache methods
const enhancedCache = {
  /**
   * Get value from cache
   */
  get: (key) => {
    return cache.get(key);
  },

  /**
   * Set value in cache with optional TTL
   */
  set: (key, value, ttl = null) => {
    if (ttl) {
      return cache.set(key, value, ttl);
    }
    return cache.set(key, value);
  },

  /**
   * Delete value from cache
   */
  del: (key) => {
    return cache.del(key);
  },

  /**
   * Check if key exists in cache
   */
  has: (key) => {
    return cache.has(key);
  },

  /**
   * Get multiple values from cache
   */
  mget: (keys) => {
    return cache.mget(keys);
  },

  /**
   * Set multiple values in cache
   */
  mset: (keyValuePairs) => {
    return cache.mset(keyValuePairs);
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    return cache.getStats();
  },

  /**
   * Flush all cache entries
   */
  flushAll: () => {
    return cache.flushAll();
  },

  /**
   * Get all cache keys
   */
  keys: () => {
    return cache.keys();
  },

  /**
   * Get or set pattern - get value if exists, otherwise compute and cache
   */
  getOrSet: async (key, computeFn, ttl = null) => {
    let value = cache.get(key);
    
    if (value === undefined) {
      value = await computeFn();
      if (value !== undefined) {
        enhancedCache.set(key, value, ttl);
      }
    }
    
    return value;
  },

  /**
   * Cache with tags for group invalidation
   */
  setWithTags: (key, value, tags = [], ttl = null) => {
    // Store the main value
    const success = enhancedCache.set(key, value, ttl);
    
    // Store tag mappings
    tags.forEach(tag => {
      const tagKey = `tag:${tag}`;
      let taggedKeys = cache.get(tagKey) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        cache.set(tagKey, taggedKeys);
      }
    });
    
    return success;
  },

  /**
   * Invalidate all keys with specific tag
   */
  invalidateTag: (tag) => {
    const tagKey = `tag:${tag}`;
    const taggedKeys = cache.get(tagKey) || [];
    
    // Delete all keys with this tag
    taggedKeys.forEach(key => {
      cache.del(key);
    });
    
    // Delete the tag mapping
    cache.del(tagKey);
    
    return taggedKeys.length;
  },

  /**
   * Cache warming - preload cache with data
   */
  warm: async (warmingData) => {
    const promises = warmingData.map(async ({ key, computeFn, ttl }) => {
      try {
        const value = await computeFn();
        enhancedCache.set(key, value, ttl);
        return { key, success: true };
      } catch (error) {
        console.error(`Cache warming failed for key ${key}:`, error);
        return { key, success: false, error: error.message };
      }
    });
    
    return Promise.all(promises);
  },

  /**
   * Smart cache for search results with different cache times
   */
  setSearchResult: (query, results, popularQuery = false) => {
    const key = `search:${query}`;
    const ttl = popularQuery ? 600 : 300; // Popular queries cached longer
    
    return enhancedCache.setWithTags(key, results, ['search'], ttl);
  },

  /**
   * Smart cache for articles with longer TTL
   */
  setArticle: (articleId, article) => {
    const key = `article:${articleId}`;
    const ttl = 1800; // 30 minutes for articles
    
    return enhancedCache.setWithTags(key, article, ['article'], ttl);
  },

  /**
   * Invalidate all search results
   */
  invalidateSearches: () => {
    return enhancedCache.invalidateTag('search');
  },

  /**
   * Invalidate all articles
   */
  invalidateArticles: () => {
    return enhancedCache.invalidateTag('article');
  }
};

module.exports = enhancedCache;