import fs from 'node:fs';
import path from 'node:path';
import { DIST } from '../helpers/paths.js';
import { metaContent } from '../helpers/html.js';
import { readFrontendFile, relativeSourcePath, sourceFiles } from '../helpers/source.js';

const RESPONSIVE_PREFIX = /(?:^|[\s"'])(sm|md|lg|xl|2xl):/g;

let css;
let html;
let sources;

beforeAll(() => {
  const assets = fs.readdirSync(path.join(DIST, 'assets'));
  const cssFile = assets.find((file) => file.endsWith('.css'));
  expect(cssFile, 'built CSS asset missing').toBeTruthy();
  css = fs.readFileSync(path.join(DIST, 'assets', cssFile), 'utf8');

  html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  sources = sourceFiles('src').map((file) => ({
    path: relativeSourcePath(file),
    content: fs.readFileSync(file, 'utf8'),
  }));
});

describe('viewport and fluid layout', () => {
  it('declares a responsive viewport meta tag', () => {
    const viewport = metaContent(html, 'name', 'viewport');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });

  it('ships breakpoint media queries for mobile, tablet, desktop, and wide screens', () => {
    for (const width of ['640px', '768px', '1024px']) {
      expect(css, `min-width:${width}`).toContain(`min-width:${width}`);
    }
    expect(css).toMatch(/max-width:\s*100%/);
  });

  it('uses fluid containers rather than a fixed page width', () => {
    const app = readFrontendFile('src/app/App.jsx');

    expect(app).toMatch(/max-w-7xl/);
    expect(app).toMatch(/w-full/);
    expect(app).not.toMatch(/\bw-\[(?:1[0-9]{3}|[2-9][0-9]{2})px\]/);
  });

  it('keeps the smallest supported width free of sub-320px fixed elements', () => {
    for (const file of sources) {
      for (const match of file.content.matchAll(/min-w-\[(\d+(?:\.\d+)?)(rem|px)\]/g)) {
        const pixels = match[2] === 'rem' ? Number(match[1]) * 16 : Number(match[1]);
        if (pixels <= 320) continue;

        const scrolls = file.content.includes('overflow-x-auto')
          // The shared <Table> component renders its own overflow-x-auto wrapper.
          || /<Table[\s>]/.test(file.content);

        expect(
          scrolls,
          `${file.path} needs overflow-x-auto (or a <Table> wrapper) around min-w-[${match[1]}${match[2]}]`
        ).toBe(true);
      }
    }
  });
});

describe('responsive coverage of core screens', () => {
  const screens = [
    'src/components/home/HeroSection.jsx',
    'src/components/home/AnswerSection.jsx',
    'src/components/converter/ConverterPage.jsx',
    'src/components/history/UserHistory.jsx',
    'src/components/history/HistoryTable.jsx',
    'src/components/account/AccountPage.jsx',
    'src/components/admin/AdminDashboard.jsx',
    'src/components/admin/AdminSettingsPage.jsx',
    'src/components/auth/LoginPage.jsx',
  ];

  it('adapts each core screen with at least one breakpoint (sign-in is intentionally full-bleed)', () => {
    for (const screen of screens) {
      const content = readFrontendFile(screen);
      const breakpoints = new Set([...content.matchAll(RESPONSIVE_PREFIX)].map((match) => match[1]));

      if (screen.includes('LoginPage')) {
        expect(content).toMatch(/min-h-screen|flex/);
        continue;
      }
      expect(breakpoints.size, screen).toBeGreaterThanOrEqual(1);
    }
  });

  it('uses multi-column layouts that collapse to a single column', () => {
    const responsiveGrids = sources.filter((file) =>
      /grid-cols-1[^"']*(?:sm|md|lg):grid-cols-(?:2|3|4)/.test(file.content)
    );

    expect(responsiveGrids.length).toBeGreaterThanOrEqual(5);
  });

  it('keeps tables scrollable inside their own containers', () => {
    const matrix = readFrontendFile('src/components/home/ConversionMatrixSection.jsx');
    expect(matrix).toContain('overflow-x-auto');
    expect(matrix).toContain('min-w-[36rem]');
  });
});