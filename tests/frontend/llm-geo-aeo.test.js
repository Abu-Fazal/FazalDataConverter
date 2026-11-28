import fs from 'node:fs';
import path from 'node:path';
import { DIST } from '../helpers/paths.js';
import { headings, normalizeText, textOf } from '../helpers/html.js';
import {
  CONVERSION_MATRIX,
  DEFINITIONS,
  HOME_FAQS,
  HOW_IT_WORKS,
  PRODUCT_SUMMARY,
} from '../../frontend/src/content/landing.js';

const SITE_URL = 'https://fazaldataconverter.com';
let home;
let about;
let converter;
let llms;
let sitemap;
let robots;

beforeAll(() => {
  home = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  about = fs.readFileSync(path.join(DIST, 'about', 'index.html'), 'utf8');
  converter = fs.readFileSync(path.join(DIST, 'converter', 'index.html'), 'utf8');
  llms = fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf8');
  sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
});

describe('llms.txt (LLM / GEO discovery)', () => {
  it('opens with brand, summary, key facts, and page index', () => {
    expect(llms.startsWith('# FazalDataConverter')).toBe(true);
    expect(llms).toMatch(/\n> .{40,}/);
    expect(llms).toContain('## Key facts');
    expect(llms).toContain('## Pages');
    expect(llms).toContain('## Contact');
  });

  it('states the constrained product facts used by all pages', () => {
    expect(llms).toContain('50 MB');
    expect(llms).toMatch(/10 seconds/);
    expect(llms).toMatch(/60 seconds/);
    expect(llms).toMatch(/never executed/i);
    expect(llms).toMatch(/ownership/i);
    expect(llms).toMatch(/Guests can convert/i);
  });

  it('links every public page on the canonical origin', () => {
    for (const route of ['/', '/converter', '/about']) {
      expect(llms).toContain(`${SITE_URL}${route === '/' ? '/' : route}`);
    }
  });
});

describe('visible answer-engine content (AEO)', () => {
  it('renders every FAQ question as a heading with its answer', () => {
    const levelThree = headings(home, 3);
    const visibleText = textOf(home);

    HOME_FAQS.forEach((item) => {
      expect(levelThree).toContain(normalizeText(item.question));
      expect(visibleText).toContain(normalizeText(item.answer));
    });
  });

  it('renders the product definition and step-by-step instructions', () => {
    const visibleText = textOf(home);

    expect(visibleText).toContain(normalizeText(PRODUCT_SUMMARY));
    HOW_IT_WORKS.forEach((step) => {
      expect(visibleText).toContain(normalizeText(step.name));
      expect(visibleText).toContain(normalizeText(step.text));
    });
    expect(visibleText).toMatch(/How it works/i);
  });

  it('defines key entities with a description list', () => {
    expect(home).toMatch(/<dl\b/);
    const visibleText = textOf(home);

    DEFINITIONS.forEach((item) => {
      expect(home).toMatch(new RegExp(`<dt[^>]*>\\s*${item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</dt>`));
      expect(visibleText).toContain(normalizeText(item.definition));
    });
  });
});

describe('extractable structured content (IEO)', () => {
  it('publishes the conversion matrix as a captioned, scoped table', () => {
    expect(home).toMatch(/<table\b/);
    expect(home).toMatch(/<caption[^>]*>[\s\S]*?<\/caption>/);

    const columns = [...home.matchAll(/<th\b[^>]*scope=["']col["'][^>]*>/gi)];
    expect(columns.length).toBeGreaterThanOrEqual(3);

    const visibleText = textOf(home);
    CONVERSION_MATRIX.forEach((row) => {
      expect(visibleText).toContain(normalizeText(row.from));
      expect(visibleText).toContain(normalizeText(row.to));
      expect(visibleText).toContain(normalizeText(row.notes));
    });
  });

  it('keeps a clean heading hierarchy on the landing page', () => {
    expect(headings(home, 1)).toHaveLength(1);
    expect(headings(home, 2).length).toBeGreaterThanOrEqual(3);
    expect(headings(home, 3).length).toBeGreaterThanOrEqual(HOME_FAQS.length);
  });
});

describe('generative-engine fact consistency (GEO)', () => {
  it('uses one canonical origin across crawl assets', () => {
    expect(sitemap).toContain(`${SITE_URL}/about`);
    expect(robots).toContain(`${SITE_URL}/sitemap.xml`);
    expect(llms).toContain(SITE_URL);
    expect(home).toContain(`${SITE_URL}/#organization`);
  });

  it('repeats the same hard limits across home, about, and llms.txt', () => {
    const homeText = textOf(home);
    const aboutText = textOf(about);

    for (const text of [homeText, aboutText, llms]) {
      expect(text).toMatch(/50 MB/i);
    }
    for (const text of [homeText, aboutText]) {
      expect(text).toMatch(/macros/i);
      expect(text).toMatch(/never executed/i);
    }
    expect(homeText).toMatch(/10 seconds/);
    expect(homeText).toMatch(/60 seconds/);

    expect(aboutText).toMatch(/only its own|private to its owner/i);
    expect(aboutText).toMatch(/temporary processing files/i);
  });

  it('keeps the brand name consistent in every indexable document', () => {
    for (const html of [home, about, converter]) {
      expect(html).toContain('FazalDataConverter');
    }
    expect(about).toMatch(/FazalDataConverter/);
    expect(converter).toMatch(/FazalDataConverter/);
  });

  it('surfaces machine-readable conversion directions on the converter page', () => {
    const visibleText = textOf(converter);

    expect(visibleText).toMatch(/xlsx|excel/i);
    expect(visibleText).toMatch(/json/i);
    expect(visibleText).toMatch(/bson/i);
    expect(converter).toMatch(/application\/ld\+json/);
  });
});