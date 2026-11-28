import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DIST, PUBLIC_ROUTES } from '../helpers/paths.js';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function gzipSize(buffer) {
  return zlib.gzipSync(buffer, { level: 9 }).length;
}

let files;
let assets;
let html;

beforeAll(() => {
  files = walk(DIST);
  assets = fs.readdirSync(path.join(DIST, 'assets'));
  html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
});

describe('build output budgets', () => {
  it('keeps a single hashed JS and CSS bundle', () => {
    const js = assets.filter((file) => file.endsWith('.js'));
    const css = assets.filter((file) => file.endsWith('.css'));

    expect(js).toHaveLength(1);
    expect(css).toHaveLength(1);
    expect(js[0]).toMatch(/^index-[A-Za-z0-9_-]+\.js$/);
    expect(css[0]).toMatch(/^index-[A-Za-z0-9_-]+\.css$/);
    expect(html).toContain(`/assets/${js[0]}`);
    expect(html).toContain(`/assets/${css[0]}`);
  });

  it('keeps JavaScript and CSS within gzip budgets', () => {
    const jsFile = assets.find((file) => file.endsWith('.js'));
    const cssFile = assets.find((file) => file.endsWith('.css'));
    const jsGzip = gzipSize(fs.readFileSync(path.join(DIST, 'assets', jsFile)));
    const cssGzip = gzipSize(fs.readFileSync(path.join(DIST, 'assets', cssFile)));

    expect(jsGzip).toBeLessThanOrEqual(320 * 1024);
    expect(cssGzip).toBeLessThanOrEqual(20 * 1024);
  });

  it('keeps prerendered HTML light and social assets bounded', () => {
    for (const entry of PUBLIC_ROUTES) {
      const page = fs.readFileSync(path.join(DIST, entry.file));
      expect(gzipSize(page), entry.file).toBeLessThanOrEqual(20 * 1024);
    }

    const og = fs.statSync(path.join(DIST, 'og-cover.png')).size;
    expect(og).toBeLessThanOrEqual(1.2 * 1024 * 1024);

    const total = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
    expect(total).toBeLessThanOrEqual(2.5 * 1024 * 1024);
  });

  it('ships no source maps or stale bundles', () => {
    expect(files.some((file) => file.endsWith('.map'))).toBe(false);
    expect(assets.filter((file) => file.endsWith('.js'))).toHaveLength(1);
  });
});

describe('rendering and font strategy', () => {
  it('delivers meaningful above-the-fold HTML without JavaScript', () => {
    expect(html.length).toBeGreaterThan(10000);
    expect(html).toMatch(/<h1\b/);
    expect(html).not.toMatch(/<div id="root"><\/div>/);
    expect(html).toContain('FazalDataConverter');
  });

  it('loads only Inter and swaps fonts to avoid invisible text', () => {
    expect(html).toContain('family=Inter');
    expect(html).toContain('display=swap');
    expect(html).not.toMatch(/family=(?!Inter)[A-Za-z]/);
    expect(html).toContain('https://fonts.gstatic.com');
    expect(html).toMatch(/rel="preconnect"/);
  });

  it('ships the bundle as a deferred ES module', () => {
    expect(html).toMatch(/<script[^>]+type="module"[^>]+src="\/assets\/index-/);
  });
});