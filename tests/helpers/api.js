import { once } from 'node:events';
import { delay } from './fixtures.js';

export async function loadApp() {
  const module = await import('../../backend/src/app.js');
  return module.default;
}

export function upload(agent, buffer, filename) {
  return agent.post('/api/converter/upload').attach('file', buffer, filename);
}

export async function pollJob(agent, jobId, { timeoutMs = 20000, intervalMs = 120 } = {}) {
  const startedAt = Date.now();
  let last = null;

  while (Date.now() - startedAt < timeoutMs) {
    const response = await agent.get(`/api/jobs/status/${jobId}`);
    last = response;
    if (response.status === 200 && ['completed', 'failed', 'cancelled'].includes(response.body.job?.status)) {
      return response.body.job;
    }
    await delay(intervalMs);
  }

  throw new Error(
    `Job ${jobId} did not finish within ${timeoutMs}ms (last status ${last?.status}: ${JSON.stringify(last?.body)})`
  );
}

export async function startServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      server.closeAllConnections?.();
      server.close();
      await once(server, 'close');
    },
  };
}

export async function loginMockUser(agent) {
  const response = await agent.post('/api/auth/google').send({ credential: 'mock-credential' });
  if (response.status !== 200) {
    throw new Error(`Mock Google login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.user;
}

export async function loginMockAdmin(agent, email = 'admin@fazaldataconverter.com') {
  const response = await agent
    .post('/api/auth/admin/login')
    .send({ email, password: 'any-password-in-mock-mode' });
  if (response.status !== 200) {
    throw new Error(`Mock admin login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.user;
}