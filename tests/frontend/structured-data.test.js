import fs from 'node:fs';
import path from 'node:path';
import { DIST, PUBLIC_ROUTES } from '../helpers/paths.js';
import { graphNode, graphTypes, jsonLdData, jsonLdBlocks, normalizeText } from '../helpers/html.js';
import { HOME_FAQS, HOW_IT_WORKS, PRODUCT_SUMMARY } from '../../frontend/src/content/landing.js';

const SITE_URL = 'https://fazaldataconverter.com';
const pages = {};

beforeAll(() => {
  for (const entry of PUBLIC_ROUTES) {
    pages[entry.route] = fs.readFileSync(path.join(DIST, entry.file), 'utf8');
  }
});

describe('JSON-LD validity', () => {
  it('embeds one parseable schema.org graph per public page', () => {
    for (const entry of PUBLIC_ROUTES) {
      const blocks = jsonLdBlocks(pages[entry.route]);
      expect(blocks, entry.route).toHaveLength(1);

      const [document] = jsonLdData(pages[entry.route]);
      expect(document['@context']).toBe('https://schema.org');
      expect(Array.isArray(document['@graph'])).toBe(true);
    }
  });

  it('never emits duplicate @ids or relative entity references', () => {
    for (const entry of PUBLIC_ROUTES) {
      const [document] = jsonLdData(pages[entry.route]);
      const ids = document['@graph'].map((node) => node['@id']).filter(Boolean);

      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id.startsWith(`${SITE_URL}/`)).toBe(true);
    }
  });
});

describe('home graph', () => {
  it('describes the product, site, organisation, FAQ, and how-to', () => {
    const [document] = jsonLdData(pages['/']);
    const types = graphTypes(document);

    for (const type of ['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage', 'HowTo']) {
      expect(types, type).toContain(type);
    }

    const software = graphNode(document, 'SoftwareApplication');
    expect(software.name).toBe('FazalDataConverter');
    expect(software.applicationCategory).toBe('BusinessApplication');
    expect(software.operatingSystem).toBe('Web');
    expect(software.isAccessibleForFree).toBe(true);
    expect(software.description).toBe(PRODUCT_SUMMARY);
    expect(software.featureList.length).toBeGreaterThanOrEqual(5);
  });

  it('keeps FAQ schema in sync with visible content', () => {
    const [document] = jsonLdData(pages['/']);
    const faq = graphNode(document, 'FAQPage');

    expect(faq.mainEntity).toHaveLength(HOME_FAQS.length);
    HOME_FAQS.forEach((item, index) => {
      expect(normalizeText(faq.mainEntity[index].name)).toBe(normalizeText(item.question));
      expect(normalizeText(faq.mainEntity[index].acceptedAnswer.text)).toBe(
        normalizeText(item.answer)
      );
    });
  });

  it('keeps HowTo schema in sync with the visible steps', () => {
    const [document] = jsonLdData(pages['/']);
    const howTo = graphNode(document, 'HowTo');

    expect(howTo.step).toHaveLength(HOW_IT_WORKS.length);
    howTo.step.forEach((step, index) => {
      expect(step['@type']).toBe('HowToStep');
      expect(step.position).toBe(index + 1);
      expect(step.name).toBe(HOW_IT_WORKS[index].name);
      expect(step.text).toBe(HOW_IT_WORKS[index].text);
    });
  });
});

describe('about and converter graphs', () => {
  it('marks the about page as an AboutPage with breadcrumbs', () => {
    const [document] = jsonLdData(pages['/about']);
    const types = graphTypes(document);

    expect(types).toContain('AboutPage');
    expect(types).toContain('BreadcrumbList');

    const about = graphNode(document, 'AboutPage');
    expect(about.url).toBe(`${SITE_URL}/about`);
    expect(about.inLanguage).toBe('en');
    expect(about.isPartOf['@id']).toBe(`${SITE_URL}/#website`);
  });

  it('describes the converter page with its own SoftwareApplication node', () => {
    const [document] = jsonLdData(pages['/converter']);

    expect(graphTypes(document)).toEqual(expect.arrayContaining(['SoftwareApplication', 'BreadcrumbList']));
    const software = graphNode(document, 'SoftwareApplication');
    expect(software.url).toBe(`${SITE_URL}/converter`);
    expect(software.mainEntityOfPage).toBe(`${SITE_URL}/converter`);
    expect(software['@id']).toBe(`${SITE_URL}/converter#software`);
  });

  it('orders breadcrumb items from home to page', () => {
    for (const route of ['/about', '/converter']) {
      const [document] = jsonLdData(pages[route]);
      const breadcrumb = graphNode(document, 'BreadcrumbList');

      expect(breadcrumb.itemListElement).toHaveLength(2);
      expect(breadcrumb.itemListElement[0]).toMatchObject({
        position: 1,
        item: `${SITE_URL}/`,
      });
      expect(breadcrumb.itemListElement[1]).toMatchObject({
        position: 2,
        item: `${SITE_URL}${route}`,
      });
    }
  });
});