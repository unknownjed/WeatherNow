import { articleImage } from '../src/lib/newsFeed.ts';

function decode(value: string) {
  return value.replace(/&(?:amp|quot|apos|#39|#x27|#\d+|#x[\da-f]+);/gi, entity => {
    const named: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&apos;': "'" };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const hex = entity.toLowerCase().startsWith('&#x');
    const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4]) ]));
}

export function extractNewsImages(html: string, pageUrl: string): string[] {
  const candidates: string[] = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attr = attributes(tag);
    if (/^(og:image(?::url|:secure_url)?|twitter:image(?::src)?)$/i.test(attr.property || attr.name || '')) {
      if (attr.content) candidates.push(attr.content);
    }
  }
  const collectImage = (image: any) => {
    if (typeof image === 'string') candidates.push(image);
    else if (Array.isArray(image)) image.forEach(collectImage);
    else if (image && typeof image === 'object') collectImage(image.url || image.contentUrl);
  };
  const visit = (value: any) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    if (/Article|NewsArticle|Report|BlogPosting/i.test(String(value['@type']))) collectImage(value.image);
    if (value['@graph']) visit(value['@graph']);
    if (value.mainEntity) visit(value.mainEntity);
  };
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(match[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    try { visit(JSON.parse(match[2])); } catch { /* Invalid publisher metadata. */ }
  }
  // Only use inline fallbacks from the article body, not site header logos.
  // Inquirer and Manila Times commonly lazy-load lead images through data-*
  // attributes or <picture><source srcset> rather than a plain img[src].
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  const firstSrcsetUrl = (value?: string) => value?.split(',')[0]?.trim().split(/\s+/)[0];
  for (const tag of article.match(/<(?:img|source)\b[^>]*>/gi) || []) {
    const attr = attributes(tag);
    const candidate = attr['data-lazy-src'] || attr['data-original'] || attr['data-src'] ||
      attr['data-orig-file'] || attr['data-large-file'] || attr['data-image'] ||
      firstSrcsetUrl(attr['data-srcset']) || firstSrcsetUrl(attr.srcset) || attr.src;
    if (candidate) candidates.push(candidate);
  }
  return [...new Set(candidates.map(value => {
    try { return articleImage(new URL(decode(value), pageUrl).href); } catch { return undefined; }
  }).filter((url): url is string => Boolean(url)))].slice(0, 8);
}
