import { useTranslation } from '../lib/i18n';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ExternalLink, RefreshCw, Newspaper } from 'lucide-react';
import { format } from 'date-fns';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  content?: string;
  description?: string;
  source?: string;
  thumbnail?: string;
  imgUrl?: string;
  imageFailed?: boolean;
}

const newsCache = new Map<string, { news: NewsItem[]; newsPool: NewsItem[] }>();
const TARGET_NEWS_TILES = 24;
const PREVIEW_CANDIDATE_LIMIT = 180;

function getHighResImgUrl(url: string | null): string | null {
  if (!url) return null;

  // Filter out tracking pixels, icons, and placeholder gifs
  if (url.includes('pixel.gif') || url.includes('spacer.gif') || url.includes('favicon') || url.endsWith('.ico')) {
    return null;
  }

  // 1. BBC: Upgrade BBC thumbnails from small pixel sizes (128/160/240/320/480/624) to 976px/1024px+
  if (url.includes('ichef.bbci.co.uk')) {
    return url.replace(/\/(128|160|240|320|480|624)\//g, '/976/');
  }
  
  // 2. Bing News: Upgrade Bing thumbnails to high-res crystal clear (800x450, high quality, 2x DPR)
  if (url.includes('bing.com/th') || url.includes('bing.net/th') || url.includes('th.bing.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', '800');
      parsed.searchParams.delete('h');
      parsed.searchParams.delete('c');
      parsed.searchParams.set('rs', '2');
      parsed.searchParams.set('qlt', '95');
      parsed.searchParams.set('dpr', '2');
      return parsed.toString();
    } catch {
      return url
        .replace(/([?&])w=\d+/g, '$1w=800')
        .replace(/([?&])h=\d+/g, '')
        .replace(/([?&])c=\d+/g, '')
        .replace(/([?&])qlt=\d+/g, '$1qlt=95');
    }
  }

  // 3. Phys.org & ScienceX CDN: Upgrade /tmb/ (90x90) and /mid/ to /800/
  if (url.includes('b-cdn.net') || url.includes('phys.org') || url.includes('sciencex.com')) {
    return url.replace(/\/tmb\//g, '/800/').replace(/\/mid\//g, '/800/');
  }

  // 4. The Guardian: Bypass signed small thumbnails by requesting the master photo
  if (url.includes('guim.co.uk')) {
    if (url.includes('i.guim.co.uk/img/media/')) {
      return url.replace('https://i.guim.co.uk/img/media/', 'https://media.guim.co.uk/').split('?')[0];
    }
    return url.replace(/\/(140|500)\.jpg/g, '/1000.jpg');
  }

  // 5. NASA Earth Observatory: Upgrade thumbnail to high resolution
  if (url.includes('earthobservatory.nasa.gov')) {
    return url.replace(/_th\.(jpg|png|jpeg)/gi, '_lrg.$1');
  }

  // 6. New York Times: Upgrade NYTimes thumbnails to large dimensions
  if (url.includes('nyt.com') || url.includes('static01.nyt.com')) {
    return url
      .replace(/thumbStandard/g, 'threeByTwoMediumAt2X')
      .replace(/thumbLarge/g, 'threeByTwoMediumAt2X')
      .replace(/mediumThreeByTwo210/g, 'threeByTwoMediumAt2X')
      .replace(/mediumThreeByTwo440/g, 'threeByTwoMediumAt2X')
      .replace(/mediumSquareAt3X-v\d+/g, 'threeByTwoMediumAt2X')
      .replace(/square320/g, 'square640');
  }

  // 7. Yahoo News & Resizer: Upgrade Yahoo image previews to 800px+
  if (url.includes('yimg.com')) {
    if (url.includes('/resizer/')) {
      return url;
    }
    return url.replace(/([?&])w=\d+/g, '$1w=800').replace(/([?&])h=\d+/g, '');
  }

  // 8. CNN: Upgrade CNN Cloudinary CDN URLs to high resolution
  if (url.includes('cnn.com') || url.includes('turner.com')) {
    return url.replace(/w_\d+/g, 'w_800').replace(/h_\d+,?/g, '').replace(/c_fill/g, 'c_fit,q_auto:best');
  }

  // 9. Deutsche Welle: Upgrade thumbnail to HD
  if (url.includes('static.dw.com')) {
    return url.replace(/_(303|101|202)\.(jpg|jpeg|png)/g, '_906.$2');
  }

  // 10. Euronews: Upgrade thumbnail to HD
  if (url.includes('static.euronews.com')) {
    return url;
  }

  // 11. Wikimedia / Wikipedia: Upgrade thumbnails from small px to 800px
  if (url.includes('upload.wikimedia.org') && url.includes('/thumb/')) {
    return url.replace(/\/([0-9]+)px-/g, '/800px-');
  }

  // 12. WordPress / Jetpack: Upgrade downscaled images
  if (url.includes('i0.wp.com') || url.includes('i1.wp.com') || url.includes('i2.wp.com')) {
    return url.replace(/(\?|&)w=\d+/g, '$1w=800').replace(/(\?|&)fit=\d+,\d+/g, '').replace(/(\?|&)resize=\d+,\d+/g, '');
  }

  // 13. Reuters & Washington Post & Arc Publishing / CloudFront
  if (url.includes('cloudfront.net') || url.includes('arcpublishing.com')) {
    return url
      .replace(/width=\d+/g, 'width=800')
      .replace(/quality=\d+/g, 'quality=90')
      .replace(/w=\d+/g, 'w=800');
  }

  // 14. Cloudflare CDN Images (/cdn-cgi/image/...)
  if (url.includes('/cdn-cgi/image/')) {
    return url.replace(/width=\d+/g, 'width=800').replace(/quality=\d+/g, 'quality=90');
  }

  // 15. Generic query parameters for width, maxwidth, resize, or size
  try {
    const urlObj = new URL(url);
    let changed = false;
    ['width', 'w', 'maxwidth', 'maxWidth', 'sz'].forEach(param => {
      if (urlObj.searchParams.has(param)) {
        const val = parseInt(urlObj.searchParams.get(param) || '0', 10);
        if (val > 0 && val < 600) {
          urlObj.searchParams.set(param, '800');
          changed = true;
        }
      }
    });
    ['quality', 'q', 'qlt'].forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '90');
        changed = true;
      }
    });
    if (changed) {
      return urlObj.toString();
    }
  } catch {}

  return url;
}

