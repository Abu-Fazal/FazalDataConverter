import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from '../dist-ssr/entry-server.js';

const ROUTES = ['/', '/about', '/converter'];

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const distDir = path.join(frontendRoot, 'dist');
const templatePath = path.join(distDir, 'index.html');

const HEAD_MARKER = '<!--app-head-->';
const HTML_MARKER = '<!--app-html-->';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ESCAPES[character]);
}

function serializeHead(tags) {
  return tags
    .map((item) => {
      const attrs = Object.entries(item.attrs || {})
        .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
        .join(' ');

      if (item.tag === 'title') {
        return `<title data-seo="true">${escapeHtml(item.text)}</title>`;
      }
      if (item.tag === 'script') {
        const json = JSON.stringify(item.json).replace(/</g, '\\u003c');
        return `<script data-seo="true" ${attrs}>${json}</script>`;
      }
      return `<${item.tag} data-seo="true" ${attrs} />`;
    })
    .join('\n    ');
}

const template = await fs.readFile(templatePath, 'utf8');
if (!template.includes(HEAD_MARKER) || !template.includes(HTML_MARKER)) {
  throw new Error('dist/index.html is missing the prerender markers.');
}

// Plain SPA shell for private routes (/login, /admin, ...). Serving this instead
// of the prerendered landing page avoids hydration mismatches, and noindex keeps
// private screens out of search results.
const shell = template
  .replace(
    HEAD_MARKER,
    '<title>FazalDataConverter</title>\n    <meta name="robots" content="noindex, nofollow" />',
  )
  .replace(HTML_MARKER, '');
await fs.writeFile(path.join(distDir, 'shell.html'), shell, 'utf8');
console.log('wrote SPA shell -> dist/shell.html');

for (const route of ROUTES) {
  const { html, head } = renderPage(route);
  const page = template
    .replace(HEAD_MARKER, serializeHead(head))
    .replace(HTML_MARKER, html);

  const outputPath =
    route === '/' ? templatePath : path.join(distDir, route.slice(1), 'index.html');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, page, 'utf8');
  console.log(`prerendered ${route} -> ${path.relative(frontendRoot, outputPath)}`);
}