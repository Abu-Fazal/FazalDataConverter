import request from 'supertest';
import { loadApp, loginMockUser, loginMockAdmin, upload } from '../helpers/api.js';
import { xlsxBuffer, jsonBuffer, textBuffer } from '../helpers/fixtures.js';

let app;

beforeAll(async () => {
  app = await loadApp();
});

async function createGuestJob(agent, direction = 'excel-json', file = { buffer: null, name: 'sample.xlsx' }) {
  const buffer = file.buffer || (await xlsxBuffer());
  const uploaded = await upload(agent, buffer, file.name);
  expect(uploaded.status).toBe(200);

  const job = await agent.post('/api/converter/jobs').send({
    tempId: uploaded.body.file.tempId,
    originalName: file.name,
    direction,
    consentAccepted: true,
  });
  return { uploaded, job };
}

describe('role-based access control', () => {
  it('requires authentication for conversion history', async () => {
    const guest = await request(app).get('/api/jobs');
    expect(guest.status).toBe(401);
    expect(guest.body.error).toBe('UNAUTHORIZED');

    const agent = request.agent(app);
    await loginMockUser(agent);
    const registered = await agent.get('/api/jobs');
    expect(registered.status).toBe(200);
    expect(Array.isArray(registered.body.data)).toBe(true);
  });

  it('limits the admin console to the admin role', async () => {
    const guest = await request(app).get('/api/admin/dashboard');
    expect(guest.status).toBe(401);

    const registeredAgent = request.agent(app);
    await loginMockUser(registeredAgent);
    const registered = await registeredAgent.get('/api/admin/dashboard');
    expect(registered.status).toBe(403);
    expect(registered.body.error).toBe('FORBIDDEN');

    const adminAgent = request.agent(app);
    await loginMockAdmin(adminAgent);
    const admin = await adminAgent.get('/api/admin/dashboard');
    expect(admin.status).toBe(200);
    expect(admin.body.success).toBe(true);
  });

  it('protects account endpoints for guests', async () => {
    const guest = await request(app).get('/api/account');
    expect(guest.status).toBe(401);

    const agent = request.agent(app);
    const user = await loginMockUser(agent);
    const account = await agent.get('/api/account');
    expect(account.status).toBe(200);
    expect(account.body.profile.email).toBe(user.email);
    expect(account.body.profile.role).toBe('registered');
    expect(account.body.storage.quotaBytes).toBeGreaterThan(0);
    expect(account.body.session.device).toBeTruthy();
  });

  it('blocks registered users from another user’s job and allows the admin metadata view', async () => {
    const guestAgent = request.agent(app);
    const { job } = await createGuestJob(guestAgent);
    expect(job.status).toBe(202);

    const registeredAgent = request.agent(app);
    await loginMockUser(registeredAgent);
    const blocked = await registeredAgent.get(`/api/jobs/status/${job.body.jobId}`);
    expect(blocked.status).toBe(403);

    const adminAgent = request.agent(app);
    await loginMockAdmin(adminAgent);
    const allowed = await adminAgent.get(`/api/jobs/status/${job.body.jobId}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.job.id).toBe(job.body.jobId);
  });
});

describe('upload validation', () => {
  it('rejects unsupported file extensions at the multer boundary', async () => {
    const agent = request.agent(app);
    const response = await upload(agent, Buffer.from('hello'), 'notes.txt');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('UPLOAD_ERROR');
    expect(response.body.message).toMatch(/UNSUPPORTED_FORMAT/);
  });

  it('enforces the configured size ceiling', async () => {
    const agent = request.agent(app);
    const response = await upload(agent, textBuffer(600 * 1024), 'huge.xlsx');

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('FILE_TOO_LARGE');
  });

  it('rejects spoofed file headers through magic-byte validation', async () => {
    const agent = request.agent(app);
    const response = await upload(agent, Buffer.from('this is not a workbook'), 'fake.xlsx');

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('INVALID_FILE_STRUCTURE');
  });

  it('accepts a valid workbook and returns safe metadata', async () => {
    const agent = request.agent(app);
    const response = await upload(agent, await xlsxBuffer(), 'report.xlsx');

    expect(response.status).toBe(200);
    expect(response.body.file).toMatchObject({
      originalName: 'report.xlsx',
      extension: '.xlsx',
      detectedFormat: 'xlsx',
    });
    expect(response.body.file.tempId).toMatch(/^upload-[\d-]+\.xlsx$/);
    expect(response.body.file.sizeBytes).toBeGreaterThan(0);
  });

  it('binds uploads to the creating session', async () => {
    const owner = request.agent(app);
    const uploaded = await upload(owner, await xlsxBuffer(), 'owned.xlsx');
    expect(uploaded.status).toBe(200);

    const stranger = request.agent(app);
    const discard = await stranger
      .post('/api/converter/discard')
      .send({ tempId: uploaded.body.file.tempId });
    expect(discard.status).toBe(403);
    expect(discard.body.error).toBe('FORBIDDEN');
  });
});

describe('inspect and conversion request validation', () => {
  it('inspects a workbook and previews its sheets', async () => {
    const agent = request.agent(app);
    const uploaded = await upload(agent, await xlsxBuffer({ sheetName: 'Sales' }), 'sales.xlsx');

    const inspected = await agent
      .post('/api/converter/inspect')
      .send({ tempId: uploaded.body.file.tempId, originalName: 'sales.xlsx' });

    expect(inspected.status).toBe(200);
    expect(inspected.body.success).toBe(true);
    expect(inspected.body.sheets.map((sheet) => sheet.name)).toContain('Sales');
    expect(inspected.body.previews.Sales.rows.length).toBeGreaterThan(0);
  });

  it('rejects inspect requests without a temp id', async () => {
    const response = await request(app).post('/api/converter/inspect').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_PARAM');
  });

  it('does not resolve path traversal through temp ids', async () => {
    const response = await request(app)
      .post('/api/converter/inspect')
      .send({ tempId: '../../../../etc/passwd' });

    expect([400, 404]).toContain(response.status);
    expect(response.body.error).not.toBe('INSPECTION_FAILED');
  });

  it('rejects malformed conversion requests with field details', async () => {
    const response = await request(app).post('/api/converter/jobs').send({
      tempId: 'x',
      originalName: 'file.xlsx',
      direction: 'excel-json',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INVALID_REQUEST');
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  it('rejects a direction that does not match the file extension', async () => {
    const agent = request.agent(app);
    const uploaded = await upload(agent, jsonBuffer(), 'data.json');
    expect(uploaded.status).toBe(200);

    const job = await agent.post('/api/converter/jobs').send({
      tempId: uploaded.body.file.tempId,
      originalName: 'data.json',
      direction: 'excel-json',
      consentAccepted: true,
    });

    expect(job.status).toBe(422);
    expect(job.body.error).toBe('UNSUPPORTED_CONVERSION');
  });

  it('rejects jobs for files that do not exist', async () => {
    const response = await request(app).post('/api/converter/jobs').send({
      tempId: 'upload-missing.xlsx',
      originalName: 'missing.xlsx',
      direction: 'excel-json',
      consentAccepted: true,
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('FILE_NOT_FOUND');
  });
});