import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BACKEND, FRONTEND, ROOT } from '../helpers/paths.js';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

describe('Vercel frontend project (repository root)', () => {
  const config = readJson('vercel.json');

  it('builds the frontend workspace and serves frontend/dist', () => {
    expect(config.buildCommand).toContain('frontend');
    expect(config.outputDirectory).toBe('frontend/dist');
  });

  it('rewrites private screens to the noindex SPA shell', () => {
    const destinations = Object.fromEntries(
      config.rewrites.map((rewrite) => [rewrite.source, rewrite.destination])
    );

    for (const source of [
      '/admin/:path*',
      '/account',
      '/history',
      '/login',
      '/converter/progress/:path*',
      '/converter/error/:path*',
    ]) {
      expect(destinations[source], `${source} must serve shell.html`).toBe('/shell.html');
    }
  });

  it('falls back to the prerendered landing document last', () => {
    const last = config.rewrites[config.rewrites.length - 1];
    expect(last).toEqual({ source: '/(.*)', destination: '/index.html' });
  });
});

describe('Standalone backend Vercel project', () => {
  const config = readJson('backend/vercel.json');

  it('routes every request into the Express API function', () => {
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/api/index' }]);
  });
});

describe('Serverless API entry points', () => {
  const entries = [
    'api/index.js',
    'api/[...path].js',
    'backend/api/index.js',
    'backend/api/[...path].js',
  ];

  it.each(entries)('%s exports the Express app as default', async (entry) => {
    const source = read(entry);
    expect(source).toMatch(/import app from/);
    expect(source).toMatch(/export default app;/);

    const module = await import(pathToFileURL(path.join(ROOT, entry)).href);
    expect(typeof module.default).toBe('function');
  });

  it('reuses the same backend app for the root and standalone projects', () => {
    expect(read('api/index.js')).toContain("../backend/src/app.js");
    expect(read('api/[...path].js')).toContain("../backend/src/app.js");
    expect(read('backend/api/index.js')).toContain("../src/app.js");
    expect(read('backend/api/[...path].js')).toContain("../src/app.js");
  });
});

describe('Frontend to backend communication contract', () => {
  it('defaults API calls to same-origin /api and strips trailing slashes', async () => {
    const { API_BASE } = await import('../../frontend/src/services/apiBase.js');
    expect(API_BASE).toBe('/api');

    const source = fs.readFileSync(path.join(FRONTEND, 'src/services/apiBase.js'), 'utf8');
    expect(source).toMatch(/VITE_API_URL\s*\|\|\s*'\/api'/);
  });

  it('sends session cookies with every API request', () => {
    const source = fs.readFileSync(path.join(FRONTEND, 'src/services/api.client.js'), 'utf8');
    expect(source).toContain("credentials: 'include'");
    expect(source).toContain('${API_BASE}${endpoint}');
  });

  it('proxies /api to the local Express server during development', () => {
    const source = fs.readFileSync(path.join(FRONTEND, 'vite.config.js'), 'utf8');
    expect(source).toContain("'/api'");
    expect(source).toContain('http://localhost:5000');
    expect(source).toContain('port: 5173');
  });

  it('documents the production API URL override', () => {
    const source = read('.env.example');
    expect(source).toContain('VITE_API_URL');
  });
});

describe('Production runtime posture', () => {
  it('trusts the Vercel proxy so secure cookies and client IPs are correct', () => {
    expect(read('backend/src/app.js')).toContain("app.set('trust proxy', 1)");
  });

  it('uses hardened session cookies and Mongo-backed sessions in production', () => {
    const source = read('backend/src/middlewares/session.js');
    expect(source).toContain("name: 'fdc.sid'");
    expect(source).toContain('secure: isProd');
    expect(source).toContain("sameSite: isProd ? 'none' : 'lax'");
    expect(source).toContain('MongoStore.create');
    expect(source).toContain('isProd && mongoUri');
  });

  it('stores files in /tmp on Vercel instead of the read-only project tree', () => {
    const source = read('backend/src/config/env.js');
    expect(source).toContain("'/tmp/fazal-storage'");
    expect(source).toContain('process.env.VERCEL');
  });

  it('never allows simulated Google or admin sign-in in production', () => {
    const authSource = read('backend/src/modules/auth/auth.routes.js');
    const accountSource = read('backend/src/modules/account/account.routes.js');

    expect(authSource).toMatch(/config\.env !== 'production'/);
    expect(authSource).toContain('AUTH_NOT_CONFIGURED');
    expect(authSource).toContain('ADMIN_AUTH_NOT_CONFIGURED');
    expect(accountSource).toMatch(/config\.env === 'production'/);
    expect(accountSource).toContain('AUTH_NOT_CONFIGURED');
  });
});