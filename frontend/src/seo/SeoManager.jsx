import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildHead, getSeo } from './routes.js';

function applyHead(tags) {
  const head = document.head;
  head.querySelectorAll('[data-seo="true"]').forEach((node) => node.remove());

  for (const item of tags) {
    if (item.tag === 'title') {
      const title = document.createElement('title');
      title.dataset.seo = 'true';
      title.textContent = item.text;
      head.appendChild(title);
      continue;
    }

    const element = document.createElement(item.tag);
    element.dataset.seo = 'true';
    for (const [name, value] of Object.entries(item.attrs)) {
      element.setAttribute(name, value);
    }
    if (item.json) element.textContent = JSON.stringify(item.json);
    head.appendChild(element);
  }
}

export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyHead(buildHead(getSeo(pathname)));
  }, [pathname]);

  return null;
}