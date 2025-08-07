const axios = require('axios');
const logger = require('../utils/logger');

class TDXService {
  constructor() {
    this.baseURL = process.env.TDX_BASE_URL;
    this.username = process.env.TDX_USERNAME;
    this.password = process.env.TDX_PASSWORD;
    this.staticToken = process.env.TDX_TOKEN;
    this.appId = process.env.TDX_KB_APP_ID;
    this.timeout = parseInt(process.env.TDX_TIMEOUT) || 30000;
    
    this.bearerToken = null;
    this.tokenExpiry = null;
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TDX-Genesys-Integration/1.0.0'
      }
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get authentication token (OAuth or static)
   */
  async getAuthToken() {
    try {
      // If static token is provided, use it
      if (this.staticToken) {
        return this.staticToken;
      }

      // Check if current token is still valid
      if (this.bearerToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.bearerToken;
      }

      // Get new OAuth token
      if (this.username && this.password) {
        await this.authenticateOAuth();
        return this.bearerToken;
      }

      throw new Error('No authentication method configured');
    } catch (error) {
      logger.error('Authentication failed', {
        error: error.message,
        hasUsername: !!this.username,
        hasPassword: !!this.password,
        hasStaticToken: !!this.staticToken
      });
      throw new Error('Authentication failed: ' + error.message);
    }
  }

  /**
   * Authenticate using OAuth
   */
  async authenticateOAuth() {
    try {
      const authPayload = {
        username: this.username,
        password: this.password
      };

      const response = await axios.post(
        `${this.baseURL}/api/auth/login`,
        authPayload,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.bearerToken = response.data.token;
      // Set token expiry to 50 minutes (TDX tokens typically expire in 1 hour)
      this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);

      logger.info('OAuth authentication successful', {
        tokenExpiry: this.tokenExpiry.toISOString()
      });

    } catch (error) {
      logger.error('OAuth authentication failed', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  /**
   * Test connection to TDX API
   */
  async testConnection() {
    try {
      const response = await this.axiosInstance.get('/api/people/lookup');
      
      return {
        status: 'Connected',
        responseTime: response.headers['x-response-time'] || 'N/A',
        apiVersion: response.headers['api-version'] || 'N/A'
      };
    } catch (error) {
      logger.error('TDX connection test failed', {
        error: error.message,
        status: error.response?.status
      });
      throw new Error('TDX connection failed: ' + error.message);
    }
  }

  /**
   * Search knowledge base articles
   */
  async searchArticles(params) {
    try {
      const { query, category, limit = 10, offset = 0 } = params;

      const searchPayload = {
        searchText: query,
        maxResults: limit,
        startIndex: offset
      };

      // Add category filter if provided
      if (category) {
        searchPayload.categoryId = category;
      }

      // Add knowledge base app ID if configured
      if (this.appId) {
        searchPayload.appId = this.appId;
      }

      logger.info('Searching TDX knowledge base', {
        query,
        category,
        limit,
        offset
      });

      const response = await this.axiosInstance.post(
        '/api/knowledgebase/search',
        searchPayload
      );

      const articles = response.data.map(article => this.formatArticle(article));

      return {
        articles,
        totalCount: response.headers['x-total-count'] ? 
          parseInt(response.headers['x-total-count']) : articles.length,
        query,
        limit,
        offset
      };

    } catch (error) {
      logger.error('Article search failed', {
        error: error.message,
        params
      });
      throw this.createServiceError('Search failed', error);
    }
  }

  /**
   * Get a specific article by ID
   */
  async getArticle(articleId) {
    try {
      logger.info('Fetching TDX article', { articleId });

      const response = await this.axiosInstance.get(
        `/api/knowledgebase/articles/${articleId}`
      );

      return this.formatArticle(response.data);

    } catch (error) {
      if (error.response?.status === 404) {
        logger.warn('Article not found', { articleId });
        return null;
      }

      logger.error('Article fetch failed', {
        error: error.message,
        articleId
      });
      throw this.createServiceError('Article fetch failed', error);
    }
  }

  /**
   * Format article data for consistent response
   */
  formatArticle(article) {
    return {
      id: article.ID,
      title: article.Name || article.Title,
      summary: article.Summary || '',
      content: article.Body || article.Content || '',
      category: article.CategoryName || '',
      categoryId: article.CategoryID,
      tags: article.Tags || [],
      createdDate: article.CreatedDate,
      modifiedDate: article.ModifiedDate,
      isPublic: article.IsPublic,
      isPinned: article.IsPinned,
      author: {
        name: article.CreatedByName || article.AuthorName,
        email: article.CreatedByEmail || article.AuthorEmail
      },
      url: article.URI || `${this.baseURL}/kb/article/${article.ID}`,
      rating: article.Rating || null,
      viewCount: article.ViewCount || 0
    };
  }

  /**
   * Handle API errors
   */
  handleApiError(error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      if (status === 401) {
        // Clear cached token on auth failure
        this.bearerToken = null;
        this.tokenExpiry = null;
        logger.warn('Authentication token expired or invalid');
      }
      
      logger.error('TDX API error', {
        status,
        message,
        url: error.config?.url
      });
    } else if (error.request) {
      // Network error
      logger.error('TDX API network error', {
        message: error.message,
        url: error.config?.url
      });
    } else {
      // Other error
      logger.error('TDX API request error', {
        message: error.message
      });
    }
  }

  /**
   * Create standardized service error
   */
  createServiceError(message, originalError) {
    const error = new Error(message);
    error.code = 'TDX_SERVICE_ERROR';
    error.originalError = originalError;
    
    if (originalError.response) {
      error.status = originalError.response.status;
      error.statusText = originalError.response.statusText;
    }
    
    return error;
  }
}

module.exports = TDXService;