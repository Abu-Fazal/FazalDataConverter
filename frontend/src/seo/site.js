const FALLBACK_SITE_URL = 'https://fazaldataconverter.com';

export const SITE_NAME = 'FazalDataConverter';
export const SITE_URL = (import.meta.env?.VITE_SITE_URL || FALLBACK_SITE_URL).replace(/\/+$/, '');
export const OG_IMAGE_PATH = '/og-cover.png';
export const OG_IMAGE_ALT =
  'FazalDataConverter — secure Excel to JSON and JSON to Excel converter';