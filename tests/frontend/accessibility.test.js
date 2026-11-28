import fs from 'node:fs';
import path from 'node:path';
import { DIST, PUBLIC_ROUTES } from '../helpers/paths.js';
import { headings, textOf, tagCount } from '../helpers/html.js';
import { readFrontendFile, relativeSourcePath, sourceFiles } from '../helpers/source.js';
import { contrastRatio } from '../helpers/html.js';

const tokens = {};
const pages = {};
const sources = [];

beforeAll(() => {
  const tokenCss = readFrontendFile('src/styles/tokens.css');
  for (const match of tokenCss.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)) {
    tokens[match[1]] = match[2];
  }

  for (const entry of PUBLIC_ROUTES) {
    pages[entry.route] = fs.readFileSync(path.join(DIST, entry.file), 'utf8');
  }

  for (const file of sourceFiles('src')) {
    sources.push({ path: relativeSourcePath(file), content: fs.readFileSync(file, 'utf8') });
  }
});

describe('prerendered accessibility landmarks', () => {
  it('provides one h1, one main landmark, and a skip link per public page', () => {
    for (const entry of PUBLIC_ROUTES) {
      const html = pages[entry.route];

      expect(headings(html, 1), `${entry.route} h1`).toHaveLength(1);
      expect(tagCount(html, 'main'), `${entry.route} main`).toBe(1);
      expect(html).toMatch(/id=["']main-content["']/);
      expect(html).toMatch(/href=["']#main-content["']/);
      expect(textOf(html)).toContain('Skip to main content');
    }
  });

  it('labels the primary navigation and exposes the mobile menu state', () => {
    const home = pages['/'];

    expect(home).toMatch(/<nav[^>]+aria-label=["']Main navigation["']/i);
    expect(home).toMatch(/aria-expanded=["']false["']/);
    expect(home).toMatch(/aria-controls=["']mobile-menu["']/);
    expect(home).toMatch(/<footer\b/i);
  });

  it('keeps decorative iconography hidden from assistive technology', () => {
    const icons = sources.filter((file) => file.content.includes('lucide-react'));
    expect(icons.length).toBeGreaterThan(0);

    const svgCount = sources.reduce(
      (sum, file) => sum + (file.content.match(/<(svg|[A-Z][A-Za-z0-9]+)\b[^>]*aria-hidden/g) || []).length,
      0
    );
    expect(svgCount).toBeGreaterThan(20);
  });
});

describe('source-level accessibility contracts', () => {
  it('keeps every image alt-attributed (empty alt for decorative images)', () => {
    for (const file of sources) {
      for (const match of file.content.matchAll(/<img\b[\s\S]*?\/?>/g)) {
        expect(match[0], `${file.path} image`).toMatch(/\balt\s*=/);
      }
    }
  });

  it('never uses a positive tabindex', () => {
    for (const file of sources) {
      expect(file.content, file.path).not.toMatch(/tabIndex\s*=\s*\{?\s*["']?[1-9]/);
    }
  });

  it('gives every Radix dialog an accessible title', () => {
    const dialogFiles = sources.filter(
      (file) => file.content.includes('<DialogContent') && !file.path.endsWith('ui/dialog.jsx')
    );
    expect(dialogFiles.length).toBeGreaterThanOrEqual(4);

    for (const file of dialogFiles) {
      expect(file.content, file.path).toContain('DialogTitle');
      expect(file.content, file.path).toMatch(/<DialogTitle/);
    }
  });

  it('exposes progress with the full ARIA progressbar contract', () => {
    const progress = readFrontendFile('src/components/ui/progress.jsx');

    expect(progress).toContain('role="progressbar"');
    expect(progress).toContain('aria-valuemin');
    expect(progress).toContain('aria-valuemax');
    expect(progress).toContain('aria-valuenow');
    expect(progress).toContain('aria-label');
  });

  it('labels form controls in the sign-in and converter flows', () => {
    const login = readFrontendFile('src/components/auth/LoginPage.jsx');
    expect(login).toMatch(/<label[^>]+htmlFor=["']admin-email["']/);
    expect(login).toMatch(/<label[^>]+htmlFor=["']admin-password["']/);
    expect(login).toMatch(/aria-label=["']Sign in mode["']/);

    const loginDialog = readFrontendFile('src/components/auth/AuthLayout.jsx');
    expect(loginDialog).toMatch(/<h1/);
  });

  it('provides visible focus styles and honours reduced motion', () => {
    const css = readFrontendFile('src/index.css');

    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
  });

  it('marks external links safe whenever they open a new tab', () => {
    for (const file of sources) {
      for (const match of file.content.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/g)) {
        expect(match[0], file.path).toMatch(/rel=["'][^"']*noopener/);
      }
    }
  });
});

describe('design-token contrast (WCAG)', () => {
  it('meets AA 4.5:1 for essential body and status text', () => {
    const pairs = [
      ['text-primary', 'surface-primary'],
      ['text-primary', 'surface-app'],
      ['text-secondary', 'surface-primary'],
      ['text-secondary', 'surface-app'],
      ['text-link', 'surface-primary'],
      ['text-brand', 'surface-primary'],
      ['text-inverse', 'surface-inverse'],
      ['error-text', 'error-bg'],
      ['success-text', 'success-bg'],
      ['warning-text', 'warning-bg'],
      ['info-text', 'info-bg'],
      ['processing-text', 'processing-bg'],
      ['neutral-text', 'neutral-bg'],
    ];

    for (const [foreground, background] of pairs) {
      expect(tokens[foreground], foreground).toBeTruthy();
      expect(tokens[background], background).toBeTruthy();
      expect(
        contrastRatio(tokens[foreground], tokens[background]),
        `${foreground} on ${background}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the PRD supporting-text token at AA large / UI contrast', () => {
    // PRD §10.5 and TRD §5 pin --color-text-muted to #85869B (3.57:1 on white).
    // The token is used for supporting text and icons, so the UI threshold is
    // enforced here; the 4.5:1 normal-text target is recorded in STATE.md as a
    // palette conflict for design sign-off.
    expect(tokens['text-muted'].toLowerCase()).toBe('#85869b');
    expect(contrastRatio(tokens['text-muted'], tokens['surface-primary'])).toBeGreaterThanOrEqual(3);
  });

  it('meets 3:1 for focus and input boundaries', () => {
    expect(
      contrastRatio(tokens['input-border-focus'], tokens['surface-primary'])
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(tokens['text-link'], tokens['surface-primary'])
    ).toBeGreaterThanOrEqual(3);
  });
});