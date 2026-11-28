import request from 'supertest';

// Production posture: no Google OAuth client, no admin credentials, no database.
// The backend must refuse simulated sign-in instead of silently issuing sessions.
process.env.NODE_ENV = 'production';
process.env.GOOGLE_CLIENT_ID = '';
process.env.ADMIN_EMAIL = '';
process.env.ADMIN_PASSWORD_HASH = '';
process.env.MONGODB_URI = '';
process.env.SESSION_SECRET = 'fazal-production-test-session-secret-32';

let app;

beforeAll(async () => {
  const { loadApp } = await import('../helpers/api.js');
  app = await loadApp();
});

describe('Production boot without optional services', () => {
  it('serves health checks', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('starts visitors as guests', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(false);
    expect(response.body.user.role).toBe('guest');
  });
});

describe('Simulated Google sign-in is disabled', () => {
  it('returns 503 AUTH_NOT_CONFIGURED instead of creating a mock session', async () => {
    const response = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'any-credential' });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('AUTH_NOT_CONFIGURED');
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});

describe('Simulated admin sign-in is disabled', () => {
  it('returns 503 ADMIN_AUTH_NOT_CONFIGURED for unset credentials', async () => {
    const response = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'admin@example.com', password: 'anything' });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('ADMIN_AUTH_NOT_CONFIGURED');
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});

describe('Registered account routes still require a session', () => {
  it('rejects anonymous account access', async () => {
    const response = await request(app).get('/api/account');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UNAUTHORIZED');
  });

  it('refuses simulated re-authentication when Google is not configured', async () => {
    const express = (await import('express')).default;
    const { default: accountRoutes } = await import(
      '../../backend/src/modules/account/account.routes.js'
    );
    const { createSessionMiddleware } = await import(
      '../../backend/src/middlewares/session.js'
    );

    const synthetic = express();
    synthetic.use(express.json());
    synthetic.use(createSessionMiddleware());
    synthetic.use((req, _res, next) => {
      req.session.user = {
        id: 'user_production_1',
        email: 'user@example.com',
        name: 'Registered User',
        role: 'registered',
      };
      next();
    });
    synthetic.use('/api/account', accountRoutes);

    const response = await request(synthetic)
      .post('/api/account/reauthenticate')
      .send({});

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('AUTH_NOT_CONFIGURED');
  });
});

describe('A configured Google client never falls back to the mock identity', () => {
  it('rejects an invalid Google token with 401 instead of signing in', async () => {
    // The route reads GOOGLE_CLIENT_ID per request, so switching it after boot
    // exercises the real verification branch on the already-loaded app.
    process.env.GOOGLE_CLIENT_ID = '1234567890-realclient.apps.googleusercontent.com';

    const response = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'not-a-real-google-id-token' });

    process.env.GOOGLE_CLIENT_ID = '';

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('AUTH_FAILED');
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});