import { loadApp, startServer } from '../helpers/api.js';

let server;

beforeAll(async () => {
  server = await startServer(await loadApp());
  // Warm the event loop and session middleware before measuring.
  await fetch(`${server.baseUrl}/api/health`);
});

afterAll(async () => {
  await server?.close();
});

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

async function runLoad(path, { total, concurrency, expectedStatus }) {
  const latencies = [];
  const statuses = new Map();
  let next = 0;

  async function worker() {
    while (next < total) {
      const requestId = next;
      next += 1;
      const startedAt = performance.now();
      const response = await fetch(`${server.baseUrl}${path}`, {
        signal: AbortSignal.timeout(10000),
      });
      latencies.push(performance.now() - startedAt);
      await response.arrayBuffer();
      statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
      expect(requestId).toBeLessThan(total);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    count: latencies.length,
    statuses,
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    max: Math.max(...latencies),
    expectedStatus,
  };
}

describe('server load behaviour', () => {
  it('serves 120 concurrent health probes without errors', async () => {
    const result = await runLoad('/api/health', {
      total: 120,
      concurrency: 20,
      expectedStatus: 200,
    });

    expect(result.count).toBe(120);
    expect([...result.statuses.keys()]).toEqual([200]);
    expect(result.p95).toBeLessThan(1500);
    expect(result.max).toBeLessThan(5000);
  });

  it('keeps public status available under concurrent reads', async () => {
    const result = await runLoad('/api/system/status', {
      total: 50,
      concurrency: 10,
      expectedStatus: 200,
    });

    expect([...result.statuses.keys()]).toEqual([200]);
    expect(result.p95).toBeLessThan(2000);
  });

  it('fails closed under unauthenticated admin traffic', async () => {
    const result = await runLoad('/api/admin/dashboard', {
      total: 40,
      concurrency: 10,
      expectedStatus: 401,
    });

    expect([...result.statuses.keys()]).toEqual([401]);
    expect(result.p95).toBeLessThan(2000);
  });
});