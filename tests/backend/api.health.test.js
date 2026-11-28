import request from 'supertest';
import { loadApp } from '../helpers/api.js';

let app;

beforeAll(async () => {
  app = await loadApp();
});

describe('GET /api/health', () => {
  it('reports service health and enforced limits', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'FazalDataConverter Backend API',
      limits: { maxFileSize: '50 MB', dataOnlyMode: true },
    });
    expect(typeof response.body.uptime).toBe('number');
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('is served as JSON for monitoring probes', async () => {
    const response = await request(app).get('/api/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('GET /api/system/status', () => {
  it('returns the public maintenance banner contract', async () => {
    const response = await request(app).get('/api/system/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: expect.any(String),
      maintenanceMode: expect.any(Boolean),
      maxFileSizeMb: expect.any(Number),
    });
    expect(response.body.data.serverTime).toBeTruthy();
  });
});

describe('HTTP hardening', () => {
  it('applies Helmet security headers and hides Express', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeTruthy();
    expect(response.headers['x-frame-options'] || response.headers['content-security-policy']).toBeTruthy();
  });

  it('allows the configured frontend origin with credentials', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers unknown routes with structured JSON', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('NOT_FOUND');
    expect(response.body.message).toMatch(/not found/i);
  });

  it('rejects malformed JSON bodies without leaking internals', async () => {
    const response = await request(app)
      .post('/api/auth/google')
      .set('Content-Type', 'application/json')
      .send('{"credential": ');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(response.body)).not.toMatch(/stack|node_modules|at .*\(/i);
  });
});