import request from 'supertest';
import { loadApp, loginMockUser, loginMockAdmin } from '../helpers/api.js';

let app;

beforeAll(async () => {
  app = await loadApp();
});

describe('session identity', () => {
  it('starts guests with a transient guest session', async () => {
    const agent = request.agent(app);
    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(false);
    expect(response.body.user.role).toBe('guest');
    expect(response.body.user.sessionId).toBeTruthy();
  });

  it('creates a registered session through the mock Google flow', async () => {
    const agent = request.agent(app);
    const user = await loginMockUser(agent);

    expect(user.role).toBe('registered');
    expect(user.email).toMatch(/@/);

    const me = await agent.get('/api/auth/me');
    expect(me.body.authenticated).toBe(true);
    expect(me.body.user.email).toBe(user.email);
  });

  it('destroys the session on logout', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.body.authenticated).toBe(false);
    expect(me.body.user.role).toBe('guest');
  });

  it('rejects Google login without a credential', async () => {
    const response = await request(app).post('/api/auth/google').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_CREDENTIAL');
  });
});

describe('admin authentication (mock mode)', () => {
  it('accepts the mock admin login and attaches the admin role', async () => {
    const agent = request.agent(app);
    const admin = await loginMockAdmin(agent);

    expect(admin.role).toBe('admin');

    const me = await agent.get('/api/auth/me');
    expect(me.body.authenticated).toBe(true);
    expect(me.body.user.role).toBe('admin');
  });

  it('validates the admin login payload with Zod', async () => {
    for (const body of [{}, { email: 'not-an-email', password: 'x' }, { email: 'a@b.com' }]) {
      const response = await request(app).post('/api/auth/admin/login').send(body);
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    }
  });

  it('exposes lockout status publicly without credential leakage', async () => {
    const response = await request(app).get('/api/auth/admin/lockout-status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('locked');
    expect(JSON.stringify(response.body)).not.toMatch(/password|hash|admin@/i);
  });

  it('always answers recovery requests generically', async () => {
    const ok = await request(app)
      .post('/api/auth/admin/recovery')
      .send({ email: 'someone@example.com' });
    expect(ok.status).toBe(200);
    expect(ok.body.message).toMatch(/if this email is registered/i);

    const invalid = await request(app)
      .post('/api/auth/admin/recovery')
      .send({ email: 'nope' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('INVALID_REQUEST');
  });
});

describe('re-authentication guard', () => {
  it('lets registered users re-authenticate (mock Google mode)', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);

    const response = await agent.post('/api/account/reauthenticate').send({});
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.verifiedAt).toBeTruthy();
  });

  it('forbids admin accounts from the user re-auth endpoint', async () => {
    const agent = request.agent(app);
    await loginMockAdmin(agent);

    const response = await agent.post('/api/account/reauthenticate').send({});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('ADMIN_ACCOUNT');
  });
});