import request from 'supertest';
import { loadApp, pollJob, upload, loginMockUser, loginMockAdmin } from '../helpers/api.js';
import { xlsxBuffer } from '../helpers/fixtures.js';

let app;

beforeAll(async () => {
  app = await loadApp();
});

async function newCompletedJob(agent, name = 'history.xlsx') {
  const uploaded = await upload(agent, await xlsxBuffer(), name);
  expect(uploaded.status).toBe(200);

  const created = await agent.post('/api/converter/jobs').send({
    tempId: uploaded.body.file.tempId,
    originalName: name,
    direction: 'excel-json',
    consentAccepted: true,
  });
  expect(created.status).toBe(202);

  await pollJob(agent, created.body.jobId);
  return created.body.jobId;
}

describe('conversion history', () => {
  it('lists only the signed-in user’s jobs with aggregated stats', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);
    const jobId = await newCompletedJob(agent);

    const response = await agent.get('/api/jobs');
    expect(response.status).toBe(200);
    expect(response.body.data.some((entry) => entry.id === jobId)).toBe(true);

    const entry = response.body.data.find((job) => job.id === jobId);
    expect(entry).toMatchObject({
      originalFileName: 'history.xlsx',
      targetFormat: 'json',
      status: 'completed',
      verification: { verified: true },
    });

    expect(response.body.stats).toMatchObject({
      total: expect.any(Number),
      completed: expect.any(Number),
      successRate: expect.any(Number),
    });
    expect(response.body.stats.weekly).toHaveLength(7);
    expect(response.body.stats.storage).toHaveProperty('usedBytes');
  });

  it('serves and then deletes the stored original', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);
    const jobId = await newCompletedJob(agent);

    const original = await agent.get(`/api/jobs/original/${jobId}`);
    expect(original.status).toBe(200);
    expect(original.headers['content-disposition']).toMatch(/attachment/);

    const removed = await agent.delete(`/api/jobs/${jobId}/original`);
    expect(removed.status).toBe(200);
    expect(removed.body.originalAvailable).toBe(false);

    const gone = await agent.get(`/api/jobs/original/${jobId}`);
    expect(gone.status).toBe(410);
    expect(gone.body.error).toBe('ORIGINAL_DELETED');
  });

  it('deletes only the converted output', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);
    const jobId = await newCompletedJob(agent);

    const removed = await agent.delete(`/api/jobs/${jobId}/output`);
    expect(removed.status).toBe(200);
    expect(removed.body.outputAvailable).toBe(false);

    const download = await agent.get(`/api/jobs/download/${jobId}`);
    expect(download.status).toBe(409);
    expect(download.body.error).toBe('OUTPUT_NOT_READY');
  });

  it('deletes one history entry and clears the rest', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);
    const first = await newCompletedJob(agent, 'first.xlsx');
    const second = await newCompletedJob(agent, 'second.xlsx');

    const deleted = await agent.delete(`/api/jobs/${first}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.deletedId).toBe(first);

    const cleared = await agent.delete('/api/jobs');
    expect(cleared.status).toBe(200);
    expect(cleared.body.removedCount).toBeGreaterThanOrEqual(1);

    const list = await agent.get('/api/jobs');
    expect(list.body.data).toHaveLength(0);
    expect(cleared.body.removedCount).toBeGreaterThanOrEqual(1);
    expect(list.body.data.some((job) => job.id === second)).toBe(false);
  });
});

describe('account lifecycle', () => {
  it('reports profile, session, and storage usage', async () => {
    const agent = request.agent(app);
    const user = await loginMockUser(agent);
    await newCompletedJob(agent);

    const response = await agent.get('/api/account');
    expect(response.status).toBe(200);
    expect(response.body.profile).toMatchObject({
      email: user.email,
      role: 'registered',
      provider: 'google',
    });
    expect(response.body.session).toMatchObject({
      device: expect.any(String),
    });
    expect(response.body.storage.historyCount).toBeGreaterThanOrEqual(1);
    expect(response.body.storage.quotaBytes).toBeGreaterThan(0);
  });

  it('requires fresh re-authentication and the exact confirmation phrase', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);

    const noReauth = await agent
      .delete('/api/account')
      .send({ confirmation: 'DELETE MY ACCOUNT PERMANENTLY', consent: true });
    expect(noReauth.status).toBe(403);
    expect(noReauth.body.error).toBe('REAUTH_REQUIRED');

    await agent.post('/api/account/reauthenticate').send({});

    const wrongPhrase = await agent
      .delete('/api/account')
      .send({ confirmation: 'delete', consent: true });
    expect(wrongPhrase.status).toBe(400);
    expect(wrongPhrase.body.error).toBe('CONFIRMATION_MISMATCH');

    const deleted = await agent
      .delete('/api/account')
      .send({ confirmation: 'DELETE MY ACCOUNT PERMANENTLY', consent: true });
    expect(deleted.status).toBe(200);
    expect(deleted.body.success).toBe(true);

    const me = await agent.get('/api/auth/me');
    expect(me.body.authenticated).toBe(false);
  });

  it('forbids admin accounts from self-deletion', async () => {
    const agent = request.agent(app);
    await loginMockAdmin(agent);

    const response = await agent
      .delete('/api/account')
      .send({ confirmation: 'DELETE MY ACCOUNT PERMANENTLY', consent: true });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('ADMIN_ACCOUNT');
  });

  it('rejects unknown history entries', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);

    const missing = await agent.delete('/api/jobs/unknown-job');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('JOB_NOT_FOUND');
  });
});