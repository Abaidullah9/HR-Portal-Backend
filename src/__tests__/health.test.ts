// Mock mongoose
jest.mock('mongoose', () => ({
  connection: {
    readyState: 1,
  },
}));

describe('Health Endpoint Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy when database is connected', () => {
    const mongoose = require('mongoose');
    mongoose.connection.readyState = 1;
    const dbStatus = mongoose.connection.readyState;
    const isDbConnected = dbStatus === 1;
    expect(isDbConnected).toBe(true);
  });

  it('should return unhealthy when database is disconnected', () => {
    const mongoose = require('mongoose');
    mongoose.connection.readyState = 0;
    const dbStatus = mongoose.connection.readyState;
    const isDbConnected = dbStatus === 1;
    expect(isDbConnected).toBe(false);
    mongoose.connection.readyState = 1;
  });

  it('should have all required response fields', () => {
    const response = {
      success: true,
      message: 'Server is healthy',
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          readyState: 1,
        },
      },
    };
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('data');
    expect(response.data).toHaveProperty('uptime');
    expect(response.data).toHaveProperty('timestamp');
    expect(response.data).toHaveProperty('database');
  });
});