function extractImageFromHtml(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function isUsableArticlePreview(url: string | null): url is string {
  if (!url || !url.startsWith('http')) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.includes('gstatic.com') || host.includes('googleusercontent.com')) return false;
    if (/\b(logo|favicon|site-icon|app-icon|avatar|brandmark)\b/.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}

const NewsItemCard: React.FC<{ item: NewsItem; onError: (link: string) => void }> = ({ item, onError }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <a 
      href={item.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="news-item-card bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col group transition-all shadow-sm hover:shadow-indigo-500/10 overflow-hidden h-full"
    >
      <div
        className="w-full aspect-video bg-sky-100 dark:bg-slate-800 overflow-hidden relative flex-shrink-0 border-b border-sky-200 dark:border-slate-800 flex items-center justify-center"
      >
        {!item.imageFailed && item.imgUrl && (
          <img 
            src={item.imgUrl} 
            alt={item.title}
            className={`relative z-10 block w-full h-full object-cover object-center transition-opacity duration-300 ease-out ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget;
              // Anti-blur protection: If the decoded image is under 300px wide or 160px high, reject it and replace with high-res story
              if (img.naturalWidth > 0 && (img.naturalWidth < 300 || img.naturalHeight < 160)) {
                onError(item.link);
                return;
              }
              setImgLoaded(true);
            }}
            onError={() => {
              onError(item.link);
            }}
          />
        )}
        {!imgLoaded && !item.imageFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-sky-100 dark:bg-slate-800 animate-pulse">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {item.imageFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-200 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-sky-800 dark:text-slate-300">
            <Newspaper size={30} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.source || 'Local News'}</span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-start gap-4">
          <h3 className="font-semibold text-sky-950 dark:text-slate-200 line-clamp-3 leading-snug text-base">
            {item.title}
          </h3>
          <div className="bg-sky-200 dark:bg-slate-800 p-1.5 rounded-md group-hover:bg-indigo-500/20 transition-colors flex-shrink-0">
            <ExternalLink size={14} className="text-sky-800 dark:text-slate-400 group-hover:text-indigo-600 dark:text-indigo-400 transition-colors" />
          </div>
        </div>

        {item.contentSnippet && (
           <p className="text-sm text-sky-800 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">{item.contentSnippet}</p>
        )}

        <div className="mt-auto pt-4 flex justify-between items-center text-[10px] sm:text-xs text-sky-800 dark:text-slate-400 font-mono border-t border-sky-200 dark:border-slate-800/50">
          <span className="uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">{item.source || 'Top Story'}</span>
          <span>{item.pubDate ? format(new Date(item.pubDate), 'MMM d, HH:mm') : ''}</span>
        </div>
      </div>
    </a>
  );
}

export function NewsFeed({ locationName, country, language = 'en' }: { locationName?: string, country?: string, language?: string }) {
  const t = useTranslation(language);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsPool, setNewsPool] = useState<NewsItem[]>([]);
  const newsPoolRef = useRef<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Clean up things like "Philippines (the)"
  const displayCountry = country?.replace(/\s*\(\s*the\s*\)\s*/i, '');

  const fetchNews = useCallback(async (force = false) => {
    const cacheKey = `${locationName || ''}|${displayCountry || ''}`;
    const cached = newsCache.get(cacheKey);
    if (!force && cached) {
      setNews(cached.news);
      setNewsPool(cached.newsPool);
      newsPoolRef.current = cached.newsPool;
      setLoading(false);
      return;
    }
    setLoading(true);
    setNews([]);
    setNewsPool([]);
    newsPoolRef.current = [];
    try {
      const locationParts = [locationName, displayCountry].filter(Boolean);
      const topic = Array.from(new Set(locationParts)).join(', ') || 'Weather';
      // Every feed is tied to the currently selected dashboard location. Avoid
      // fixed worldwide feeds, which can crowd local stories out of the grid.
      const cityTopic = locationName || topic;
      const countryTopic = displayCountry || cityTopic;
      const queries = Array.from(new Set([
        `${cityTopic} local news`,
        `${cityTopic} latest news`,
        `${cityTopic} today`,
        `${cityTopic} weather`,
        `${cityTopic} community`,
        `${cityTopic} public safety`,
        `${countryTopic} breaking news`,
        `${countryTopic} latest updates`,
        `${countryTopic} politics`,
        `${countryTopic} business`,
        `${countryTopic} economy`,
        `${countryTopic} technology`,
        `${countryTopic} health`,
        `${countryTopic} sports`,
        `${countryTopic} environment`,
        `${countryTopic} transport`,
        `${countryTopic} education`,
        `${countryTopic} science`,
        `${countryTopic} culture`,
        `${countryTopic} entertainment`,
        `${countryTopic} travel`,
        `${countryTopic} agriculture`,
        `${countryTopic} regional news`,
      ]));
      const urls = queries.map(
        query => `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`
      );

      const promises = urls.map(url => 
         fetch(`/api/rss?url=${encodeURIComponent(url)}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      );
      
      const results = await Promise.allSettled(promises);
      const itemsWithVerifiedImages: NewsItem[] = [];
      const seenTitles = new Set<string>();
      const now = Date.now();
      const freshCutoff = now - 7 * 24 * 60 * 60 * 1000;
      
      const paywalledDomains = [
        'wsj.com', 'bloomberg.com', 'ft.com',
        'thetimes.co.uk', 'theathletic.com', 'theaustralian.com.au', 'barrons.com'
      ];

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value && result.value.items) {
          const data = result.value;
          data.items.forEach((item: any) => {
            const link = item.link || '';
            const isPaywalled = paywalledDomains.some(domain => link.includes(domain));
            const rawPublishedAt = item.isoDate || item.pubDate;
            const publishedAt = rawPublishedAt ? new Date(rawPublishedAt).getTime() : Number.NaN;
            const isFresh = Number.isFinite(publishedAt) && publishedAt >= freshCutoff && publishedAt <= now + 24 * 60 * 60 * 1000;
            
            // Extract guaranteed image URL
            const rawImg = item.thumbnail || (item.enclosure?.link) || (item.enclosure?.url) || extractImageFromHtml(item.content || item.description || '');
            const validImg = getHighResImgUrl(rawImg);

            // Keep location-relevant articles even when the publisher omits an
            // RSS thumbnail. A local app image keeps the grid stable in that case.
            if (item.title && link && isFresh && !seenTitles.has(item.title) && !isPaywalled) {
              seenTitles.add(item.title);
              itemsWithVerifiedImages.push({
                title: item.title,
                link: item.link,
                pubDate: new Date(publishedAt).toISOString(),
                contentSnippet: (item.contentSnippet || item.description || '').replace(/<[^>]*>?/gm, '').slice(0, 160),
                source: item.source || (item.link ? new URL(item.link).hostname.replace(/^www\./, '') : 'News'),
                imgUrl: validImg && validImg.startsWith('http') ? validImg : undefined
              });
            }
          });
        }
      });
      
      itemsWithVerifiedImages.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

      // Prefer the article page's own Open Graph/Twitter preview image. RSS
      // thumbnails are retained only as a fallback when page metadata is absent.
      // Resolve a larger candidate pool so the grid can reliably fill all 24
      // topic tiles even when some publishers block or omit preview images.
      const previewCandidates = itemsWithVerifiedImages.slice(0, PREVIEW_CANDIDATE_LIMIT);
      const verifiedPagePreviewItems: NewsItem[] = [];
      const previewBatchSize = 24;
      for (let offset = 0; offset < previewCandidates.length; offset += previewBatchSize) {
        const batch = previewCandidates.slice(offset, offset + previewBatchSize);
        const resolvedBatch = await Promise.all(batch.map(async (item) => {
          try {
            const response = await fetch(`/api/link-preview?url=${encodeURIComponent(item.link)}`);
            if (response.ok) {
              const preview = await response.json();
              const pageImage = getHighResImgUrl(preview.image || null);
              if (isUsableArticlePreview(pageImage)) return { ...item, imgUrl: pageImage };
            }
          } catch {}
          return item.imgUrl && isUsableArticlePreview(item.imgUrl) ? item : null;
        }));
        verifiedPagePreviewItems.push(...resolvedBatch.filter((item): item is NewsItem => item !== null));
        // Stop once the visible grid and a small replacement reserve are full.
        if (verifiedPagePreviewItems.length >= TARGET_NEWS_TILES + 32) break;
      }

      // Fill the location feed with up to 24 current, unique stories. The reserve
      // pool provides immediate replacements when a publisher image fails.
      const visibleNews = verifiedPagePreviewItems.slice(0, TARGET_NEWS_TILES);
      const reserveNews = verifiedPagePreviewItems.slice(TARGET_NEWS_TILES);
      setNews(visibleNews);
      setNewsPool(reserveNews);
      newsPoolRef.current = reserveNews;
      newsCache.set(cacheKey, {
        news: visibleNews,
        newsPool: reserveNews,
      });
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  }, [locationName, displayCountry]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Seamlessly replace any article whose image fails to load with the next fresh story from the reserve pool
  const handleItemImageError = useCallback((failedLink: string) => {
    const [replacementItem, ...remainingPool] = newsPoolRef.current;
    if (replacementItem) {
      newsPoolRef.current = remainingPool;
      setNewsPool(remainingPool);
    }

    setNews(prevNews => {
      const failedIdx = prevNews.findIndex(n => n.link === failedLink);
      if (failedIdx === -1) return prevNews;

      if (replacementItem) {
        const nextNews = [...prevNews];
        nextNews[failedIdx] = replacementItem;
        return nextNews;
      }

      // Preserve the current, location-relevant story when every reserve image
      // has been exhausted. A neutral news placeholder avoids shrinking the grid.
      return prevNews.map(item => item.link === failedLink ? { ...item, imageFailed: true } : item);
    });
  }, []);

  return (
    <section className="flex-1 relative bg-sky-100 dark:bg-slate-950 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800 flex justify-between items-center bg-sky-50 dark:bg-slate-900 flex-none z-10 shadow-sm sticky top-0" style={{ position: "relative" }}>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-sky-950 dark:text-slate-200 tracking-tight">
              {locationName ? `${t('localNews')}: ${locationName}` : (displayCountry ? `${t('trendingNews')}: ${displayCountry}` : t('topStories'))}
            </h2>
            {locationName && <span className="text-[10px] text-sky-800 dark:text-slate-400 uppercase tracking-widest font-bold">{t('liveUpdates')}</span>}
          </div>
          <button 
            onClick={() => void fetchNews(true)} 
            className="p-2 text-sky-800 dark:text-slate-400 hover:text-white bg-sky-200 dark:bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-sky-300 dark:border-slate-700"
            title="Refresh Feed"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''} />
          </button>
        </div>
        
        <div className="flex-1 p-4 sm:p-6 bg-sky-100 dark:bg-slate-950 relative">
          {loading ? (
            <div className="flex justify-center items-center h-full absolute inset-0">
              <div className="flex flex-col items-center gap-4 text-sky-800 dark:text-slate-400">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono uppercase tracking-widest">Updating Feed...</span>
              </div>
            </div>
          ) : news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <p className="text-sky-900 dark:text-slate-300 font-medium">No stories currently found for this topic.</p>
              <button 
                onClick={() => void fetchNews(true)}
                className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl mx-auto">
              {news.map((item) => (
                <NewsItemCard 
                  key={item.link || item.title} 
                  item={item} 
                  onError={handleItemImageError}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
