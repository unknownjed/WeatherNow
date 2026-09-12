import { useTranslation } from '../lib/i18n';
import { apiUrl } from '../lib/apiUrl';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ExternalLink, RefreshCw, Newspaper } from 'lucide-react';
import { format } from 'date-fns';
import { withNewsImages, failNewsImage, fetchNewsJson, normalizeNews, type NewsItem } from '../lib/newsFeed';
export type { NewsItem } from '../lib/newsFeed';

const newsCache = new Map<string, { news: NewsItem[]; savedAt: number }>();

const NewsItemCard: React.FC<{ item: NewsItem; onError: (link: string, image: string) => void }> = ({ item, onError }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => setImgLoaded(false), [item.imgUrl]);

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
            src={apiUrl(`/api/news-image?url=${encodeURIComponent(item.imgUrl)}&ref=${encodeURIComponent(item.link)}`)} 
            alt={item.title}
            className={`absolute inset-0 z-10 block h-full w-full object-cover object-center transition-opacity duration-150 ease-out ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget;
              // A failed preview must never remove the article itself.
              if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
                onError(item.link, item.imgUrl!);
                return;
              }
              setImgLoaded(true);
            }}
            onError={() => {
              onError(item.link, item.imgUrl!);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const displayCountry = country?.replace(/\s*\(\s*the\s*\)\s*/i, '');
  const cacheKey = `${locationName || ''}|${displayCountry || ''}`;

  const fetchNews = useCallback(async (force = false) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const signal = controller.signal;
    const cached = newsCache.get(cacheKey);
    const validCache = cached && Date.now() - cached.savedAt < 30 * 60 * 1000;
    let visibleNews: NewsItem[] = validCache ? cached.news : [];
    const publish = (items: NewsItem[]) => {
      if (signal.aborted) return;
      visibleNews = items;
      setNews(items);
      if (items.length) {
        newsCache.set(cacheKey, { news: items, savedAt: Date.now() });
        if (newsCache.size > 12) newsCache.delete(newsCache.keys().next().value!);
      }
    };
    setError(null);
    setNews(visibleNews);
    setLoading(force || !validCache);
    try {
      if (force || !validCache) {
        const city = locationName || displayCountry || 'Weather';
        const region = displayCountry || city;
        const queries = Array.from(new Set([
          ...['local news', 'latest news', 'today', 'weather', 'community', 'public safety'].map(topic => `${city} ${topic}`),
          ...['breaking news', 'latest updates', 'politics', 'business', 'economy', 'technology', 'health', 'sports', 'environment', 'transport', 'education', 'science', 'culture', 'entertainment', 'travel', 'agriculture', 'regional news'].map(topic => `${region} ${topic}`),
        ]));
        const results = await Promise.allSettled(queries.map(query => {
          const url = `https://www.bing.com/news/search?q=${encodeURIComponent(`${query} -site:msn.com`)}&format=rss`;
          return fetchNewsJson(apiUrl(`/api/rss?url=${encodeURIComponent(url)}`), signal);
        }));
        if (signal.aborted) return;
        const feeds = results.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value?.items) ? [result.value] : []);
        if (!feeds.length) throw new Error('News is temporarily unavailable. Check your connection and try again.');
        const freshNews = normalizeNews(feeds);
        if (!freshNews.length && cached?.news.length) {
          publish(cached.news.filter(item => Date.parse(item.pubDate) >= Date.now() - 7 * 86400000));
          setError('No fresh stories returned. Showing the previously loaded feed; try Refresh Feed.');
        } else {
          publish(freshNews);
        }
      }
      // Show stories before requesting images. Missing/blocked images no longer
      // discard news or keep the whole tab behind a spinner.
      setLoading(false);
      const pending = visibleNews.filter(item => !item.previewResolved);
      let cursor = 0;
      await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
        while (cursor < pending.length && !signal.aborted) {
          const item = pending[cursor++];
          let images: unknown[] = [];
          let resolved = false;
          try {
            const preview = await fetchNewsJson(apiUrl(`/api/link-preview?url=${encodeURIComponent(item.link)}`), signal);
            images = Array.isArray(preview?.images) ? preview.images : [preview?.image];
            resolved = !preview?.retryable;
          } catch { /* Keep the RSS preview or a neutral placeholder. */ }
          if (signal.aborted) return;
          publish((newsCache.get(cacheKey)?.news || visibleNews).map(current => current.link === item.link
            ? { ...withNewsImages(current, images), previewResolved: resolved } : current));
        }
      }));
    } catch (failure) {
      if (!signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load news. Try again.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [cacheKey, locationName, displayCountry]);

  useEffect(() => {
    void fetchNews();
    return () => requestRef.current?.abort();
  }, [fetchNews]);

  const handleItemImageError = useCallback((failedLink: string, image: string) => {
    setNews(current => {
      const updated = current.map(item => item.link === failedLink ? failNewsImage(item, image) : item);
      const cached = newsCache.get(cacheKey);
      if (cached) newsCache.set(cacheKey, { ...cached, news: updated });
      return updated;
    });
  }, [cacheKey]);

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
          {error && <p role="status" className="mb-4 text-sm text-sky-900 dark:text-slate-300">{error}</p>}
          {loading && news.length === 0 ? (
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
