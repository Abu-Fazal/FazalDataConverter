import fs from 'node:fs';
import path from 'node:path';
import { FRONTEND } from './paths.js';

export function readFrontendFile(relativePath) {
  return fs.readFileSync(path.join(FRONTEND, relativePath), 'utf8');
}

export function sourceFiles(directory = 'src') {
  const root = path.join(FRONTEND, directory);
  const files = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.(jsx?|tsx?)$/.test(entry.name) && !entry.name.endsWith('.test.js')) files.push(target);
    }
  }

  walk(root);
  return files;
}

export function relativeSourcePath(file) {
  return path.relative(FRONTEND, file).split(path.sep).join('/');
}