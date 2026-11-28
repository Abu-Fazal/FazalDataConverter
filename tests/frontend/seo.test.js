import fs from 'node:fs';
import path from 'node:path';
import { DIST, PUBLIC_DIR, PUBLIC_ROUTES } from '../helpers/paths.js';
import {
  attr,
  linkHref,
  metaContent,
  metaTags,
  pngSize,
  textOf,
  titleOf,
} from '../helpers/html.js';

const SITE_URL = 'https://fazaldataconverter.com';
const pages = {};

beforeAll(() => {
  expect(
    fs.existsSync(path.join(DIST, 'index.html')),
    'frontend/dist is missing. Run `npm run build --workspace=frontend` first.'
  ).toBe(true);

  for (const entry of PUBLIC_ROUTES) {
    pages[entry.route] = fs.readFileSync(path.join(DIST, entry.file), 'utf8');
  }
});

describe('prerendered public pages', () => {
  it('ships HTML for every indexable route plus a private SPA shell', () => {
    for (const entry of PUBLIC_ROUTES) {
      expect(fs.existsSync(path.join(DIST, entry.file)), entry.file).toBe(true);
    }
    expect(fs.existsSync(path.join(DIST, 'shell.html'))).toBe(true);
  });

  it('has a unique, descriptive title per route', () => {
    const titles = PUBLIC_ROUTES.map((entry) => titleOf(pages[entry.route]));

    for (const title of titles) {
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThanOrEqual(20);
      expect(title.length).toBeLessThanOrEqual(70);
      expect(title).toContain('FazalDataConverter');
    }
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('provides unique meta descriptions within SEO limits', () => {
    const descriptions = PUBLIC_ROUTES.map((entry) =>
      metaContent(pages[entry.route], 'name', 'description')
    );

    for (const description of descriptions) {
      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThanOrEqual(80);
      expect(description.length).toBeLessThanOrEqual(220);
    }
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('exposes exactly one canonical link per page', () => {
    for (const entry of PUBLIC_ROUTES) {
      const matches = [
        ...pages[entry.route].matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi),
      ];
      expect(matches).toHaveLength(1);
      expect(linkHref(pages[entry.route], 'canonical')).toBe(`${SITE_URL}${entry.route}`);
    }
  });

  it('sets index/follow robots for public routes and noindex for the shell', () => {
    for (const entry of PUBLIC_ROUTES) {
      expect(metaContent(pages[entry.route], 'name', 'robots')).toMatch(/index, follow/);
    }

    const shell = fs.readFileSync(path.join(DIST, 'shell.html'), 'utf8');
    expect(metaContent(shell, 'name', 'robots')).toBe('noindex, nofollow');
    expect(shell).not.toContain('app-html');
  });

  it('has one description meta tag per page', () => {
    for (const entry of PUBLIC_ROUTES) {
      const descriptions = metaTags(pages[entry.route]).filter(
        (tag) => (attr(tag, 'name') || '').toLowerCase() === 'description'
      );
      expect(descriptions).toHaveLength(1);
    }
  });
});

describe('social metadata', () => {
  it('provides Open Graph and Twitter card tags per page', () => {
    for (const entry of PUBLIC_ROUTES) {
      const html = pages[entry.route];
      const title = titleOf(html);

      expect(metaContent(html, 'property', 'og:type')).toBeTruthy();
      expect(metaContent(html, 'property', 'og:site_name')).toBe('FazalDataConverter');
      expect(metaContent(html, 'property', 'og:title')).toBe(title);
      expect(metaContent(html, 'property', 'og:description')).toBeTruthy();
      expect(metaContent(html, 'property', 'og:url')).toBe(`${SITE_URL}${entry.route}`);
      expect(metaContent(html, 'property', 'og:image')).toBe(`${SITE_URL}/og-cover.png`);
      expect(metaContent(html, 'property', 'og:image:alt')).toBeTruthy();
      expect(metaContent(html, 'name', 'twitter:card')).toBe('summary_large_image');
      expect(metaContent(html, 'name', 'twitter:title')).toBe(title);
      expect(metaContent(html, 'name', 'twitter:image')).toBe(`${SITE_URL}/og-cover.png`);
    }
  });

  it('ships a correctly sized social image', () => {
    const size = pngSize(fs.readFileSync(path.join(DIST, 'og-cover.png')));
    expect(size).toEqual({ width: 1792, height: 1024 });
  });
});

describe('crawl assets', () => {
  it('keeps private application routes out of robots.txt', () => {
    const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');

    expect(robots).toMatch(/User-agent:\s*\*/i);
    expect(robots).toMatch(/Allow:\s*\//);
    for (const privatePath of ['/admin', '/account', '/history', '/login', '/converter/progress', '/converter/error']) {
      expect(robots).toContain(`Disallow: ${privatePath}`);
    }
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it('lists exactly the prerendered public routes in sitemap.xml', () => {
    const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

    expect(locations.sort()).toEqual(
      PUBLIC_ROUTES.map((entry) => `${SITE_URL}${entry.route}`).sort()
    );
    for (const match of sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
      expect(match[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('declares a valid web manifest with brand theming', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));

    expect(manifest.name).toBe('FazalDataConverter');
    expect(manifest.short_name).toBe('FazalDataConverter');
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.theme_color.toLowerCase()).toBe('#5145e5');
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(DIST, manifest.icons[0].src.replace(/^\//, '')))).toBe(true);
  });

  it('keeps source static assets in sync with the build output', () => {
    for (const file of ['robots.txt', 'sitemap.xml', 'llms.txt', 'manifest.json', 'logo.svg', 'og-cover.png']) {
      expect(fs.existsSync(path.join(PUBLIC_DIR, file))).toBe(true);
      expect(fs.existsSync(path.join(DIST, file))).toBe(true);
    }
  });
});

describe('document basics', () => {
  it('declares the English language, charset, and responsive viewport', () => {
    for (const entry of PUBLIC_ROUTES) {
      const html = pages[entry.route];
      expect(html).toMatch(/<html[^>]+lang=["']en["']/i);
      expect(html).toMatch(/<meta[^>]+charset=["']UTF-8["']/i);
      expect(metaContent(html, 'name', 'viewport')).toContain('width=device-width');
    }
  });

  it('renders submit-ready content without JavaScript', () => {
    for (const entry of PUBLIC_ROUTES) {
      const text = textOf(pages[entry.route]);
      expect(text.length).toBeGreaterThan(1000);
      expect(text).toContain('FazalDataConverter');
      expect(pages[entry.route]).toMatch(/<main\b/i);
    }
  });
});