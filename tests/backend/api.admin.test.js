import request from 'supertest';
import {
  loadApp,
  loginMockUser,
  loginMockAdmin,
  pollJob,
  upload,
} from '../helpers/api.js';
import { xlsxBuffer } from '../helpers/fixtures.js';

let app;
let adminAgent;
let userAgent;
let targetUser;

beforeAll(async () => {
  app = await loadApp();

  // A registered account with one completed conversion gives the admin
  // directory, conversions feed, and exports real metadata to report on.
  userAgent = request.agent(app);
  targetUser = await loginMockUser(userAgent);

  const uploaded = await upload(userAgent, await xlsxBuffer(), 'admin-feed.xlsx');
  const job = await userAgent.post('/api/converter/jobs').send({
    tempId: uploaded.body.file.tempId,
    originalName: 'admin-feed.xlsx',
    direction: 'excel-json',
    consentAccepted: true,
  });
  await pollJob(userAgent, job.body.jobId);

  // A second job with truncated JSON exercises the failure log and categories.
  const brokenUpload = await upload(
    userAgent,
    Buffer.from('{ "truncated": '),
    'broken.json'
  );
  const brokenJob = await userAgent.post('/api/converter/jobs').send({
    tempId: brokenUpload.body.file.tempId,
    originalName: 'broken.json',
    direction: 'json-excel',
    consentAccepted: true,
  });
  const failedJob = await pollJob(userAgent, brokenJob.body.jobId);
  expect(failedJob.status).toBe('failed');

  adminAgent = request.agent(app);
  await loginMockAdmin(adminAgent);
});

afterAll(async () => {
  // Never leave the shared in-memory engine in maintenance mode.
  await adminAgent?.post('/api/admin/config/maintenance').send({
    enabled: false,
    consent: true,
  });
});

describe('admin console access', () => {
  it('rejects unauthenticated and non-admin callers', async () => {
    const guest = await request(app).get('/api/admin/users');
    expect(guest.status).toBe(401);

    const agent = request.agent(app);
    await loginMockUser(agent);
    const registered = await agent.get('/api/admin/users');
    expect(registered.status).toBe(403);
  });
});

describe('dashboard and metrics', () => {
  it('returns the governance dashboard contract', async () => {
    const response = await adminAgent.get('/api/admin/dashboard');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.metrics).toMatchObject({
      totalUsers: expect.any(Number),
      totalConversions: expect.any(Number),
      successRate: expect.any(Number),
      verificationRate: expect.any(Number),
      storageUsedBytes: expect.any(Number),
    });
    expect(response.body.data.directionSplit.length).toBe(4);
    expect(response.body.data.weekly.length).toBe(7);
    expect(response.body.data.system.maintenanceMode).toBe(false);
  });

  it('serves the flat metrics alias', async () => {
    const response = await adminAgent.get('/api/admin/metrics');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('systemStatus');
    expect(response.body.data).toHaveProperty('storageUsedMb');
  });
});

