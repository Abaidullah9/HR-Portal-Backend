import express from 'express';
import request from 'supertest';
import { requireTrustedOrigin } from '../middlewares/origin.middleware';

const originalFrontendUrl = process.env.FRONTEND_URL;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(requireTrustedOrigin);
  app.post('/api/v1/employees', (_req, res) => {
    res.json({ success: true });
  });
  app.get('/api/v1/employees', (_req, res) => {
    res.json({ success: true });
  });
  return app;
};

describe('requireTrustedOrigin', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  afterAll(() => {
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('allows a mutation from the configured frontend', async () => {
    const response = await request(buildApp())
      .post('/api/v1/employees')
      .set('Origin', 'http://localhost:3000');
    expect(response.status).toBe(200);
  });

  it('rejects a mutation from a foreign origin', async () => {
    const response = await request(buildApp())
      .post('/api/v1/employees')
      .set('Origin', 'https://evil.example');
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('rejects a cross-site request that omits Origin', async () => {
    const response = await request(buildApp())
      .post('/api/v1/employees')
      .set('Sec-Fetch-Site', 'cross-site');
    expect(response.status).toBe(403);
  });

  it('allows requests from non-browser clients with no origin headers', async () => {
    // curl, server-to-server calls and the Postman collection send no Origin and
    // carry no ambient cookie, so the auth middleware is the gate for them.
    const response = await request(buildApp()).post('/api/v1/employees');
    expect(response.status).toBe(200);
  });

  it('allows same-origin browser requests that send Sec-Fetch-Site only', async () => {
    const response = await request(buildApp())
      .post('/api/v1/employees')
      .set('Sec-Fetch-Site', 'same-origin');
    expect(response.status).toBe(200);
  });

  it('never blocks reads', async () => {
    const response = await request(buildApp())
      .get('/api/v1/employees')
      .set('Origin', 'https://evil.example');
    expect(response.status).toBe(200);
  });

  it('accepts a comma-separated allowlist', async () => {
    process.env.FRONTEND_URL = 'https://app.example.com, https://staging.example.com';
    const response = await request(buildApp())
      .post('/api/v1/employees')
      .set('Origin', 'https://staging.example.com');
    expect(response.status).toBe(200);
  });
});
