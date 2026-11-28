import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// Tests live in a root-level folder, outside both npm workspaces, so bare
// imports (supertest, exceljs, express) are resolved through the workspaces
// that actually install them. createRequire keeps this correct after `npm ci`
// whether packages land in backend/node_modules or are hoisted to the root.
const backendRequire = createRequire(path.join(root, 'backend', 'package.json'));
const frontendRequire = createRequire(path.join(root, 'frontend', 'package.json'));

function resolveWorkspaceDependency(specifier) {
  for (const req of [backendRequire, frontendRequire]) {
    try {
      return req.resolve(specifier);
    } catch {
      // try the next workspace
    }
  }
  throw new Error(`Cannot resolve "${specifier}" from the backend or frontend workspace.`);
}

/**
 * Single Vitest entry for the whole monorepo.
 * All suites live under tests/ so GitHub Actions runs one command (`npm test`).
 */
export default {
  root,
  resolve: {
    alias: {
      supertest: resolveWorkspaceDependency('supertest'),
      exceljs: resolveWorkspaceDependency('exceljs'),
      express: resolveWorkspaceDependency('express'),
      bcrypt: resolveWorkspaceDependency('bcrypt'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    // Backend tests share in-memory singletons (adminStore, jobManager) and the
    // load/runtime suites bind ports, so files run one at a time.
    fileParallelism: false,
    testTimeout: 45000,
    hookTimeout: 45000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: '',
      GOOGLE_CLIENT_ID: '',
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD_HASH: '',
      SESSION_SECRET: 'fazal-test-session-secret-32-characters-min',
      CORS_ORIGIN: 'http://localhost:5173',
      MAX_FILE_SIZE_BYTES: '524288',
      TEMP_STORAGE_PATH: path.join(root, 'tests', '.tmp-storage'),
      JOB_TIMEOUT_SECONDS: '30',
    },
  },
};