import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppProviders, AppShell } from './app/App.jsx';
import { buildHead, getSeo } from './seo/routes.js';

export function renderPage(url) {
  const html = renderToString(
    <AppProviders>
      <StaticRouter location={url}>
        <AppShell />
      </StaticRouter>
    </AppProviders>
  );

  return { html, head: buildHead(getSeo(url)) };
}