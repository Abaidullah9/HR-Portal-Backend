import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';

describe('GET /api/v1/health', () => {
  const originalState = mongoose.connection.readyState;

  afterEach(() => {
    mongoose.connection.readyState = originalState;
  });

  it('reports a connected database and process uptime', async () => {
    mongoose.connection.readyState = 1;
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Server is healthy',
      data: { database: { connected: true, readyState: 1 } },
    });
    expect(response.body.data.uptime).toEqual(expect.any(Number));
    expect(response.body.data.timestamp).toEqual(expect.any(String));
  });

  it('returns 503 when the database is disconnected', async () => {
    mongoose.connection.readyState = 0;
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Database disconnected');
    expect(response.body.data.database.connected).toBe(false);
  });
});
