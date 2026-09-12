export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source?: string;
  imgUrl?: string;
  imageFailed?: boolean;
  previewResolved?: boolean;
  imageCandidates?: string[];
  failedImages?: string[];
}

export function articleUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const normalized = value.startsWith('//') ? `https:${value}` : value;
    let url = new URL(normalized);
    if (/(^|\.)bing\.com$/i.test(url.hostname) && url.searchParams.has('url')) {
      url = new URL(url.searchParams.get('url')!);
    }
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function articleImage(value: unknown): string | undefined {
  const link = articleUrl(value);
  if (!link) return;
  const url = new URL(link);
  if (/(^|\.)(gstatic|googleusercontent)\.com$/i.test(url.hostname)
    || /\b(logo|favicon|site-icon|app-icon|avatar|brandmark)\b/i.test(url.pathname)) return;
  // Keep publisher image signatures and sizes intact. Bing's RSS uses HTTP,
  // which must be HTTPS when the dashboard is accessed through Tailscale.
  if (/(^|\.)bing\.(com|net)$/i.test(url.hostname)) {
    url.protocol = 'https:';
    // Bing/MSN RSS thumbnails default to a tiny image. Request the original
    // card aspect at a useful resolution so the browser never has to blur it.
    if (/^\/th$/i.test(url.pathname) && /^News$/i.test(url.searchParams.get('pid') || '')) {
      url.searchParams.set('w', '800');
      url.searchParams.set('h', '450');
      url.searchParams.set('c', '7');
    }
  }
  return url.href;
}

export function normalizeNews(feeds: unknown[], now = Date.now()): NewsItem[] {
  const titles = new Set<string>();
  const links = new Set<string>();
  const items: NewsItem[] = [];
  for (const feed of feeds) {
    if (!feed || !Array.isArray((feed as any).items)) continue;
    for (const raw of (feed as any).items) {
      if (!raw || typeof raw.title !== 'string') continue;
      const link = articleUrl(raw.link);
      const title = raw.title.trim();
      const published = Date.parse(raw.isoDate || raw.pubDate);
      if (!link || !title || !Number.isFinite(published)
        || published < now - 7 * 86400000 || published > now + 86400000) continue;
      const host = new URL(link).hostname.replace(/^www\./, '');
      // MSN is intentionally excluded: its article/image CDN frequently returns
      // expiring or hotlink-blocked preview URLs. Let Bing fill the feed with
      // other publishers whose thumbnails are more reliable.
      if (host === 'msn.com' || host.endsWith('.msn.com')) continue;
      if (['wsj.com', 'bloomberg.com', 'ft.com', 'thetimes.co.uk', 'theathletic.com', 'theaustralian.com.au', 'barrons.com'].some(domain => host === domain || host.endsWith(`.${domain}`))) continue;
      const key = title.toLowerCase();
      if (titles.has(key) || links.has(link)) continue;
      titles.add(key); links.add(link);
      const html = typeof raw.content === 'string' ? raw.content : typeof raw.description === 'string' ? raw.description : '';
      const snippet = typeof raw.contentSnippet === 'string' ? raw.contentSnippet : html;
      const imgUrl = articleImage(raw.thumbnail || raw.enclosure?.url || raw.enclosure?.link || html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]);
      items.push({ title, link, pubDate: new Date(published).toISOString(),
        contentSnippet: snippet.replace(/<[^>]*>/g, '').slice(0, 160),
        source: typeof raw.source === 'string' ? raw.source : typeof raw.source?.title === 'string' ? raw.source.title : host,
        imgUrl, imageFailed: !imgUrl });
    }
  }
  return items.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate)).slice(0, 24);
}

// A page preview must not destroy a working RSS fallback. Never retry the
// same failed URL, including when an older image fires an error after a swap.
export function withNewsImages(item: NewsItem, candidates: unknown[]): NewsItem {
  let msnArticle = false;
  try { msnArticle = /(^|\.)msn\.com$/i.test(new URL(item.link).hostname); } catch { /* Invalid links are filtered earlier. */ }
  const ordered = msnArticle
    ? [item.imgUrl, ...candidates, ...(item.imageCandidates || [])]
    : [...candidates, item.imgUrl, ...(item.imageCandidates || [])];
  const imageCandidates = [...new Set(ordered
    .flatMap(candidate => {
      const normalized = articleImage(candidate);
      if (!normalized) return [];
      try {
        const u = new URL(normalized);
        if (/(^|\.)(msn\.com|akamaized\.net)$/i.test(u.hostname) || /msn/i.test(u.hostname)) {
          const original = u.href;
          // Some MSN CDN variants fail after resize/crop query parameters expire.
          // Keep a clean-source candidate behind the exact URL as a fallback.
          ['w', 'h', 'width', 'height', 'crop', 'q', 'quality'].forEach(key => u.searchParams.delete(key));
          return u.href !== original ? [original, u.href] : [original];
        }
      } catch {}
      return [normalized];
    }).filter((url): url is string => Boolean(url)))];
  const imgUrl = imageCandidates.find(url => !item.failedImages?.includes(url));
  return { ...item, imageCandidates, imgUrl, imageFailed: !imgUrl };
}

export function failNewsImage(item: NewsItem, url: string): NewsItem {
  return withNewsImages({ ...item, failedImages: [...new Set([...(item.failedImages || []), url])] }, []);
}

export async function fetchNewsJson(url: string, signal: AbortSignal, timeoutMs = 9000): Promise<any> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`News request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
