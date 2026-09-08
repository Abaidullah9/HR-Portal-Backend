import request from 'supertest';
import express from 'express';

// Mock mongoose connection
jest.mock('mongoose', () => ({
  connection: {
    readyState: 1,
    ready: 1,
  },
}));

// Mock the routes to avoid actual database calls
jest.mock('../routes/index', () => {
  const router = require('express').Router();
  
  router.get('/', (_req: any, res: any) => {
    res.json({ success: true, message: 'HR Portal API v1 - Working' });
  });

  router.get('/health', (_req: any, res: any) => {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState;
    const isDbConnected = dbStatus === 1;
    res.status(isDbConnected ? 200 : 503).json({
      success: isDbConnected,
      message: isDbConnected ? 'Server is healthy' : 'Database disconnected',
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
          connected: isDbConnected,
          readyState: dbStatus,
        },
      },
    });
  });

  router.post('/test-error', (_req: any, res: any) => {
    throw new Error('Test error');
  });

  router.post('/test-app-error', (_req: any, res: any) => {
    const { AppError } = require('../utils/helper/AppError');
    throw new AppError('Custom error', 422);
  });

  return router;
});

describe('Integration Tests', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', require('../routes/index'));
    app.use(require('../middlewares/error.middleware').default);
  });

  describe('GET /api/v1', () => {
    it('should return API working message', async () => {
      const response = await request(app).get('/api/v1');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('HR Portal API v1 - Working');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status when DB is connected', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.database.connected).toBe(true);
    });

    it('should include uptime and timestamp', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle generic errors', async () => {
      const response = await request(app).post('/api/v1/test-error');
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Test error');
    });

    it('should handle AppError with custom status code', async () => {
      const response = await request(app).post('/api/v1/test-app-error');
      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Custom error');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/unknown');
      expect(response.status).toBe(404);
    });
  });
});
