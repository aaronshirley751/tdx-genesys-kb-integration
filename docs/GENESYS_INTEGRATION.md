# Genesys Cloud Integration Guide

This guide explains how to integrate the TDX Knowledge Base API with Genesys Cloud using Web Services Data Actions.

## Overview

The integration allows Genesys Cloud to:
1. Search TeamDynamix knowledge base articles in real-time
2. Retrieve specific articles for display to agents or customers
3. Cache results for improved performance
4. Handle authentication and rate limiting automatically

## Prerequisites

1. **TeamDynamix Access**
   - TDX instance URL
   - API credentials (username/password or static token)
   - Knowledge Base App ID (optional but recommended)

2. **Genesys Cloud Requirements**
   - Admin access to Architect
   - Ability to create Web Services Data Actions
   - Network connectivity to your API server

3. **Infrastructure**
   - Server to host the integration API
   - SSL certificate (recommended)
   - Network access from Genesys Cloud

## Step 1: Deploy the Integration API

### Option A: Docker Deployment
```bash
# Build the image
docker build -t tdx-genesys-integration .

# Run with environment variables
docker run -d \
  --name tdx-api \
  -p 3000:3000 \
  -e TDX_BASE_URL=https://your-tdx.teamdynamix.com \
  -e TDX_USERNAME=your-api-user \
  -e TDX_PASSWORD=your-api-password \
  -e API_KEY=your-secure-api-key \
  tdx-genesys-integration
```

### Option B: Node.js Deployment
```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Start the server
npm start
```

## Step 2: Test the API

Verify the API is working correctly:

```bash
# Health check
curl http://your-server:3000/health

# Test search (requires API key)
curl -H "X-API-Key: your-api-key" \
  "http://your-server:3000/api/v1/search?query=password&limit=5"

# Test article retrieval
curl -H "X-API-Key: your-api-key" \
  "http://your-server:3000/api/v1/articles/123"
```

## Step 3: Configure Genesys Cloud Data Actions

### Create Search Data Action

1. **Navigate to Admin > Architect > Data Actions**
2. **Click "Add"** and select "Web Services Data Action"
3. **Configure Basic Settings:**
   - Name: `TDX Knowledge Search`
   - Category: `Custom`
   - Description: `Search TeamDynamix knowledge base`

4. **Setup Request:**
   - URL: `https://your-server.com/api/v1/search`
   - Method: `GET`
   - Headers:
     ```
     X-API-Key: your-secure-api-key
     Content-Type: application/json
     ```
   - Request URL Parameters:
     ```
     query: ${input.searchQuery}
     limit: ${input.maxResults}
     category: ${input.category}
     ```

5. **Configure Inputs:**
   - `searchQuery` (String, Required): Search terms
   - `maxResults` (Integer, Optional, Default: 10): Number of results
   - `category` (String, Optional): Category filter

6. **Configure Outputs:**
   - `articles` (Collection): Array of articles
   - `totalCount` (Integer): Total number of results
   - `success` (Boolean): Operation success status

7. **Test the Data Action** with sample data

### Create Article Retrieval Data Action

1. **Create another Data Action:**
   - Name: `TDX Get Article`
   - URL: `https://your-server.com/api/v1/articles/{articleId}`
   - Method: `GET`

2. **Configure Inputs:**
   - `articleId` (Integer, Required): Article ID to retrieve

3. **Configure Outputs:**
   - `article` (Object): Complete article data
   - `title` (String): Article title
   - `content` (String): Article content
   - `category` (String): Article category
   - `url` (String): Direct link to article

## Step 4: Use in Architect Flows

### Search Flow Example
```
1. Collect Input (search terms from customer)
2. Call Data Action: TDX Knowledge Search
   - Input: searchQuery = ${Flow.searchTerms}
   - Input: maxResults = 5
3. Decision: Check if articles found
   - If Task.success == true AND Task.totalCount > 0:
     - Loop through Task.articles
     - Present options to customer
   - Else:
     - Play "No articles found" message
```

### Article Display Flow Example
```
1. Call Data Action: TDX Get Article
   - Input: articleId = ${Flow.selectedArticleId}
2. Decision: Check if article retrieved
   - If Task.success == true:
     - Play TTS: ${Task.article.title}
     - Play TTS: ${Task.article.summary}
     - Offer to transfer to agent or get full article
   - Else:
     - Play "Article not available" message
```

## Step 5: Advanced Configuration

### Custom Authentication
If you need custom authentication:
1. Modify `src/middleware/auth.js`
2. Implement your authentication logic
3. Update environment variables

### Custom Article Formatting
To modify how articles are formatted:
1. Edit `formatArticle()` method in `src/services/tdxService.js`
2. Adjust fields returned to Genesys
3. Update Data Action output configuration

### Rate Limiting
Adjust rate limits in environment variables:
```env
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX=100    # requests per window
```

### Caching Configuration
Optimize caching for your needs:
```env
CACHE_TTL=300         # seconds (5 minutes default)
CACHE_MAX_SIZE=1000   # maximum cached items
```

## Security Considerations

1. **Use HTTPS** for all communications
2. **Secure API Keys** - use strong, unique keys
3. **Network Security** - restrict access to your API server
4. **Logging** - monitor access logs for suspicious activity
5. **Regular Updates** - keep dependencies updated

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check TDX credentials in .env file
   - Verify API key configuration
   - Check authentication logs

2. **No Search Results**
   - Verify search query format
   - Check TDX knowledge base permissions
   - Review category filters

3. **Network Timeouts**
   - Increase timeout values
   - Check network connectivity
   - Monitor TDX API performance

4. **Rate Limiting**
   - Adjust rate limits if needed
   - Implement request queuing
   - Monitor usage patterns

### Debug Mode
Enable detailed logging:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

### Health Monitoring
Set up monitoring for:
- `/health` endpoint
- Application logs
- Performance metrics
- Error rates

## Support

For issues with:
- **TDX API**: Contact TeamDynamix support
- **Genesys Cloud**: Contact Genesys support  
- **Integration Code**: Check GitHub issues or create new issue