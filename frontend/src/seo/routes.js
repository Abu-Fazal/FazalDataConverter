import { HOME_FAQS, HOW_IT_WORKS, PRODUCT_SUMMARY } from '../content/landing.js';
import { OG_IMAGE_ALT, OG_IMAGE_PATH, SITE_NAME, SITE_URL } from './site.js';

const DEFAULT_DESCRIPTION =
  'Convert Excel (.xlsx, .xls, .xlsm) to Normal or Workbook JSON and JSON back to Excel. Files up to 50 MB, verified output, and no macros or scripts executed.';

const organizationId = `${SITE_URL}/#organization`;
const websiteId = `${SITE_URL}/#website`;

const organization = {
  '@type': 'Organization',
  '@id': organizationId,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo.svg`,
};

const softwareApplication = {
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#software`,
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${SITE_URL}/`,
  description: PRODUCT_SUMMARY,
  isAccessibleForFree: true,
  featureList: [
    'Excel (.xlsx, .xls, .xlsm) to Normal Data JSON',
    'Excel to Workbook JSON with metadata and sheet selection',
    'JSON to Excel conversion',
    'Excel to binary BSON conversion',
    'Static JavaScript data extraction without code execution',
    'Verified output for supported data elements',
  ],
  publisher: { '@id': organizationId },
};

const homeFaqPage = {
  '@type': 'FAQPage',
  '@id': `${SITE_URL}/#faq`,
  mainEntity: HOME_FAQS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

const homeHowTo = {
  '@type': 'HowTo',
  '@id': `${SITE_URL}/#how-to-convert`,
  name: 'How to convert Excel to JSON or JSON to Excel',
  description:
    'Convert a supported workbook or JSON file with FazalDataConverter in three steps, with or without an account.',
  totalTime: 'PT1M',
  step: HOW_IT_WORKS.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: step.text,
  })),
};

const ROUTES = {
  '/': {
    title: 'Excel to JSON & JSON to Excel Converter | FazalDataConverter',
    description: DEFAULT_DESCRIPTION,
    robots: 'index, follow, max-image-preview:large',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [organization, websiteIdConfig(), softwareApplication, homeFaqPage, homeHowTo],
    },
  },
  '/about': {
    title: 'About FazalDataConverter — Verified Excel & JSON Conversion',
    description:
      'Learn how FazalDataConverter verifies supported Excel and JSON data, enforces a 50 MB limit, keeps files private per account, and never executes macros or scripts.',
    robots: 'index, follow, max-image-preview:large',
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        {
          '@type': 'AboutPage',
          '@id': `${SITE_URL}/about#page`,
          url: `${SITE_URL}/about`,
          name: 'About FazalDataConverter',
          description:
            'Product specifications, verification coverage, privacy, and security rules for FazalDataConverter.',
          isPartOf: { '@id': websiteId },
          about: { '@id': organizationId },
          inLanguage: 'en',
        },
        breadcrumbFor('/about', 'About'),
      ],
    },
  },
  '/converter': {
    title: 'Excel ↔ JSON Converter — Secure Upload | FazalDataConverter',
    description:
      'Convert Excel to Normal or Workbook JSON and JSON to Excel in the browser. Supports .xlsx, .xls, .xlsm, BSON, and static JavaScript data up to 50 MB per file.',
    robots: 'index, follow, max-image-preview:large',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        {
          ...softwareApplication,
          '@id': `${SITE_URL}/converter#software`,
          url: `${SITE_URL}/converter`,
          mainEntityOfPage: `${SITE_URL}/converter`,
        },
        breadcrumbFor('/converter', 'Converter'),
      ],
    },
  },
};

function websiteIdConfig() {
  return {
    '@type': 'WebSite',
    '@id': websiteId,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en',
    publisher: { '@id': organizationId },
  };
}

function breadcrumbFor(pathname, label) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${SITE_URL}${pathname}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: label,
        item: `${SITE_URL}${pathname}`,
      },
    ],
  };
}

const PRIVATE_PAGE = {
  title: `${SITE_NAME} — Secure Excel & JSON Converter`,
  description: DEFAULT_DESCRIPTION,
  robots: 'noindex, nofollow',
  ogType: 'website',
};

export function getSeo(pathname = '/') {
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const route = ROUTES[normalized];
  if (!route) return { ...PRIVATE_PAGE, canonical: null, jsonLd: null };
  return {
    ...route,
    canonical: `${SITE_URL}${normalized === '/' ? '/' : normalized}`,
  };
}

function meta(attribute, value, content) {
  return { tag: 'meta', attrs: { [attribute]: value, content } };
}

export function buildHead(seo) {
  const canonical = seo.canonical || `${SITE_URL}/`;
  const tags = [
    { tag: 'title', text: seo.title },
    meta('name', 'description', seo.description),
    meta('name', 'robots', seo.robots),
  ];

  if (seo.canonical) {
    tags.push({ tag: 'link', attrs: { rel: 'canonical', href: seo.canonical } });
  }

  tags.push(
    meta('property', 'og:type', seo.ogType),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:title', seo.title),
    meta('property', 'og:description', seo.description),
    meta('property', 'og:url', canonical),
    meta('property', 'og:image', `${SITE_URL}${OG_IMAGE_PATH}`),
    meta('property', 'og:image:alt', OG_IMAGE_ALT),
    meta('property', 'og:locale', 'en_US'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', seo.title),
    meta('name', 'twitter:description', seo.description),
    meta('name', 'twitter:image', `${SITE_URL}${OG_IMAGE_PATH}`)
  );

  if (seo.jsonLd) {
    tags.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      json: seo.jsonLd,
    });
  }

  return tags;
}