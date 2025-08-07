# TDX-Genesys Knowledge Base Integration

This project provides a secure API bridge between TeamDynamix (TDX) Knowledge Base and Genesys Cloud, enabling Genesys Web Services Data Actions to search and retrieve knowledge articles.

## Features

- 🔐 **Secure Authentication**: OAuth 2.0 and static token support for TDX API
- 🔍 **Article Search**: Full-text search with filtering and pagination
- 📄 **Article Retrieval**: Get individual articles with formatting
- ⚡ **Rate Limiting**: Configurable rate limits to protect TDX API
- 🛡️ **Error Handling**: Comprehensive error handling and logging
- 📊 **Caching**: Redis-compatible caching for improved performance
- 🔧 **Genesys Ready**: Pre-configured for Genesys Cloud Data Actions

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd tdx-genesys-integration
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your TDX credentials
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Search Articles
```
GET /api/v1/search?query=password&category=IT&limit=10
```

### Get Article
```
GET /api/v1/articles/:id
```

### Health Check
```
GET /health
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TDX_BASE_URL` | TeamDynamix base URL | ✅ |
| `TDX_USERNAME` | TDX API username | ✅ |
| `TDX_PASSWORD` | TDX API password | ✅ |
| `TDX_TOKEN` | Static token (alternative to username/password) | ❌ |
| `PORT` | Server port (default: 3000) | ❌ |
| `RATE_LIMIT_WINDOW` | Rate limit window in minutes | ❌ |
| `RATE_LIMIT_MAX` | Max requests per window | ❌ |

## Genesys Cloud Integration

This API is designed to work seamlessly with Genesys Cloud Web Services Data Actions:

1. **Create Data Action**: Configure endpoints in Genesys Architect
2. **Set Authentication**: Use API key or OAuth
3. **Configure Inputs**: Map search parameters
4. **Parse Responses**: Handle JSON responses

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Docker Support

```bash
# Build image
docker build -t tdx-genesys-integration .

# Run container
docker run -p 3000:3000 --env-file .env tdx-genesys-integration
```

## Security Considerations

- All TDX credentials are encrypted in transit
- Rate limiting prevents API abuse
- Input validation on all endpoints
- CORS configuration for Genesys domains
- Comprehensive logging for audit trails

## License

MIT License - see [LICENSE](LICENSE) file for details.