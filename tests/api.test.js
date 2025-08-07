const request = require('supertest');
const app = require('../src/server');

describe('Health Endpoints', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });

  test('GET /health/detailed should return system information', async () => {
    const response = await request(app)
      .get('/health/detailed')
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('system');
    expect(response.body).toHaveProperty('configuration');
    expect(response.body.system).toHaveProperty('memory');
  });
});

describe('Authentication', () => {
  test('GET /api/v1/search without API key should return 401', async () => {
    const response = await request(app)
      .get('/api/v1/search?query=test')
      .expect(401);

    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });

  test('GET /api/v1/search with invalid API key should return 401', async () => {
    const response = await request(app)
      .get('/api/v1/search?query=test')
      .set('X-API-Key', 'invalid-key')
      .expect(401);

    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });
});

describe('Search Validation', () => {
  const validApiKey = process.env.API_KEY || 'test-key';

  test('GET /api/v1/search without query should return 400', async () => {
    const response = await request(app)
      .get('/api/v1/search')
      .set('X-API-Key', validApiKey)
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Validation Error');
  });

  test('GET /api/v1/search with empty query should return 400', async () => {
    const response = await request(app)
      .get('/api/v1/search?query=')
      .set('X-API-Key', validApiKey)
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Validation Error');
  });

  test('GET /api/v1/search with invalid limit should return 400', async () => {
    const response = await request(app)
      .get('/api/v1/search?query=test&limit=100')
      .set('X-API-Key', validApiKey)
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Validation Error');
  });
});

describe('Article Validation', () => {
  const validApiKey = process.env.API_KEY || 'test-key';

  test('GET /api/v1/articles/invalid should return 400', async () => {
    const response = await request(app)
      .get('/api/v1/articles/invalid')
      .set('X-API-Key', validApiKey)
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Validation Error');
  });

  test('GET /api/v1/articles/0 should return 400', async () => {
    const response = await request(app)
      .get('/api/v1/articles/0')
      .set('X-API-Key', validApiKey)
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Validation Error');
  });
});

describe('404 Handling', () => {
  test('GET /nonexistent should return 404', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Not Found');
    expect(response.body).toHaveProperty('availableEndpoints');
  });
});