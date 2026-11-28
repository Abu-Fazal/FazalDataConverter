const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeHtml(value = '') {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code =
        entity[1].toLowerCase() === 'x'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function normalizeText(value = '') {
  return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

export function attr(tag, name) {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
  if (!match) return null;
  return decodeHtml(match[2] ?? match[3] ?? '');
}

export function titleOf(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? normalizeText(match[1]) : null;
}

export function metaTags(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
}

export function metaContent(html, attribute, key) {
  const tag = metaTags(html).find(
    (candidate) => (attr(candidate, attribute) || '').toLowerCase() === key.toLowerCase()
  );
  return tag ? attr(tag, 'content') : null;
}

export function linkHref(html, rel) {
  const tag = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((candidate) => (attr(candidate, 'rel') || '').toLowerCase() === rel.toLowerCase());
  return tag ? attr(tag, 'href') : null;
}

export function jsonLdBlocks(html) {
  return [...html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )].map((match) => match[1]);
}

export function jsonLdData(html) {
  return jsonLdBlocks(html).map((block) => JSON.parse(block));
}

export function graphTypes(document) {
  const graph = document['@graph'] ? document['@graph'] : [document];
  return graph.map((node) => node['@type']).filter(Boolean);
}

export function graphNode(document, type) {
  const graph = document['@graph'] ? document['@graph'] : [document];
  return graph.find((node) => node['@type'] === type) || null;
}

export function stripTags(html) {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

export function textOf(html) {
  return stripTags(html.replace(/<head[\s\S]*?<\/head>/i, ' '));
}

export function headings(html, level) {
  const matcher = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, 'gi');
  return [...html.matchAll(matcher)].map((match) => stripTags(match[1]));
}

export function tagCount(html, tag) {
  return (html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
}

export function hasVisibleText(html, needle) {
  return textOf(html).toLowerCase().includes(normalizeText(needle).toLowerCase());
}

export function pngSize(buffer) {
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function channel(value) {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}