describe('user directory governance', () => {
  it('lists users with validated filters', async () => {
    const response = await adminAgent.get('/api/admin/users?status=active&sort=name');

    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    const target = response.body.data.find((user) => user.email === targetUser.email);
    expect(target).toBeTruthy();
    expect(target.publicId).toBeTruthy();
    expect(target.conversions.total).toBeGreaterThanOrEqual(1);

    const invalid = await adminAgent.get('/api/admin/users?status=bogus');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('INVALID_REQUEST');
  });

  it('exports the filtered directory as CSV', async () => {
    const response = await adminAgent.get('/api/admin/users/export');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toMatch(/fazal-users-\d{4}-\d{2}-\d{2}\.csv/);
    expect(response.text.startsWith('\uFEFF')).toBe(true);
    expect(response.text).toContain('User ID');
    expect(response.text).toContain(targetUser.email);
  });

  it('returns metadata-only user detail and 404 for unknown ids', async () => {
    const list = await adminAgent.get('/api/admin/users');
    const target = list.body.data.find((user) => user.email === targetUser.email);

    const detail = await adminAgent.get(`/api/admin/users/${target.publicId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.user.email).toBe(targetUser.email);
    expect(detail.body.data).toHaveProperty('storage');
    expect(detail.body.data).toHaveProperty('recentConversions');

    const missing = await adminAgent.get('/api/admin/users/does-not-exist');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('USER_NOT_FOUND');
  });

  it('suspends, blocks, and reactivates a registered account', async () => {
    const list = await adminAgent.get('/api/admin/users');
    const target = list.body.data.find((user) => user.email === targetUser.email);

    // A second session for the same account proves /api/jobs enforcement
    // independently, because /api/auth/me revokes the session it reports on.
    const blockedSession = request.agent(app);
    await loginMockUser(blockedSession);

    const suspended = await adminAgent
      .post(`/api/admin/users/${target.publicId}/suspend`)
      .send({ reason: 'Automated test suspension' });
    expect(suspended.status).toBe(200);
    expect(suspended.body.changed).toBe(true);

    const blockedMe = await userAgent.get('/api/auth/me');
    expect(blockedMe.body.authenticated).toBe(false);
    expect(blockedMe.body.blocked.status).toBe('suspended');

    const blockedJobs = await blockedSession.get('/api/jobs');
    expect(blockedJobs.status).toBe(403);
    expect(blockedJobs.body.error).toBe('ACCOUNT_SUSPENDED');

    const reactivated = await adminAgent.post(`/api/admin/users/${target.publicId}/reactivate`);
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.changed).toBe(true);

    await loginMockUser(userAgent);
    const restored = await userAgent.get('/api/account');
    expect(restored.status).toBe(200);
  });
});

describe('conversion telemetry', () => {
  it('lists conversions with stats and filters', async () => {
    const response = await adminAgent.get('/api/admin/conversions?status=completed');

    expect(response.status).toBe(200);
    expect(response.body.stats).toBeTruthy();
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data[0]).toHaveProperty('owner');
    expect(response.body.data[0].owner.email).toBeTruthy();

    const invalid = await adminAgent.get('/api/admin/conversions?direction=bogus');
    expect(invalid.status).toBe(400);
  });

  it('returns job diagnostics and 404 for unknown jobs', async () => {
    const list = await adminAgent.get('/api/admin/conversions');
    const job = list.body.data[0];

    const detail = await adminAgent.get(`/api/admin/conversions/${job.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(job.id);
    expect(detail.body.data).toHaveProperty('diagnostics');

    const missing = await adminAgent.get('/api/admin/conversions/unknown-job');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('JOB_NOT_FOUND');
  });

  it('reports failures and exports conversion metadata', async () => {
    const failures = await adminAgent.get('/api/admin/failures');
    expect(failures.status).toBe(200);
    expect(Array.isArray(failures.body.data)).toBe(true);
    expect(failures.body.categories.length).toBeGreaterThan(0);

    const exported = await adminAgent.get('/api/admin/conversions/export');
    expect(exported.status).toBe(200);
    expect(exported.headers['content-type']).toMatch(/text\/csv/);
    expect(exported.text).toContain('Job ID');
  });
});

describe('security ledger', () => {
  it('records authentication and governance events', async () => {
    const response = await adminAgent.get('/api/admin/logs/security?range=7d');

    expect(response.status).toBe(200);
    expect(response.body.summary).toBeTruthy();
    expect(response.body.eventTypes.length).toBeGreaterThan(0);

    const eventTypes = response.body.data.map((entry) => entry.eventType);
    expect(eventTypes).toContain('ADMIN_LOGIN_SUCCESS');
    expect(eventTypes).toContain('USER_REACTIVATED');
  });

  it('exports the ledger and remains append-only', async () => {
    const exported = await adminAgent.get('/api/admin/logs/security/export');
    expect(exported.status).toBe(200);
    expect(exported.headers['content-type']).toMatch(/text\/csv/);
    expect(exported.text).toContain('Event ID');

    const overwrite = await adminAgent
      .put('/api/admin/logs/security')
      .send({ eventType: 'TAMPERED' });
    expect(overwrite.status).toBe(404);

    const erase = await adminAgent.delete('/api/admin/logs/security');
    expect(erase.status).toBe(404);
  });

  it('validates ledger filters', async () => {
    const invalid = await adminAgent.get('/api/admin/logs/security?range=forever');
    expect(invalid.status).toBe(400);
  });
});

describe('configuration and maintenance', () => {
  it('returns settings, defaults, and system snapshot', async () => {
    const response = await adminAgent.get('/api/admin/config');
    expect(response.status).toBe(200);
    expect(response.body.data.settings.maxFileSizeMb).toBeGreaterThanOrEqual(5);
    expect(response.body.data.defaults.maxFileSizeMb).toBe(50);
    expect(response.body.data.system.status).toBeTruthy();
  });

  it('rejects out-of-range configuration values', async () => {
    const current = (await adminAgent.get('/api/admin/config')).body.data;

    const response = await adminAgent.put('/api/admin/config').send({
      ...current.settings,
      maxFileSizeMb: 500,
      maintenanceMode: false,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INVALID_REQUEST');
  });

  it('saves valid configuration and restores defaults', async () => {
    const current = (await adminAgent.get('/api/admin/config')).body.data;

    const saved = await adminAgent.put('/api/admin/config').send({
      ...current.settings,
      smallFileSlaSeconds: 12,
      maintenanceMode: false,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.settings.smallFileSlaSeconds).toBe(12);

    const reset = await adminAgent.post('/api/admin/config/reset').send({ consent: true });
    expect(reset.status).toBe(200);
    expect(reset.body.data.settings.maxFileSizeMb).toBe(50);

    const withoutConsent = await adminAgent.post('/api/admin/config/reset').send({});
    expect(withoutConsent.status).toBe(400);
  });

  it('enforces maintenance for users while keeping the admin console open', async () => {
    const noConsent = await adminAgent
      .post('/api/admin/config/maintenance')
      .send({ enabled: true });
    expect(noConsent.status).toBe(400);

    const enabled = await adminAgent
      .post('/api/admin/config/maintenance')
      .send({ enabled: true, consent: true, message: 'Scheduled maintenance window.' });
    expect(enabled.status).toBe(200);

    const guest = request.agent(app);
    const blockedUpload = await upload(guest, await xlsxBuffer(), 'blocked.xlsx');
    expect(blockedUpload.status).toBe(503);
    expect(blockedUpload.body.error).toBe('MAINTENANCE_MODE');

    const dashboard = await adminAgent.get('/api/admin/dashboard');
    expect(dashboard.status).toBe(200);

    const disabled = await adminAgent
      .post('/api/admin/config/maintenance')
      .send({ enabled: false, consent: true });
    expect(disabled.status).toBe(200);
  });

  it('exposes the admin system snapshot', async () => {
    const response = await adminAgent.get('/api/admin/system');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('maintenanceMode');
  });
});

describe('permanent account removal', () => {
  it('requires the DELETE confirmation and purges account data', async () => {
    const list = await adminAgent.get('/api/admin/users');
    const target = list.body.data.find((user) => user.email === targetUser.email);

    const wrong = await adminAgent
      .delete(`/api/admin/users/${target.publicId}`)
      .send({ confirmation: 'delete' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toBe('CONFIRMATION_MISMATCH');

    const removed = await adminAgent
      .delete(`/api/admin/users/${target.publicId}`)
      .send({ confirmation: 'DELETE' });
    expect(removed.status).toBe(200);
    expect(removed.body.success).toBe(true);
    expect(removed.body.removedJobs).toBeGreaterThanOrEqual(0);

    // Deleted accounts stay in the directory as an audit record with no data.
    const detail = await adminAgent.get(`/api/admin/users/${target.publicId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.user.status).toBe('deleted');
    expect(detail.body.data.user.conversions.total).toBe(0);
  });
});