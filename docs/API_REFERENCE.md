# TDX-Genesys Integration API Reference

## Base URL
```
https://your-server.com/api/v1
```

## Authentication
All API endpoints (except `/health`) require authentication via API key.

**Header:**
```
X-API-Key: your-secure-api-key
```

**Alternative:**
```
Authorization: Bearer your-secure-api-key
```

## Endpoints

### Health Check

#### GET /health
Check API server health and connectivity to TDX.

**Parameters:** None

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-07T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "api": "OK",
    "tdx": "OK",
    "cache": "OK"
  }
}
```

**Status Codes:**
- `200` - All systems operational
- `503` - One or more services unavailable

---

### Search Knowledge Base

#### GET /api/v1/search
Search for knowledge base articles.

**Parameters:**
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `query` | string | Yes | Search terms (1-500 chars) | - |
| `category` | string | No | Category filter | - |
| `limit` | integer | No | Max results (1-50) | 10 |
| `offset` | integer | No | Pagination offset | 0 |

**Example Request:**
```bash
GET /api/v1/search?query=password%20reset&limit=5&category=IT
```

**Response:**
```json
{
  "articles": [
    {
      "id": 123,
      "title": "How to Reset Your Password",
      "summary": "Step-by-step guide for password resets",
      "content": "To reset your password...",
      "category": "IT Support",
      "categoryId": 45,
      "tags": ["password", "security", "login"],
      "createdDate": "2024-01-15T09:00:00.000Z",
      "modifiedDate": "2024-01-20T14:30:00.000Z",
      "isPublic": true,
      "isPinned": false,
      "author": {
        "name": "John Doe",
        "email": "john.doe@company.com"
      },
      "url": "https://tdx.company.com/kb/article/123",
      "rating": 4.5,
      "viewCount": 156
    }
  ],
  "totalCount": 1,
  "query": "password reset",
  "limit": 5,
  "offset": 0,
  "cached": false,
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters
- `401` - Authentication required
- `500` - Server error
- `502` - TDX service error

---

### Get Article

#### GET /api/v1/articles/:id
Retrieve a specific knowledge base article.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Article ID |

**Example Request:**
```bash
GET /api/v1/articles/123
```

**Response:**
```json
{
  "id": 123,
  "title": "How to Reset Your Password",
  "summary": "Step-by-step guide for password resets",
  "content": "<h1>Password Reset Guide</h1><p>To reset your password...</p>",
  "category": "IT Support",
  "categoryId": 45,
  "tags": ["password", "security", "login"],
  "createdDate": "2024-01-15T09:00:00.000Z",
  "modifiedDate": "2024-01-20T14:30:00.000Z",
  "isPublic": true,
  "isPinned": false,
  "author": {
    "name": "John Doe",
    "email": "john.doe@company.com"
  },
  "url": "https://tdx.company.com/kb/article/123",
  "rating": 4.5,
  "viewCount": 156,
  "cached": false,
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid article ID
- `401` - Authentication required
- `404` - Article not found
- `500` - Server error
- `502` - TDX service error

---

### Get Multiple Articles

#### GET /api/v1/articles?ids=1,2,3
Retrieve multiple articles by their IDs.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | string | Yes | Comma-separated article IDs (max 20) |

**Example Request:**
```bash
GET /api/v1/articles?ids=123,124,125
```

**Response:**
```json
{
  "articles": [
    {
      "id": 123,
      "title": "How to Reset Your Password",
      "cached": true,
      ...
    },
    {
      "id": 124,
      "title": "Account Lockout Procedures",
      "cached": false,
      ...
    }
  ],
  "requestedCount": 3,
  "foundCount": 2,
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success (even if some articles not found)
- `400` - Invalid parameters or too many IDs
- `401` - Authentication required
- `500` - Server error

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "timestamp": "2025-01-07T10:30:00.000Z",
  "path": "/api/v1/search"
}
```

### Common Error Types

**Validation Error (400)**
```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "query",
      "message": "Query must be between 1 and 500 characters"
    }
  ]
}
```

**Authentication Error (401)**
```json
{
  "error": "Unauthorized",
  "message": "API key required. Provide key in X-API-Key header or Authorization: Bearer {key}"
}
```

**TDX Service Error (502)**
```json
{
  "error": "TDX Service Error",
  "message": "Failed to communicate with TeamDynamix"
}
```

**Rate Limit Error (429)**
```json
{
  "error": "Too Many Requests",
  "message": "Too many requests from this IP, please try again later.",
  "retryAfter": "Check the Retry-After header for when to retry"
}
```

---

## Rate Limiting

- **Default Limit:** 100 requests per 15-minute window per IP
- **Headers Returned:**
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)
  - `Retry-After`: Seconds to wait (when rate limited)

---

## Caching

- **Search Results:** Cached for 5 minutes (popular queries: 10 minutes)
- **Articles:** Cached for 30 minutes
- **Cache Headers:**
  - `cached: true/false` in response body indicates cache hit/miss

---

## Response Times

- **Typical Response Times:**
  - Cache hit: < 50ms
  - TDX API call: 200-1000ms
  - Search operations: 500-2000ms

- **Timeouts:**
  - API timeout: 30 seconds
  - TDX API timeout: 30 seconds

---

## Data Formats

### Date Format
All dates are in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`

### Content Format
Article content may contain HTML. For plain text, strip HTML tags or use the `summary` field.

### URL Format
Article URLs are direct links to the TDX knowledge base for full article viewing.

---

## Best Practices

1. **Implement Client-Side Caching:** Cache frequently accessed articles
2. **Handle Rate Limits:** Implement exponential backoff
3. **Error Handling:** Always check response status codes
4. **Pagination:** Use `offset` parameter for large result sets
5. **Security:** Always use HTTPS and secure API keys
6. **Monitoring:** Monitor response times and error rates