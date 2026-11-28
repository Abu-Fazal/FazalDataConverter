import request from 'supertest';
import { loadApp, pollJob, upload, loginMockUser } from '../helpers/api.js';
import { xlsxBuffer, jsonBuffer, STATIC_JS_DATA } from '../helpers/fixtures.js';

let app;

beforeAll(async () => {
  app = await loadApp();
});

function binaryParser(response, callback) {
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
}

function download(agent, url) {
  return agent.get(url).buffer(true).parse(binaryParser);
}

async function createJob(agent, { buffer, name, direction, mode = 'normal', overrides } = {}) {
  const uploaded = await upload(agent, buffer || (await xlsxBuffer()), name || 'sample.xlsx');
  expect(uploaded.status).toBe(200);

  const job = await agent.post('/api/converter/jobs').send({
    tempId: uploaded.body.file.tempId,
    originalName: name || 'sample.xlsx',
    direction,
    mode,
    overrides,
    consentAccepted: true,
  });

  return { uploaded, job };
}

describe('Excel to JSON (asynchronous job pipeline)', () => {
  it('converts a guest workbook and streams the verified output', async () => {
    const agent = request.agent(app);
    const { job } = await createJob(agent, { direction: 'excel-json' });

    expect(job.status).toBe(202);
    expect(job.body.jobId).toBeTruthy();

    const completed = await pollJob(agent, job.body.jobId);
    expect(completed.status).toBe('completed');
    expect(completed.progress).toBe(100);
    expect(completed.result.verification.verified).toBe(true);
    expect(completed.result.rowCount).toBeGreaterThanOrEqual(2);
    expect(completed.result.sheetCount).toBe(1);
    expect(completed.result.payload).toBeUndefined();
    expect(completed.result.outputPath).toBeUndefined();
    expect(completed.result.preview).toBeTruthy();

    const status = await agent.get(`/api/jobs/status/${job.body.jobId}`);
    expect(status.status).toBe(200);
    expect(status.body.job.file.targetFormat).toBe('json');

    const file = await download(agent, `/api/jobs/download/${job.body.jobId}`);
    expect(file.status).toBe(200);
    expect(file.headers['content-disposition']).toMatch(/attachment; filename="/);
    const json = JSON.parse(file.body.toString('utf8'));
    expect(json.data.Sheet1).toHaveLength(2);
    expect(json.data.Sheet1[0].Name).toBe('Alpha');

    const consumed = await agent.get(`/api/jobs/download/${job.body.jobId}`);
    expect([404, 409, 410]).toContain(consumed.status);
  });

  it('supports workbook mode with sheet metadata', async () => {
    const agent = request.agent(app);
    const { job } = await createJob(agent, {
      direction: 'excel-json',
      mode: 'workbook',
      name: 'workbook.xlsx',
    });

    const completed = await pollJob(agent, job.body.jobId);
    expect(completed.status).toBe('completed');
    expect(completed.result.diagnosticsCount ?? completed.result.diagnostics?.length ?? 0).toBeGreaterThanOrEqual(0);
    expect(completed.result.verification.verified).toBe(true);
    expect(completed.result.sheets || completed.result.preview).toBeTruthy();
  });

  it('applies inline cell corrections when retrying a completed job', async () => {
    const agent = request.agent(app);
    await loginMockUser(agent);

    const { job } = await createJob(agent, { direction: 'excel-json' });
    const first = await pollJob(agent, job.body.jobId);
    expect(first.status).toBe('completed');

    const retry = await agent
      .post(`/api/converter/jobs/${job.body.jobId}/retry`)
      .send({ overrides: [{ sheet: 'Sheet1', address: 'B2', value: 9999 }] });

    expect(retry.status).toBe(202);
    expect(retry.body.retryOf).toBe(job.body.jobId);

    const corrected = await pollJob(agent, retry.body.jobId);
    expect(corrected.status).toBe('completed');

    const file = await download(agent, `/api/jobs/download/${retry.body.jobId}`);
    expect(file.status).toBe(200);
    expect(file.body.toString('utf8')).toContain('9999');
  });

  it('rejects retries with invalid overrides', async () => {
    const agent = request.agent(app);
    const { job } = await createJob(agent, { direction: 'excel-json' });
    await pollJob(agent, job.body.jobId);

    const retry = await agent
      .post(`/api/converter/jobs/${job.body.jobId}/retry`)
      .send({ overrides: [{ sheet: '', address: 'bad-address', value: {} }] });

    expect(retry.status).toBe(400);
    expect(retry.body.error).toBe('INVALID_OVERRIDES');
  });
});

describe('JSON to Excel', () => {
  it('rebuilds a downloadable workbook from JSON input', async () => {
    const agent = request.agent(app);
    const { job } = await createJob(agent, {
      buffer: jsonBuffer(),
      name: 'records.json',
      direction: 'json-excel',
    });

    expect(job.status).toBe(202);
    const completed = await pollJob(agent, job.body.jobId);
    expect(completed.status).toBe('completed');
    expect(completed.result.filename).toMatch(/\.xlsx$/);
    expect(completed.result.verification.verified).toBe(true);

    const file = await download(agent, `/api/jobs/download/${job.body.jobId}`);
    expect(file.status).toBe(200);
    expect(file.body.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(file.body.length).toBeGreaterThan(1000);
  });

  it('rejects empty JSON payloads without a temp file', async () => {
    const response = await request(app).post('/api/converter/json-to-excel').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_DATA');
  });
});

describe('Excel to BSON', () => {
  it('produces a binary BSON download', async () => {
    const agent = request.agent(app);
    const { job } = await createJob(agent, { direction: 'excel-bson', name: 'bson.xlsx' });

    const completed = await pollJob(agent, job.body.jobId);
    expect(completed.status).toBe('completed');
    expect(completed.result.filename).toMatch(/\.bson$/);

    const file = await download(agent, `/api/jobs/download/${job.body.jobId}`);
    expect(file.status).toBe(200);
    expect(file.body.length).toBeGreaterThan(8);
  });
});

describe('static JavaScript extraction (no code execution)', () => {
  it('extracts literal arrays through the AST parser', async () => {
    const response = await request(app)
      .post('/api/converter/extract-js-data')
      .send({ jsCode: STATIC_JS_DATA });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.type).toBe('array');
    expect(response.body.count).toBe(2);
    expect(response.body.extractedData[0].name).toBe('Alpha');
  });

  it('rejects dynamic code and syntax errors', async () => {
    for (const jsCode of ['const data = (() => [1])();', 'const = ;']) {
      const response = await request(app)
        .post('/api/converter/extract-js-data')
        .send({ jsCode });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('EXTRACTION_FAILED');
    }
  });
});

describe('job lifecycle guards', () => {
  it('discards an uploaded file and makes it unreadable', async () => {
    const agent = request.agent(app);
    const uploaded = await upload(agent, await xlsxBuffer(), 'discard.xlsx');

    const discarded = await agent
      .post('/api/converter/discard')
      .send({ tempId: uploaded.body.file.tempId });
    expect(discarded.status).toBe(200);

    const inspected = await agent
      .post('/api/converter/inspect')
      .send({ tempId: uploaded.body.file.tempId });
    expect(inspected.status).toBe(404);
    expect(inspected.body.error).toBe('FILE_NOT_FOUND');
  });

  it('refuses to cancel a completed job', async () => {
    const agent = request.agent(app);
    const { job } = await createJob(agent, { direction: 'excel-json' });
    await pollJob(agent, job.body.jobId);

    const response = await agent.post(`/api/jobs/cancel/${job.body.jobId}`);
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('JOB_NOT_CANCELLABLE');
  });

  it('returns 404 when cancelling an unknown job', async () => {
    const agent = request.agent(app);
    const response = await agent.post('/api/jobs/cancel/nonexistent-job');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('JOB_NOT_FOUND');
  });
});