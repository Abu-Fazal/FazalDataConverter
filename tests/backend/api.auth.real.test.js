import request from 'supertest';
import bcrypt from 'bcrypt';

// This file exercises the real (non-mock) admin password path, so the env must
// be configured before backend modules read it. Vitest isolates each test file.
const ADMIN_EMAIL = 'ops@fazaldataconverter.com';
const ADMIN_PASSWORD = 'correct-horse-battery-staple';
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 4);

let app;

beforeAll(async () => {
  process.env.ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD_HASH = ADMIN_HASH;
  const { loadApp } = await import('../helpers/api.js');
  app = await loadApp();
});

describe('admin password authentication', () => {
  it('rejects a wrong password and reports remaining attempts', async () => {
    const response = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: ADMIN_EMAIL, password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('INVALID_CREDENTIALS');
    expect(response.body.remainingAttempts).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(response.body)).not.toMatch(/correct-horse/);
  });

  it('rejects a wrong email even with the right password', async () => {
    const response = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'intruder@example.com', password: ADMIN_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('accepts the configured email and bcrypt hash', async () => {
    const agent = request.agent(app);
    const response = await agent
      .post('/api/auth/admin/login')
      .send({ email: ADMIN_EMAIL.toUpperCase(), password: ADMIN_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.role).toBe('admin');

    const me = await agent.get('/api/auth/me');
    expect(me.body.authenticated).toBe(true);
    expect(me.body.user.role).toBe('admin');
  });

  it('locks the account after repeated failures and blocks further attempts', async () => {
    const agent = request.agent(app);
    let last = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      last = await agent
        .post('/api/auth/admin/login')
        .send({ email: ADMIN_EMAIL, password: `wrong-${attempt}` });
      if (last.status === 423) break;
    }

    expect(last.status).toBe(423);
    expect(last.body.error).toBe('ACCOUNT_LOCKED');
    expect(last.body.retryAfterSeconds).toBeGreaterThan(0);

    const status = await request(app).get('/api/auth/admin/lockout-status');
    expect(status.body.locked).toBe(true);
    expect(status.body.remainingSeconds).toBeGreaterThan(0);
    expect(JSON.stringify(status.body)).not.toMatch(/hash|password/i);
  });
});