import { spawn } from 'node:child_process';
import path from 'node:path';
import { BACKEND } from '../helpers/paths.js';

const PORT = 5397;
const BASE = `http://127.0.0.1:${PORT}`;

let child;
let output = '';

async function waitForHealth(timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return response;
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Backend did not become healthy on port ${PORT}.\n${output}`);
}

beforeAll(async () => {
  child = spawn(process.execPath, ['src/server.js'], {
    cwd: BACKEND,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(PORT),
      MONGODB_URI: '',
      TEMP_STORAGE_PATH: path.join(BACKEND, 'storage', 'temp'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  await waitForHealth();
}, 30000);

afterAll(async () => {
  if (!child || child.exitCode !== null) return;

  const exited = new Promise((resolve) => child.once('exit', () => resolve(true)));
  child.kill('SIGTERM');
  const stopped = await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
  ]);

  if (!stopped && child.exitCode === null) {
    child.kill('SIGKILL');
    await exited;
  }
});

describe('real server entry point', () => {
  it('boots the Express server and answers the health probe', async () => {
    const response = await fetch(`${BASE}/api/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('FazalDataConverter Backend API');
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('serves the public status and structured 404s over real HTTP', async () => {
    const status = await fetch(`${BASE}/api/system/status`);
    expect(status.status).toBe(200);
    const statusBody = await status.json();
    expect(statusBody.data.maintenanceMode).toBe(false);

    const missing = await fetch(`${BASE}/api/no-such-route`);
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe('NOT_FOUND');
  });

  it('creates real guest sessions with secure cookie attributes', async () => {
    const response = await fetch(`${BASE}/api/auth/me`);
    expect(response.status).toBe(200);

    const cookie = response.headers.get('set-cookie') || '';
    expect(cookie).toMatch(/fdc\.sid=/);
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
  });
});