import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const FRONTEND = path.join(ROOT, 'frontend');
export const BACKEND = path.join(ROOT, 'backend');
export const DIST = path.join(FRONTEND, 'dist');
export const PUBLIC_DIR = path.join(FRONTEND, 'public');
export const TESTS = path.join(ROOT, 'tests');

export const PUBLIC_ROUTES = [
  { route: '/', file: 'index.html' },
  { route: '/about', file: 'about/index.html' },
  { route: '/converter', file: 'converter/index.html' },
];