
import 'dotenv/config';
import { extractNewsImages } from './server/newsPreview';
import { searchWeatherCities } from './server/citySearch';
import { getCyclones } from './server/cyclones';
import { getYouTubePlaylistPage } from './server/youtubePlaylists';
import { getPagasaForecast } from './server/pagasaForecast';
import { getPagasaCurrent } from './server/pagasaCurrent';
import { isPhilippineLocation } from './src/lib/forecastSource';
import Parser from 'rss-parser';
import * as https from 'node:https';
import { rootCertificates } from 'node:tls';
const rssParser = new Parser({
  timeout: 4500,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:group', 'mediaGroup'],
      ['enclosure', 'enclosure'],
      ['News:Image', 'newsImage'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

const rssCache = new Map<string, { data: any; timestamp: number }>();
const RSS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache
const youtubeSearchCache = new Map<string, { data: any; timestamp: number }>();
const youtubeRateLimit = new Map<string, { count: number; resetAt: number }>();
const YOUTUBE_CACHE_TTL = 15 * 60 * 1000;
let rainViewerRadarCache: { savedAt: number; data: any } | null = null;
const historicalCache = new Map<string, { savedAt: number; data: any }>();
const reverseGeocodeCache = new Map<string, { savedAt: number; data: any }>();
let pagasaCycloneCache: { savedAt: number; data: any } | null = null;
const linkPreviewDomainFailureCache = new Map<string, number>();
let linkPreviewQueue: Promise<void> = Promise.resolve();
const waitForLinkPreviewTurn = () => {
  let release!: () => void;
  const previous = linkPreviewQueue;
  linkPreviewQueue = new Promise<void>(resolve => { release = resolve; });
  return previous.then(() => release);
};
let mtgEnhancedIrUnavailableUntil = 0;
let pagasaRadarCache: { time: string; sourceUrl: string; contentType: string; bytes: Buffer; savedAt: number } | null = null;
let pagasaTlsChainCache: { savedAt: number; certificates: string[] } | null = null;

async function getPagasaTlsChain() {
  if (pagasaTlsChainCache && Date.now() - pagasaTlsChainCache.savedAt < 24 * 60 * 60_000) return pagasaTlsChainCache.certificates;
  // PAGASA's current image server omits its YR1 intermediates. Complete the
  // chain only from Let's Encrypt's official HTTPS certificate repository;
  // certificate and hostname verification remain enabled.
  const urls = [
    'https://letsencrypt.org/certs/gen-y/int-yr1.pem',
    'https://letsencrypt.org/certs/gen-y/root-yr-by-x1.pem',
  ];
  const certificates = await Promise.all(urls.map(async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const pem = await response.text();
    if (!response.ok || !pem.includes('-----BEGIN CERTIFICATE-----')) throw new Error('Unable to verify PAGASA image certificate chain.');
    return pem;
  }));
  pagasaTlsChainCache = { savedAt: Date.now(), certificates };
  return certificates;
}

async function fetchPagasaRadarBytes(url: URL) {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'image/png,image/*', Referer: 'https://bagong.pagasa.dost.gov.ph/radar', 'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)' },
      signal: AbortSignal.timeout(12_000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { status: response.status, contentType: response.headers.get('content-type') || '', bytes };
  } catch (error: any) {
    if (error?.cause?.code !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') throw error;
  }

  const chain = await getPagasaTlsChain();
  return new Promise<{ status: number; contentType: string; bytes: Buffer }>((resolve, reject) => {
    const request = https.get(url, {
      ca: [...rootCertificates, ...chain],
      headers: { Accept: 'image/png,image/*', Referer: 'https://bagong.pagasa.dost.gov.ph/radar', 'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)' },
    }, response => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', chunk => {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > 20 * 1024 * 1024) request.destroy(new Error('PAGASA radar image is too large.'));
        else chunks.push(bytes);
      });
      response.on('end', () => resolve({
        status: response.statusCode || 0,
        contentType: String(response.headers['content-type'] || ''),
        bytes: Buffer.concat(chunks),
      }));
      response.on('error', reject);
    });
    request.setTimeout(12_000, () => request.destroy(new Error('PAGASA radar image timed out.')));
    request.on('error', reject);
  });
}

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  // Middleware to parse JSON
  app.use(express.json());
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin === 'http://localhost' || origin === 'https://localhost' || origin === 'capacitor://localhost')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const filterMadeForKidsVideos = async (items: any[], apiKey: string) => {
    const ids = [...new Set(
      items
        .map((item: any) => String(item?.videoId || '').trim())
        .filter((id: string) => /^[A-Za-z0-9_-]{6,20}$/.test(id)),
    )];

    if (!ids.length) return items;

    try {
      const params = new URLSearchParams({
        part: 'status',
        id: ids.join(','),
        maxResults: '50',
      });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
        headers: { 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.warn('YouTube made-for-kids status lookup failed:', response.status);
        return items.filter((item: any) => !item?.videoId);
      }

      const payload: any = await response.json();
      const allowed = new Set(
        (payload.items || [])
          .filter((video: any) => video?.status?.madeForKids !== true)
          .map((video: any) => String(video.id)),
      );

      return items.filter((item: any) => !item?.videoId || allowed.has(String(item.videoId)));
    } catch (error) {
      console.warn('YouTube made-for-kids status lookup unavailable:', error instanceof Error ? error.message : error);
      // Fail closed for playable videos in the custom music experience.
      return items.filter((item: any) => !item?.videoId);
    }
  };

  app.get('/api/youtube-search', async (req, res) => {
    const kind = req.query.type === 'playlist' ? 'playlist' : 'video';
    const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken.trim().slice(0, 200) : '';
    if (query.length < 2) return res.status(400).json({ error: 'Enter at least two characters.', items: [] });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'YouTube search is not configured.', items: [] });

    const clientId = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const usage = youtubeRateLimit.get(clientId);
    if (!usage || usage.resetAt <= now) youtubeRateLimit.set(clientId, { count: 1, resetAt: now + 60_000 });
    else if (usage.count >= 12) return res.status(429).json({ error: 'Too many searches. Please wait one minute.', items: [] });
    else usage.count += 1;

    const cacheKey = `${kind}|${query.toLocaleLowerCase()}|${pageToken}`;
    const cached = youtubeSearchCache.get(cacheKey);
    if (cached && now - cached.timestamp < YOUTUBE_CACHE_TTL) return res.json(cached.data);

    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: kind,
        safeSearch: 'moderate',
        maxResults: '25',
      });
      if (kind === 'video') {
        params.set('videoCategoryId', '10');
        params.set('videoEmbeddable', 'true');
      }
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        headers: { 'x-goog-api-key': apiKey },
      });
      const payload = await response.json();
      if (!response.ok) {
        console.error('YouTube search failed:', response.status, payload?.error?.message || 'Unknown API error');
        return res.status(response.status).json({ error: payload?.error?.message || 'YouTube search failed.', items: [] });
      }
      const rawItems = (payload.items || []).map((item: any) => ({
        videoId: item.id?.videoId,
        playlistId: item.id?.playlistId,
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
      })).filter((item: any) => (item.videoId || item.playlistId) && item.title);

      const data = {
        nextPageToken: payload.nextPageToken || null,
        items: kind === 'video'
          ? await filterMadeForKidsVideos(rawItems, apiKey)
          : rawItems,
      };
      youtubeSearchCache.set(cacheKey, { data, timestamp: now });
      return res.json(data);
    } catch (error) {
      console.error('YouTube search proxy error:', error);
      return res.status(502).json({ error: 'Unable to reach YouTube search.', items: [] });
    }
  });

  app.get('/api/youtube-playlist', async (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken.slice(0, 200) : '';
    if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) return res.status(400).json({ error: 'Invalid playlist ID.', items: [] });
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return res.status(503).json({ error: 'YouTube is not configured.', items: [] });
    const now = Date.now();
    const cacheKey = `playlist-items|${id}|${pageToken}`;
    const cached = youtubeSearchCache.get(cacheKey);
    if (cached && now - cached.timestamp < YOUTUBE_CACHE_TTL) return res.json(cached.data);
    const client = req.ip || req.socket.remoteAddress || 'unknown';
    const usage = youtubeRateLimit.get(client);
    if (!usage || usage.resetAt <= now) youtubeRateLimit.set(client, { count: 1, resetAt: now + 60_000 });
    else if (usage.count >= 12) return res.status(429).json({ error: 'Too many requests. Please wait one minute.', items: [] });
    else usage.count++;
    try {
      const data = await getYouTubePlaylistPage(id, pageToken, key);
      const filteredData = {
        ...data,
        items: await filterMadeForKidsVideos(Array.isArray(data?.items) ? data.items : [], key),
      };
      youtubeSearchCache.set(cacheKey, { data: filteredData, timestamp: now });
      res.json(filteredData);
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : 'Playlist unavailable.', items: [] });
    }
  });

  // API Proxy Routes

  app.get('/api/pagasa-forecast', async (req, res) => {
    if (!isPhilippineLocation(String(req.query.country || ''))) return res.status(400).json({ error: 'PAGASA forecasts are only selected for Philippine locations.' });
    const lat = Number(req.query.lat), lon = Number(req.query.lon);
    if (!req.query.lat || !req.query.lon || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return res.status(400).json({ error: 'Invalid coordinates.' });
    try {
      res.setHeader('Cache-Control', 'no-store');
      const tempUnit = req.query.tempUnit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const [daily, current] = await Promise.all([
        getPagasaForecast(lat, lon, tempUnit).catch(() => ({ daily: null, daily_source: { provider: 'PAGASA', available: false } })),
        getPagasaCurrent(lat, lon, tempUnit, req.query.windUnit === 'mph' ? 'mph' : 'kmh').catch(() => ({ current: null, current_source: { provider: 'PAGASA', available: false, note: 'PAGASA station service unavailable.' } })),
      ]);
      res.json({ ...daily, ...current });
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : 'PAGASA forecast unavailable.' });
    }
  });
  
  // 1. Weather Forecast Proxy
  const weatherCache = new Map<string, { savedAt: number; data: any }>();
  const weatherInFlight = new Map<string, Promise<any>>();
  const WEATHER_FRESH_CACHE_MS = 90_000;

  app.get("/api/weather", async (req, res) => {
    const { lat, lon, tempUnit, windUnit, precipUnit } = req.query;
    const cacheKey = `${lat}|${lon}|${tempUnit || 'celsius'}|${windUnit || 'kmh'}|${precipUnit || 'mm'}`;
    let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,weather_code,is_day,wind_speed_10m&hourly=temperature_2m,weather_code,is_day,precipitation,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`;

    if (tempUnit === 'fahrenheit') url += '&temperature_unit=fahrenheit';
    if (windUnit === 'mph') url += '&wind_speed_unit=mph';
    if (precipUnit === 'inch') url += '&precipitation_unit=inch';

    try {
      const freshCached = weatherCache.get(cacheKey);
      if (freshCached && Date.now() - freshCached.savedAt <= WEATHER_FRESH_CACHE_MS) {
        res.setHeader('Cache-Control', 'private, max-age=30');
        return res.json(freshCached.data);
      }

      let requestPromise = weatherInFlight.get(cacheKey);
      if (!requestPromise) {
        requestPromise = (async () => {
          let lastError: unknown = null;

          // Retry only transport failures. A 429 is a rate-limit response and an
          // immediate second request makes throttling worse.
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
              if (!response.ok) {
                const error: any = new Error(`Weather API Error: ${response.status}`);
                error.status = response.status;
                error.retryAfter = response.headers.get('retry-after');
                throw error;
              }

              const data = await response.json();
              weatherCache.set(cacheKey, { savedAt: Date.now(), data });
              return data;
            } catch (error: any) {
              lastError = error;
              if (error?.status === 429 || (typeof error?.status === 'number' && error.status >= 400 && error.status < 500)) break;
              if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          throw lastError;
        })();
        weatherInFlight.set(cacheKey, requestPromise);
        requestPromise.finally(() => weatherInFlight.delete(cacheKey)).catch(() => undefined);
      }

      const data = await requestPromise;
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.json(data);
    } catch (error: any) {
      const cached = weatherCache.get(cacheKey);
      if (cached) {
        console.warn("Weather provider temporarily unavailable; using cached weather data.");
        return res.json({ ...cached.data, cached: true, cachedAt: new Date(cached.savedAt).toISOString() });
      }

      const timedOut =
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError' ||
        error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        /timeout|timed out|aborted/i.test(String(error?.message || ''));

      if (timedOut) {
        console.warn("Weather provider connection timed out; no cached weather data is available yet.");
      } else {
        console.error("Server proxy error (Weather):", error);
      }

      return res.status(503).json({
        error: "Weather data is temporarily unavailable",
        retryable: true,
      });
    }
  });

  // 2. Historical Data Proxy
  app.get("/api/historical", async (req, res) => {
    const { lat, lon, startDate, endDate, tempUnit, precipUnit } = req.query;
    const cacheKey = JSON.stringify({ lat, lon, startDate, endDate, tempUnit, precipUnit });

    try {
      let url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      if (tempUnit === 'fahrenheit') url += '&temperature_unit=fahrenheit';
      if (precipUnit === 'inch') url += '&precipitation_unit=inch';

      let response: Response | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
          if (!response.ok) throw new Error(`Archive API Error: ${response.status}`);
          break;
        } catch (error) {
          lastError = error;
          response = null;
          if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 350));
        }
      }

      if (!response) throw lastError;
      const data = await response.json();
      historicalCache.set(cacheKey, { savedAt: Date.now(), data });
      res.json(data);
    } catch (error: any) {
      const cached = historicalCache.get(cacheKey);
      if (cached) {
        console.warn("Historical weather temporarily unavailable; using cached data.");
        return res.json(cached.data);
      }

      const timedOut =
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError' ||
        error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        /timeout|timed out|aborted/i.test(String(error?.message || ''));

      console.warn(timedOut
        ? "Historical weather provider timed out; no cached data is available yet."
        : `Historical weather provider unavailable: ${error?.message || error}`);

      res.status(503).json({ error: "Historical weather temporarily unavailable", retryable: true });
    }
  });

  // 3. Search Locations Proxy (General Weather Cities)
  app.get("/api/search", async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) return res.json({ results: [] });

    try {
      const results = await searchWeatherCities(q);
      return res.json({ results });
    } catch (error: any) {
      const timedOut =
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError' ||
        /timeout|timed out|aborted/i.test(String(error?.message || ''));

      if (timedOut) {
        console.warn("Primary city search timed out; using Open-Meteo fallback.");
      } else {
        console.warn("Primary city search failed; using Open-Meteo fallback.", error);
      }

      // Reliable fallback for city suggestions when the primary search provider
      // is slow or temporarily unreachable. Keep the same Location shape used by
      // the dashboard so no client-side changes are required.
      try {
        const fallbackUrl =
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
          `&count=10&language=en&format=json`;

        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
          },
          signal: AbortSignal.timeout(12_000),
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Open-Meteo geocoding returned ${fallbackResponse.status}`);
        }

        const fallbackData: any = await fallbackResponse.json();
        const results = Array.isArray(fallbackData?.results)
          ? fallbackData.results
              .filter((item: any) =>
                Number.isFinite(Number(item?.latitude)) &&
                Number.isFinite(Number(item?.longitude)),
              )
              .map((item: any) => ({
                id: Number.isFinite(Number(item?.id))
                  ? Number(item.id)
                  : Math.round((Number(item.latitude) + 90) * 1000000 + (Number(item.longitude) + 180) * 1000),
                name: String(item?.name || ''),
                latitude: Number(item.latitude),
                longitude: Number(item.longitude),
                country: String(item?.country || ''),
                admin1: String(item?.admin1 || ''),
                timezone: String(item?.timezone || 'auto'),
              }))
          : [];

        return res.json({ results });
      } catch (fallbackError) {
        console.error("City search fallback failed:", fallbackError);
        return res.status(503).json({
          error: "City search is temporarily unavailable",
          results: [],
          retryable: true,
        });
      }
    }
  });

  // 3.1 Global Places, Establishments, Landmarks & Address Search Proxy
  app.get("/api/search-places", async (req, res) => {
    try {
      const { q, lat, lon } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json({ results: [] });
      }

      const searchQuery = q.trim();
      if (searchQuery.length < 2) {
        return res.json({ results: [] });
      }

      // 1. Query Nominatim (OpenStreetMap Global Database for Places, POIs, Establishments, Malls, Buildings, Streets)
      let nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=10`;
      
      if (lat && lon) {
        const uLat = parseFloat(lat as string);
        const uLon = parseFloat(lon as string);
        if (!isNaN(uLat) && !isNaN(uLon)) {
          // Add proximity viewbox (~250km bounding radius)
          const d = 2.2;
          nominatimUrl += `&viewbox=${uLon - d},${uLat + d},${uLon + d},${uLat - d}`;
        }
      }

      const headers = {
        'User-Agent': 'ModernWeatherNavigator/2.1 (contact: team@weatherapp.local)',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      const nomRes = await fetch(nominatimUrl, { headers });
      if (nomRes.ok) {
        const data = await nomRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const results = data.map((item: any) => {
            const address = item.address || {};
            const rawName = item.name || address.amenity || address.shop || address.tourism || address.building || address.leisure || address.road || item.display_name.split(',')[0];
            const parts = item.display_name.split(',').map((s: string) => s.trim());
            const subtitle = parts.slice(1, 4).join(', ');

            let type = (item.type || item.class || 'place').toLowerCase();
            let category = 'place';
            if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bakery', 'food_court'].includes(type)) category = 'restaurant';
            else if (['fuel', 'charging_station', 'gas'].includes(type)) category = 'gas';
            else if (['hotel', 'motel', 'guest_house', 'hostel', 'resort', 'apartment'].includes(type)) category = 'hotel';
            else if (['supermarket', 'convenience', 'mall', 'department_store', 'shop', 'marketplace'].includes(type) || item.class === 'shop') category = 'grocery';
            else if (['pharmacy', 'hospital', 'clinic', 'doctors', 'dentist'].includes(type)) category = 'pharmacy';
            else if (['aeroway', 'airport', 'terminal', 'aerodrome'].includes(type) || item.class === 'aeroway') category = 'airport';
            else if (['attraction', 'museum', 'monument', 'memorial', 'theme_park', 'viewpoint', 'zoo', 'historic', 'artwork'].includes(type) || item.class === 'tourism') category = 'attraction';
            else if (['university', 'college', 'school'].includes(type)) category = 'education';
            else if (['station', 'subway_entrance', 'bus_stop', 'tram_stop', 'halt', 'ferry_terminal'].includes(type)) category = 'transit';

            return {
              id: String(item.place_id || Math.random()),
              name: rawName,
              displayName: item.display_name,
              subtitle: subtitle || address.city || address.country || '',
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              type,
              category,
              address: item.display_name,
              country: address.country || '',
            };
          });

          return res.json({ results });
        }
      }

      // 2. Fallback to Open-Meteo Geocoding for Cities & Towns
      const fallbackUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=8&language=en&format=json`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const results = (fallbackData.results || []).map((item: any) => ({
          id: String(item.id),
          name: item.name,
          displayName: `${item.name}, ${item.admin1 ? item.admin1 + ', ' : ''}${item.country}`,
          subtitle: `${item.admin1 ? item.admin1 + ', ' : ''}${item.country}`,
          lat: item.latitude,
          lng: item.longitude,
          type: 'city',
          category: 'place',
          address: `${item.name}, ${item.country}`,
        }));
        return res.json({ results });
      }

      res.json({ results: [] });
    } catch (error) {
      console.error("Server proxy error (Search Places):", error);
      res.status(500).json({ error: "Failed to search places", results: [] });
    }
  });

  // 3.2 Named POI lookup for clicks on labels rendered into raster map tiles.
  app.get('/api/poi-at', async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=jsonv2&zoom=18&addressdetails=1&namedetails=1&extratags=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ModernWeatherNavigator/2.1 (contact: team@weatherapp.local)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (!response.ok) throw new Error(`POI lookup failed: ${response.status}`);
      const item = await response.json();
      const category = String(item.category || item.class || '').toLowerCase();
      const allowedCategories = new Set(['amenity', 'shop', 'tourism', 'leisure', 'office', 'craft', 'historic', 'healthcare', 'club', 'building', 'man_made']);
      const name = item.namedetails?.name || item.name;
      if (!name || !allowedCategories.has(category)) {
        return res.status(404).json({ error: 'No named place at this point' });
      }

      const address = item.address || {};
      const parts = String(item.display_name || '').split(',').map((part: string) => part.trim());
      const type = String(item.type || category || 'place').toLowerCase();
      let placeCategory = 'place';
      if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bakery', 'food_court'].includes(type)) placeCategory = 'restaurant';
      else if (['fuel', 'charging_station'].includes(type)) placeCategory = 'gas';
      else if (['hotel', 'motel', 'guest_house', 'hostel', 'resort'].includes(type)) placeCategory = 'hotel';
      else if (category === 'shop' || ['supermarket', 'convenience', 'mall', 'marketplace'].includes(type)) placeCategory = 'grocery';
      else if (['pharmacy', 'hospital', 'clinic', 'doctors', 'dentist'].includes(type)) placeCategory = 'pharmacy';
      else if (category === 'tourism' || category === 'historic') placeCategory = 'attraction';

      res.json({
        place: {
          id: `poi-${item.osm_type || 'place'}-${item.osm_id || item.place_id}`,
          name,
          displayName: item.display_name || name,
          subtitle: parts.slice(1, 4).join(', ') || address.city || address.country || '',
          lat: Number(item.lat),
          lng: Number(item.lon),
          type,
          category: placeCategory,
          address: item.display_name || name,
          country: address.country || '',
        },
      });
    } catch (error) {
      console.error('Server proxy error (POI lookup):', error);
      res.status(502).json({ error: 'Unable to look up this place' });
    }
  });

  // 4. Reverse Geocoding Proxy
  app.get("/api/reverse-geocode", async (req, res) => {
    const { lat, lon } = req.query;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const cacheKey = `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;

    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(6500) });
        if (response.ok) {
          const data = await response.json();
          if (data.city || data.locality) {
            reverseGeocodeCache.set(cacheKey, { savedAt: Date.now(), data });
            return res.json(data);
          }
        }
      } catch {
        console.warn('Primary reverse geocoder unavailable; using fallback.');
      }

      const fallbackUrl = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&format=jsonv2&zoom=10&addressdetails=1`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'WeatherNow/1.0 contact' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!fallbackResponse.ok) throw new Error(`Reverse Geocode fallback error: ${fallbackResponse.status}`);

      const fallback = await fallbackResponse.json();
      const address = fallback.address || {};
      const data = {
        city: address.city || address.town || address.municipality || address.village || address.county || '',
        locality: address.city_district || address.suburb || '',
        principalSubdivision: address.state || address.region || '',
        countryName: address.country || '',
        displayName: fallback.display_name || '',
      };

      reverseGeocodeCache.set(cacheKey, { savedAt: Date.now(), data });
      res.json(data);
    } catch {
      const cached = reverseGeocodeCache.get(cacheKey);
      if (cached) {
        console.warn('Reverse geocoder temporarily unavailable; using cached location.');
        return res.json(cached.data);
      }

      console.warn('Reverse geocoder temporarily unavailable; no cached location is available yet.');
      res.status(503).json({ error: "Reverse geocoding temporarily unavailable", retryable: true });
    }
  });

  // 5. Routing Proxy
  app.get("/api/route", async (req, res) => {
    try {
      const { startLon, startLat, endLon, endLat } = req.query;
      const requestedMode = String(req.query.mode || 'DRIVING').toUpperCase();
      // The public OSRM demo exposes driving data only. Use the OSM routing
      // service's dedicated profiles so walking/cycling do not reuse roads
      // calculated for cars. Transit falls back to driving because a public
      // transit graph is not available from this endpoint.
      const routerBase = requestedMode === 'WALKING'
        ? 'https://routing.openstreetmap.de/routed-foot/route/v1/driving'
        : requestedMode === 'BICYCLING'
          ? 'https://routing.openstreetmap.de/routed-bike/route/v1/driving'
          : 'https://router.project-osrm.org/route/v1/driving';
      const url = `${routerBase}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Routing API Error: ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Routing):", error);
      res.status(500).json({ error: "Failed to fetch route" });
    }
  });
  
  // RSS Proxy with Fast Caching
  app.get("/api/rss", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing url" });
      }

      // Check in-memory cache
      const cached = rssCache.get(url);
      if (cached && (Date.now() - cached.timestamp < RSS_CACHE_TTL)) {
        res.setHeader('Cache-Control', 'public, max-age=180');
        return res.json(cached.data);
      }
      
      let feed: any;

      if (/^https:\/\/www\.bing\.com\/news\/search\?/i.test(url)) {
        let xml = '';
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'application/rss+xml, application/xml, text/xml, */*',
              },
              signal: AbortSignal.timeout(6500),
            });

            if (!response.ok) throw new Error(`Bing News RSS returned ${response.status}`);

            const body = await response.text();
            if (!/<(?:rss|feed)\b/i.test(body)) {
              throw new Error('Bing News returned non-RSS content');
            }

            xml = body;
            break;
          } catch (error) {
            lastError = error;
            if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        if (!xml) {
          const cachedFeed = rssCache.get(url);
          if (cachedFeed) {
            res.setHeader('Cache-Control', 'public, max-age=60');
            return res.json(cachedFeed.data);
          }

          console.warn('Bing News RSS temporarily unavailable:', (lastError as any)?.message || lastError);
          return res.status(503).json({
            error: 'News source temporarily unavailable',
            items: [],
            retryable: true,
          });
        }

        feed = await rssParser.parseString(xml);
      } else {
        feed = await rssParser.parseURL(url);
      }
      
      // Post-process feed to extract thumbnail
      if (feed && feed.items) {
        feed.items = feed.items.map(item => {
          let thumbnail: string | null = null;
          
          if (item.mediaContent && (item.mediaContent as any)['$'] && (item.mediaContent as any)['$'].url) {
            thumbnail = (item.mediaContent as any)['$'].url;
          } else if ((item as any).mediaGroup && (item as any).mediaGroup['media:content'] && (item as any).mediaGroup['media:content']['$']?.url) {
            thumbnail = (item as any).mediaGroup['media:content']['$'].url;
          } else if ((item as any).mediaGroup && (item as any).mediaGroup['media:thumbnail'] && (item as any).mediaGroup['media:thumbnail']['$']?.url) {
            thumbnail = (item as any).mediaGroup['media:thumbnail']['$'].url;
          } else if ((item as any).newsImage) {
            thumbnail = (item as any).newsImage;
          } else if (item.mediaThumbnail && (item.mediaThumbnail as any)['$'] && (item.mediaThumbnail as any)['$'].url) {
            thumbnail = (item.mediaThumbnail as any)['$'].url;
          } else if (item.enclosure && item.enclosure.url) {
            thumbnail = item.enclosure.url;
          } else if (item.enclosure && (item.enclosure as any).link) {
            thumbnail = (item.enclosure as any).link;
          } else if ((item as any).contentEncoded) {
            const match = (item as any).contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match) thumbnail = match[1];
          } else if (item.content) {
            const match = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match) thumbnail = match[1];
          } else if ((item as any)['content:encoded']) {
            const match = (item as any)['content:encoded'].match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match) thumbnail = match[1];
          } else if ((item as any).description) {
            const match = (item as any).description.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match) thumbnail = match[1];
          }
          
          return { ...item, thumbnail };
        });
      }
      
      // Store in cache
      rssCache.set(url, { data: feed, timestamp: Date.now() });
      res.setHeader('Cache-Control', 'public, max-age=180');
      res.json(feed);
    } catch (error) {
      console.error("RSS fetch error for url:", req.query.url, (error as any)?.message || error);
      // Distinguish an upstream outage from a successful feed with no stories.
      res.status(502).json({ error: 'News source temporarily unavailable', items: [] });
    }
  });

  // 6. Link Meta Image Proxy
  const linkPreviewFailureCache = new Map<string, number>();

  app.get("/api/link-preview", async (req, res) => {
    let originalUrl = '';
    let originalHost = '';

    try {
      let { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing url" });
      }

      originalUrl = url;

      try {
        originalHost = new URL(originalUrl).hostname.toLowerCase();

        // A publisher that recently failed should not be retried by every
        // news card. Return the normal no-preview fallback immediately.
        const domainFailedAt = linkPreviewDomainFailureCache.get(originalHost);
        if (domainFailedAt && Date.now() - domainFailedAt < 15 * 60_000) {
          return res.json({ image: null, images: [], retryable: false });
        }

      } catch {}

      // Run external article preview fetches sequentially. NewsFeed may ask for
      // many previews at once, but only one publisher request is allowed to use
      // the network at a time. This prevents bursts from slowing or blocking
      // the dashboard connection.
      const releaseLinkPreviewTurn = await waitForLinkPreviewTurn();

      try {
        // Small gap between publisher requests avoids immediately hammering the
        // next site after the previous request completes.
        await new Promise(resolve => setTimeout(resolve, 150));

      // Manila Standard article pages repeatedly hold preview requests open.
      // Skip only this publisher's article-page preview fetch.
      if (originalHost === 'manilastandard.net' || originalHost.endsWith('.manilastandard.net')) {
        return res.json({ image: null, images: [], retryable: false });
      }

      // If this exact article already failed, do not retry it from the News tab.
      const failedAt = linkPreviewFailureCache.get(originalUrl);
      if (failedAt && Date.now() - failedAt < 15 * 60_000) {
        return res.json({ image: null, images: [], retryable: false });
      }

      // If it's a Bing News redirect link, extract the target URL to fetch directly.
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('bing.com') && urlObj.searchParams.has('url')) {
          url = urlObj.searchParams.get('url') || url;
        }
      } catch {}

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: /(^|\.)(msn\.com|bing\.com)$/i.test(new URL(String(url)).hostname) ? 'https://www.msn.com/' : undefined,
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!response.ok) {
        const now = Date.now();
        linkPreviewFailureCache.set(originalUrl, now);
        if (originalHost) linkPreviewDomainFailureCache.set(originalHost, now);
        return res.json({ image: null, images: [], retryable: false });
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        const now = Date.now();
        linkPreviewFailureCache.set(originalUrl, now);
        if (originalHost) linkPreviewDomainFailureCache.set(originalHost, now);
        return res.json({ image: null, images: [], retryable: false });
      }

      const html = await response.text();
      const images = extractNewsImages(html, response.url || url);

      linkPreviewFailureCache.delete(originalUrl);
      if (originalHost) linkPreviewDomainFailureCache.delete(originalHost);

      return res.json({
        image: images[0] || null,
        images,
        retryable: false,
      });
      } finally {
        releaseLinkPreviewTurn();
      }
    } catch {
      // Preview images are optional. Publisher blocking, TLS/connect timeouts,
      // anti-bot pages and unavailable article pages should not surface as
      // News-tab/server errors. Cache the failure and return a normal empty
      // preview so the article itself remains usable.
      const now = Date.now();

      if (originalUrl) {
        linkPreviewFailureCache.set(originalUrl, now);
      }
      if (originalHost) {
        linkPreviewDomainFailureCache.set(originalHost, now);
      }

      return res.json({ image: null, images: [], retryable: false });
    }
  });

  // Same-origin image delivery avoids publisher hotlink blocks (notably MSN)
  // without blurring, resizing, or altering the source image.
  app.get('/api/news-image', async (req, res) => {
    try {
      const value = typeof req.query.url === 'string' ? req.query.url : '';
      const refValue = typeof req.query.ref === 'string' ? req.query.ref : '';
      const initial = new URL(value);
      if (initial.protocol !== 'https:' || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1\]?)/i.test(initial.hostname)) return res.sendStatus(400);

      let articleReferrer = '';
      try {
        const ref = new URL(refValue);
        const refHost = ref.hostname.toLowerCase();
        if (ref.protocol === 'https:' && (
          refHost === 'inquirer.net' || refHost.endsWith('.inquirer.net') ||
          refHost === 'manilatimes.net' || refHost.endsWith('.manilatimes.net')
        )) {
          articleReferrer = ref.href;
        }
      } catch { /* Optional article referrer. */ }

      const candidates = [initial.href];
      const isMsn = /(^|\.)(msn\.com|bing\.com|bing\.net|akamaized\.net)$/i.test(initial.hostname) || /msn|bing/i.test(initial.hostname);
      if (isMsn) {
        const clean = new URL(initial.href);
        ['w', 'h', 'width', 'height', 'crop', 'q', 'quality'].forEach(key => clean.searchParams.delete(key));
        if (clean.href !== initial.href) candidates.push(clean.href);
      }

      for (const candidate of [...new Set(candidates)]) {
        try {
          const url = new URL(candidate);
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
              Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              // Inquirer's image hosts may reject generic hotlinks; use the actual
              // Inquirer article URL when the client supplied one.
              Referer: articleReferrer || (isMsn ? 'https://www.msn.com/' : `${url.protocol}//${url.hostname}/`),
              'Sec-Fetch-Dest': 'image',
              'Sec-Fetch-Mode': 'no-cors',
            },
            redirect: 'follow', signal: AbortSignal.timeout(9000),
          });
          const type = response.headers.get('content-type') || '';
          if (!response.ok || !type.toLowerCase().startsWith('image/')) continue;
          const length = Number(response.headers.get('content-length') || 0);
          if (length > 10 * 1024 * 1024) continue;
          const bytes = Buffer.from(await response.arrayBuffer());
          if (!bytes.length || bytes.length > 10 * 1024 * 1024) continue;
          res.setHeader('Content-Type', type);
          res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
          return res.send(bytes);
        } catch { /* try the next safe candidate */ }
      }
      return res.sendStatus(404);
    } catch {
      return res.sendStatus(404);
    }
  });


  // Live PAGASA bulletin parser (current eye position only).
  app.get('/api/pagasa-cyclone', async (_req, res) => {
    try {
      let response: Response | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch('https://pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin/1', {
            headers: { 'User-Agent': 'WeatherNow/1.0' },
            signal: AbortSignal.timeout(12_000),
          });
          if (!response.ok) throw new Error(`PAGASA returned ${response.status}`);
          break;
        } catch (error) {
          lastError = error;
          response = null;
          if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 400));
        }
      }

      if (!response) throw lastError;

      const html = await response.text();
      const bulletinText = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
      const coordinate = bulletinText.match(/\(([-\d.]+)\s*Â°?\s*([NS]),\s*([-\d.]+)\s*Â°?\s*([EW])\)/i);

      if (!coordinate) {
        const data = { active: false, source: 'PAGASA' };
        pagasaCycloneCache = { savedAt: Date.now(), data };
        return res.json(data);
      }

      const latitude = Number(coordinate[1]) * (coordinate[2].toUpperCase() === 'S' ? -1 : 1);
      const longitude = Number(coordinate[3]) * (coordinate[4].toUpperCase() === 'W' ? -1 : 1);
      const title = bulletinText.match(/(?:Tropical Cyclone Bulletin|Severe Weather Bulletin)[^|]{0,120}/i)?.[0]?.trim() || 'PAGASA Tropical Cyclone';
      const data = { active: true, latitude, longitude, title, updatedAt: new Date().toISOString(), source: 'PAGASA' };
      pagasaCycloneCache = { savedAt: Date.now(), data };
      return res.json(data);
    } catch {
      if (pagasaCycloneCache) {
        console.warn('PAGASA cyclone feed temporarily unavailable; using cached bulletin state.');
        return res.json({ ...pagasaCycloneCache.data, cached: true });
      }

      console.warn('PAGASA cyclone feed temporarily unavailable; no cached bulletin state is available yet.');
      return res.status(503).json({ active: false, source: 'PAGASA', retryable: true });
    }
  });

  app.get('/api/cyclones', async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.json(await getCyclones());
    } catch {
      res.status(502).json({ error: 'Cyclone feeds unavailable', storms: [] });
    }
  });

app.get("/api/nhc-cyclones", async (_req, res) => {
  try {
    const response = await fetch(
      "https://www.nhc.noaa.gov/CurrentStorms.json",
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) throw new Error(`NHC: ${response.status}`);

    const data = await response.json();
    res.setHeader("Cache-Control", "no-store");
    res.json({ storms: data.activeStorms ?? [] });
  } catch {
    res.status(502).json({
      error: "NHC cyclone feed unavailable",
      storms: [],
    });
  }
});


  // Himawari full-disk B13 infrared imagery from JMA.
  // JMA publishes the full-disk observation timeline every 10 minutes and
  // serves it as standard map tiles (zoom 3-5). This is used as the whole-map
  // Himawari layer; PANaHON remains the enhanced regional layer above it.
  let jmaHimawariFullDiskTimelineCache: {
    savedAt: number;
    frames: Array<{ basetime: string; validtime: string; time: string }>;
  } | null = null;

  app.get('/api/himawari-full-disk', async (_req, res) => {
    try {
      if (
        !jmaHimawariFullDiskTimelineCache ||
        Date.now() - jmaHimawariFullDiskTimelineCache.savedAt > 2 * 60_000
      ) {
        let response: Response | null = null;
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            response = await fetch(
              'https://www.jma.go.jp/bosai/himawari/data/satimg/targetTimes_fd.json',
              {
                headers: {
                  Accept: 'application/json,text/plain,*/*',
                  Referer: 'https://www.jma.go.jp/bosai/map.html#5/34.5/137/&elem=ir',
                  'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
                },
                signal: AbortSignal.timeout(12_000),
              },
            );
            if (!response.ok) throw new Error(`JMA Himawari full-disk timeline returned ${response.status}`);
            break;
          } catch (error) {
            lastError = error;
            response = null;
            if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 400));
          }
        }

        if (!response) throw lastError;
        const raw = await response.json();
        if (!Array.isArray(raw) || !raw.length) {
          throw new Error('JMA Himawari full-disk timeline was empty');
        }

        const frames = raw
          .filter((frame: any) =>
            typeof frame?.basetime === 'string' &&
            /^\d{14}$/.test(frame.basetime) &&
            typeof frame?.validtime === 'string' &&
            /^\d{14}$/.test(frame.validtime)
          )
          .slice(-6)
          .map((frame: any) => {
            const v = frame.validtime;
            const time = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}Z`;
            return {
              basetime: frame.basetime,
              validtime: frame.validtime,
              time,
            };
          });

        if (!frames.length) throw new Error('JMA Himawari full-disk timeline had no usable frames');
        jmaHimawariFullDiskTimelineCache = { savedAt: Date.now(), frames };
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        product: 'Himawari Full Disk B13 Infrared',
        provider: 'Japan Meteorological Agency',
        playSpeedMs: 1000,
        frames: jmaHimawariFullDiskTimelineCache.frames,
      });
    } catch {
      res.setHeader('Cache-Control', 'no-store');

      if (jmaHimawariFullDiskTimelineCache?.frames?.length) {
        console.warn('JMA Himawari timeline temporarily unavailable; using cached frames.');
        return res.json({
          product: 'Himawari Full Disk B13 Infrared',
          provider: 'Japan Meteorological Agency',
          playSpeedMs: 1000,
          frames: jmaHimawariFullDiskTimelineCache.frames,
          cached: true,
        });
      }

      console.warn('JMA Himawari timeline temporarily unavailable; no cached frames are available yet.');
      return res.status(503).json({
        error: 'Himawari full-disk timeline is temporarily unavailable',
        retryable: true,
      });
    }
  });

  app.get('/api/himawari-full-disk-tile', async (req, res) => {
    try {
      const basetime = typeof req.query.basetime === 'string' ? req.query.basetime : '';
      const validtime = typeof req.query.validtime === 'string' ? req.query.validtime : '';
      const z = Number(req.query.z);
      const x = Number(req.query.x);
      const y = Number(req.query.y);

      if (
        !/^\d{14}$/.test(basetime) ||
        !/^\d{14}$/.test(validtime) ||
        !Number.isInteger(z) || z < 3 || z > 5 ||
        !Number.isInteger(x) || x < 0 || x >= 2 ** z ||
        !Number.isInteger(y) || y < 0 || y >= 2 ** z
      ) {
        return res.status(400).send('Invalid Himawari full-disk tile request');
      }

      // Validate requested frame against JMA's currently advertised timeline.
      if (
        !jmaHimawariFullDiskTimelineCache ||
        Date.now() - jmaHimawariFullDiskTimelineCache.savedAt > 5 * 60_000
      ) {
        const response = await fetch(
          'https://www.jma.go.jp/bosai/himawari/data/satimg/targetTimes_fd.json',
          {
            headers: {
              Accept: 'application/json,text/plain,*/*',
              'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
            },
            signal: AbortSignal.timeout(12_000),
          },
        );
        if (!response.ok) throw new Error(`JMA Himawari timeline returned ${response.status}`);
        const raw = await response.json();
        const frames = Array.isArray(raw)
          ? raw
              .filter((frame: any) =>
                typeof frame?.basetime === 'string' &&
                /^\d{14}$/.test(frame.basetime) &&
                typeof frame?.validtime === 'string' &&
                /^\d{14}$/.test(frame.validtime)
              )
              .slice(-12)
              .map((frame: any) => {
                const v = frame.validtime;
                return {
                  basetime: frame.basetime,
                  validtime: frame.validtime,
                  time: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}Z`,
                };
              })
          : [];
        jmaHimawariFullDiskTimelineCache = { savedAt: Date.now(), frames };
      }

      const advertised = jmaHimawariFullDiskTimelineCache.frames.some(
        frame => frame.basetime === basetime && frame.validtime === validtime,
      );
      if (!advertised) return res.status(404).send('Himawari full-disk frame is no longer advertised');

      const upstream =
        `https://www.jma.go.jp/bosai/himawari/data/satimg/${basetime}` +
        `/fd/${validtime}/B13/TBB/${z}/${x}/${y}.jpg`;

      const response = await fetch(upstream, {
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/*,*/*;q=0.8',
          Referer: 'https://www.jma.go.jp/bosai/map.html#5/34.5/137/&elem=ir',
          'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
        },
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        // Missing tiles are normal outside Himawari's visible full-disk footprint.
        if (response.status === 404) return res.status(404).end();
        throw new Error(`JMA Himawari tile returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`JMA Himawari tile returned ${contentType || 'non-image content'}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 2 * 1024 * 1024) {
        throw new Error('Invalid JMA Himawari tile size');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(bytes);
    } catch (error) {
      console.error('JMA Himawari full-disk tile failed:', error);
      return res.status(502).send('Himawari full-disk tile unavailable');
    }
  });

  // Regional geostationary satellite proxy for locations outside Himawari coverage.
  // Keep third-party WMS requests server-side and retry recent observation slots.
  app.get('/api/geosat-tile', async (req, res) => {
    try {
      const provider = String(req.query.provider || '').toLowerCase();
      const z = Number(req.query.z);
      const x = Number(req.query.x);
      const y = Number(req.query.y);

      if (!['goes-east', 'goes-west', 'mtg'].includes(provider) ||
          !Number.isInteger(z) || z < 0 || z > 10 ||
          !Number.isInteger(x) || x < 0 || x >= 2 ** z ||
          !Number.isInteger(y) || y < 0 || y >= 2 ** z) {
        return res.status(400).send('Invalid geostationary satellite tile request');
      }

      const ORIGIN = 20037508.342789244;
      const tiles = 2 ** z;
      const span = (ORIGIN * 2) / tiles;
      const minX = -ORIGIN + x * span;
      const maxX = minX + span;
      const maxY = ORIGIN - y * span;
      const minY = maxY - span;
      const bbox = `${minX},${minY},${maxX},${maxY}`;

      const slotMs = 10 * 60_000;
      const base = Math.floor((Date.now() - 20 * 60_000) / slotMs) * slotMs;
      const times = Array.from({ length: 8 }, (_, i) =>
        new Date(base - i * slotMs).toISOString(),
      );

      const attempts: string[] = [];
      if (provider === 'goes-east' || provider === 'goes-west') {
        const layer = provider === 'goes-west'
          ? 'GOES-West_ABI_Band13_Clean_Infrared'
          : 'GOES-East_ABI_Band13_Clean_Infrared';

        for (const time of times) {
          const params = new URLSearchParams({
            SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.1.1',
            LAYERS: layer, STYLES: '', FORMAT: 'image/png', TRANSPARENT: 'TRUE',
            SRS: 'EPSG:3857', BBOX: bbox, WIDTH: '256', HEIGHT: '256', TIME: time,
          });
          attempts.push(`https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?${params}`);
        }
      } else {
        for (const time of times) {
          const params = new URLSearchParams({
            SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0',
            LAYERS: 'mtg_fd:ir105_hrfi', STYLES: '', FORMAT: 'image/png',
            TRANSPARENT: 'TRUE', CRS: 'EPSG:3857', BBOX: bbox,
            WIDTH: '256', HEIGHT: '256', TIME: time,
          });
          attempts.push(`https://view.eumetsat.int/geoserver/wms?${params}`);
        }

        const latestParams = new URLSearchParams({
          SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0',
          LAYERS: 'mtg_fd:ir105_hrfi', STYLES: '', FORMAT: 'image/png',
          TRANSPARENT: 'TRUE', CRS: 'EPSG:3857', BBOX: bbox,
          WIDTH: '256', HEIGHT: '256',
        });
        attempts.push(`https://view.eumetsat.int/geoserver/wms?${latestParams}`);
      }

      let lastStatus = 0;
      for (const upstream of attempts) {
        try {
          const response = await fetch(upstream, {
            headers: {
              Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
              'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
            },
            signal: AbortSignal.timeout(12_000),
          });
          lastStatus = response.status;
          if (!response.ok) continue;

          const contentType = response.headers.get('content-type') || '';
          if (!contentType.toLowerCase().startsWith('image/')) continue;
          const bytes = Buffer.from(await response.arrayBuffer());
          if (!bytes.length || bytes.length > 4 * 1024 * 1024) continue;

          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=180');
          return res.send(bytes);
        } catch {
          // Try the next recent observation slot.
        }
      }

      return res.status(502).send(
        `Regional satellite tile unavailable (${provider}, last status ${lastStatus || 'timeout'})`,
      );
    } catch (error) {
      console.error('Regional satellite proxy failed:', error);
      return res.status(502).send('Regional satellite tile unavailable');
    }
  });

  // Global geostationary infrared satellite image.
  // MET Norway returns the latest image when no time is supplied.
  // Keep this behind the WeatherNow server because api.met.no requires a
  // descriptive User-Agent and browsers should not depend on cross-origin image policy.
  app.get('/api/global-satellite-ir', async (_req, res) => {
    try {
      const response = await fetch(
        'https://api.met.no/weatherapi/geosatellite/1.4/?area=global&type=infrared',
        {
          headers: {
            Accept: 'image/png,image/*;q=0.9,*/*;q=0.5',
            'User-Agent': 'WeatherNow dashboard/1.0 (local weather dashboard)',
          },
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!response.ok) {
        throw new Error(`MET global satellite returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`MET global satellite returned ${contentType}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 12 * 1024 * 1024) {
        throw new Error('Invalid MET global satellite image size');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(bytes);
    } catch (error) {
      console.error('Global satellite IR proxy failed:', error);
      return res.status(502).send('Global satellite IR unavailable');
    }
  });


  // Real regional geostationary IR tiles:
  // GOES-West / GOES-East for the Americas, MTG/Meteosat for Europe/Africa.
  app.get('/api/regional-ir-tile', async (req, res) => {
    try {
      const provider = String(req.query.provider || '');
      const z = Number(req.query.z);
      const x = Number(req.query.x);
      const y = Number(req.query.y);

      if (
        !['goes-west', 'goes-east', 'mtg'].includes(provider) ||
        !Number.isInteger(z) || z < 0 || z > 10 ||
        !Number.isInteger(x) || x < 0 || x >= 2 ** z ||
        !Number.isInteger(y) || y < 0 || y >= 2 ** z
      ) {
        return res.status(400).send('Invalid regional IR tile request');
      }

      // XYZ Web-Mercator tile -> EPSG:3857 WMS bbox.
      const origin = 20037508.342789244;
      const n = 2 ** z;
      const minX = (x / n) * 2 * origin - origin;
      const maxX = ((x + 1) / n) * 2 * origin - origin;
      const maxY = origin - (y / n) * 2 * origin;
      const minY = origin - ((y + 1) / n) * 2 * origin;

      let baseUrl: string;
      let layerName: string;
      let referer: string;

      if (provider === 'goes-west') {
        baseUrl = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
        layerName = 'GOES-West_ABI_Band13_Clean_Infrared';
        referer = 'https://worldview.earthdata.nasa.gov/';
      } else if (provider === 'goes-east') {
        baseUrl = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
        layerName = 'GOES-East_ABI_Band13_Clean_Infrared';
        referer = 'https://worldview.earthdata.nasa.gov/';
      } else {
        baseUrl = 'https://view.eumetsat.int/geoserver/wms';
        layerName = 'mtg_fd:ir105_hrfi';
        referer = 'https://view.eumetsat.int/';
      }

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        VERSION: '1.1.1',
        LAYERS: layerName,
        STYLES: '',
        FORMAT: 'image/png',
        TRANSPARENT: 'TRUE',
        SRS: 'EPSG:3857',
        BBOX: `${minX},${minY},${maxX},${maxY}`,
        WIDTH: '256',
        HEIGHT: '256',
      });

      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          Accept: 'image/png,image/*;q=0.9,*/*;q=0.5',
          Referer: referer,
          'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`${provider} IR returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`${provider} IR returned ${contentType || 'non-image'}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
        throw new Error(`Invalid ${provider} IR tile`);
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(bytes);
    } catch (error) {
      console.error('Regional satellite IR tile failed:', error);
      return res.status(502).send('Regional satellite IR unavailable');
    }
  });


  // Europe/Africa satellite fallback.
  // EUMETSAT GEO-Ring Dust RGB is built only from infrared channels and combines
  // Meteosat/GOES/Himawari into one geostationary ring. We use it here only for
  // Europe/Africa when the direct MTG WMS layer is unavailable.
  app.get('/api/europe-africa-ir-tile', async (req, res) => {
    try {
      const z = Number(req.query.z);
      const x = Number(req.query.x);
      const y = Number(req.query.y);

      if (
        !Number.isInteger(z) || z < 0 || z > 10 ||
        !Number.isInteger(x) || x < 0 || x >= 2 ** z ||
        !Number.isInteger(y) || y < 0 || y >= 2 ** z
      ) {
        return res.status(400).send('Invalid Europe/Africa IR tile request');
      }

      const n = 2 ** z;
      const lon1 = x / n * 360 - 180;
      const lon2 = (x + 1) / n * 360 - 180;

      const tileYToLat = (tileY: number) => {
        const a = Math.PI - 2 * Math.PI * tileY / n;
        return 180 / Math.PI * Math.atan(Math.sinh(a));
      };

      const lat1 = tileYToLat(y + 1);
      const lat2 = tileYToLat(y);

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        VERSION: '1.1.1',
        LAYERS: 'mumi:wideareacoverage_rgb_dust',
        STYLES: '',
        FORMAT: 'image/png',
        TRANSPARENT: 'TRUE',
        SRS: 'EPSG:4326',
        BBOX: `${lon1},${lat1},${lon2},${lat2}`,
        WIDTH: '256',
        HEIGHT: '256',
      });

      const response = await fetch(
        `https://view.eumetsat.int/geoserver/wms?${params.toString()}`,
        {
          headers: {
            Accept: 'image/png,image/*;q=0.9,*/*;q=0.5',
            Referer: 'https://view.eumetsat.int/',
            'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
          },
          signal: AbortSignal.timeout(20000),
        },
      );

      if (!response.ok) {
        throw new Error(`EUMETSAT GEO-Ring returned ${response.status}`);
      }

      const type = response.headers.get('content-type') || '';
      if (!type.toLowerCase().startsWith('image/')) {
        throw new Error(`EUMETSAT GEO-Ring returned ${type || 'non-image'}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
        throw new Error('Invalid Europe/Africa IR tile');
      }

      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'public, max-age=900');
      return res.send(bytes);
    } catch (error) {
      console.error('Europe/Africa IR tile failed:', error);
      return res.status(502).send('Europe/Africa IR unavailable');
    }
  });


  // Africa IR satellite fallback via EUMETSAT GEO-Ring.
  app.get('/api/africa-ir-tile', async (req, res) => {
    try {
      const z = Number(req.query.z);
      const x = Number(req.query.x);
      const y = Number(req.query.y);

      if (
        !Number.isInteger(z) || z < 0 || z > 10 ||
        !Number.isInteger(x) || x < 0 || x >= 2 ** z ||
        !Number.isInteger(y) || y < 0 || y >= 2 ** z
      ) {
        return res.status(400).send('Invalid Africa IR tile request');
      }

      const n = 2 ** z;
      const west = x / n * 360 - 180;
      const east = (x + 1) / n * 360 - 180;

      const tileYToLat = (tileY: number) => {
        const a = Math.PI - (2 * Math.PI * tileY) / n;
        return (180 / Math.PI) * Math.atan(Math.sinh(a));
      };

      const south = tileYToLat(y + 1);
      const north = tileYToLat(y);

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        VERSION: '1.1.1',
        LAYERS: 'mumi:wideareacoverage_rgb_dust',
        STYLES: '',
        FORMAT: 'image/png',
        TRANSPARENT: 'TRUE',
        SRS: 'EPSG:4326',
        BBOX: `${west},${south},${east},${north}`,
        WIDTH: '256',
        HEIGHT: '256',
      });

      const response = await fetch(
        `https://view.eumetsat.int/geoserver/wms?${params.toString()}`,
        {
          headers: {
            Accept: 'image/png,image/*;q=0.9,*/*;q=0.5',
            Referer: 'https://view.eumetsat.int/',
            'User-Agent': 'WeatherNow dashboard/1.0',
          },
          signal: AbortSignal.timeout(20000),
        },
      );

      if (!response.ok) {
        throw new Error(`EUMETSAT Africa IR returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`EUMETSAT Africa IR returned ${contentType || 'non-image'}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
        throw new Error('Invalid Africa IR tile');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=900');
      return res.send(bytes);
    } catch (error) {
      console.error('Africa IR tile failed:', error);
      return res.status(502).send('Africa IR unavailable');
    }
  });


  // MTG Enhanced IR RGB for Europe and Africa.
  // EUMETSAT GeoColour uses natural colour during daytime and an IR-based
  // cloud composite at night.
  app.get('/api/mtg-enhanced-ir-tile', async (req, res) => {
    const z = Number(req.query.z);
    const x = Number(req.query.x);
    const y = Number(req.query.y);

    if (
      !Number.isInteger(z) || z < 0 || z > 10 ||
      !Number.isInteger(x) || x < 0 || x >= 2 ** z ||
      !Number.isInteger(y) || y < 0 || y >= 2 ** z
    ) {
      return res.status(400).send('Invalid MTG Enhanced IR tile request');
    }

    // If EUMETSAT has just rejected this layer/request form, do not generate
    // dozens of identical WMS exception requests for every visible map tile.
    if (Date.now() < mtgEnhancedIrUnavailableUntil) {
      return res.status(503).send('MTG Enhanced IR temporarily unavailable');
    }

    try {
      // Use Web Mercator for XYZ tiles. The previous EPSG:4326 request was
      // returning an OGC ServiceException XML document instead of an image.
      const ORIGIN = 20037508.342789244;
      const tiles = 2 ** z;
      const span = (ORIGIN * 2) / tiles;
      const minX = -ORIGIN + x * span;
      const maxX = minX + span;
      const maxY = ORIGIN - y * span;
      const minY = maxY - span;
      const bbox = `${minX},${minY},${maxX},${maxY}`;

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        VERSION: '1.3.0',
        LAYERS: 'mtg_fd:ir105_hrfi',
        STYLES: '',
        FORMAT: 'image/png',
        TRANSPARENT: 'TRUE',
        CRS: 'EPSG:3857',
        BBOX: bbox,
        WIDTH: '256',
        HEIGHT: '256',
      });

      const response = await fetch(
        `https://view.eumetsat.int/geoserver/wms?${params.toString()}`,
        {
          headers: {
            Accept: 'image/png,image/*;q=0.9,*/*;q=0.5',
            Referer: 'https://view.eumetsat.int/',
            'User-Agent': 'WeatherNow dashboard/1.0',
          },
          signal: AbortSignal.timeout(20_000),
        },
      );

      if (!response.ok) {
        throw new Error(`MTG Enhanced IR returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) {
        // EUMETSAT returns application/vnd.ogc.se_xml for WMS exceptions.
        // Cool down the whole layer briefly so the map does not spam one
        // exception per tile while the upstream layer/request is unavailable.
        mtgEnhancedIrUnavailableUntil = Date.now() + 5 * 60_000;
        console.warn(`MTG Enhanced IR temporarily unavailable (${contentType || 'non-image'}); pausing tile requests for 5 minutes.`);
        return res.status(503).send('MTG Enhanced IR temporarily unavailable');
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
        throw new Error('Invalid MTG Enhanced IR tile');
      }

      mtgEnhancedIrUnavailableUntil = 0;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(bytes);
    } catch (error: any) {
      mtgEnhancedIrUnavailableUntil = Date.now() + 5 * 60_000;

      const timedOut =
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError' ||
        error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        /timeout|timed out|aborted/i.test(String(error?.message || ''));

      console.warn(
        timedOut
          ? 'MTG Enhanced IR timed out; pausing tile requests for 5 minutes.'
          : `MTG Enhanced IR temporarily unavailable; pausing tile requests for 5 minutes.`
      );

      return res.status(503).send('MTG Enhanced IR temporarily unavailable');
    }
  });

  // 7. Radar Proxy
  // Keep both the RainViewer metadata and image tiles behind WeatherNow's
  // same-origin API. This avoids browser/network privacy filters blocking the
  // external tile host while still using RainViewer's current hash-based paths.
  app.get("/api/radar", async (_req, res) => {
    try {
      let response: Response | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0 (WeatherNow dashboard)",
            },
            signal: AbortSignal.timeout(12_000),
          });

          if (!response.ok) throw new Error(`RainViewer API Error: ${response.status}`);
          break;
        } catch (error) {
          lastError = error;
          response = null;
          if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 400));
        }
      }

      if (!response) throw lastError;
      const data = await response.json();
      rainViewerRadarCache = { savedAt: Date.now(), data };

      res.setHeader("Cache-Control", "no-store");
      return res.json(data);
    } catch (error: any) {
      const timedOut =
        error?.name === "TimeoutError" ||
        error?.name === "AbortError" ||
        error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        /timeout|timed out|aborted/i.test(String(error?.message || ""));

      if (rainViewerRadarCache) {
        console.warn(
          timedOut
            ? "RainViewer radar timed out; serving cached radar metadata."
            : "RainViewer radar unavailable; serving cached radar metadata."
        );
        res.setHeader("Cache-Control", "no-store");
        return res.json({
          ...rainViewerRadarCache.data,
          cached: true,
          cachedAt: rainViewerRadarCache.savedAt,
        });
      }

      if (timedOut) {
        console.warn("RainViewer radar connection timed out; no cached radar metadata is available yet.");
      } else {
        console.warn("RainViewer radar is temporarily unavailable; no cached radar metadata is available yet.");
      }

      return res.status(503).json({
        error: "Radar data is temporarily unavailable",
        retryable: true,
      });
    }
  });

  const radarTileCache = new Map<string, { savedAt: number; contentType: string; bytes: Buffer }>();
  const radarTileInFlight = new Map<string, Promise<{ contentType: string; bytes: Buffer }>>();
  const RADAR_TILE_FRESH_MS = 10 * 60_000;
  const RADAR_TILE_STALE_MS = 60 * 60_000;

  app.get('/api/radar-tile', async (req, res) => {
    let tileKey = '';
    try {
      const framePath = typeof req.query.path === 'string' ? req.query.path : '';
      const z = Number(req.query.z);
      const x = Number(req.query.x);
      const y = Number(req.query.y);
      if (!/^\/v2\/radar\/[A-Za-z0-9_-]+$/.test(framePath) || !Number.isInteger(z) || z < 0 || z > 7 ||
          !Number.isInteger(x) || x < 0 || !Number.isInteger(y) || y < 0) {
        return res.status(400).send('Invalid radar tile request');
      }
      tileKey = `${framePath}|${z}|${x}|${y}`;
      const cached = radarTileCache.get(tileKey);
      if (cached && Date.now() - cached.savedAt <= RADAR_TILE_FRESH_MS) {
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
        return res.send(cached.bytes);
      }

      let requestPromise = radarTileInFlight.get(tileKey);
      if (!requestPromise) {
        requestPromise = (async () => {
          const tileUrl = `https://tilecache.rainviewer.com${framePath}/256/${z}/${x}/${y}/2/1_1.png`;
          const response = await fetch(tileUrl, {
            headers: {
              Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
              Referer: 'https://www.rainviewer.com/',
              'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
            },
            signal: AbortSignal.timeout(8_000),
          });
          if (!response.ok) throw new Error(`RainViewer tile returned ${response.status}`);
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.toLowerCase().startsWith('image/')) throw new Error('RainViewer tile was not an image');
          const bytes = Buffer.from(await response.arrayBuffer());
          if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new Error('Invalid RainViewer tile size');
          const result = { contentType, bytes };
          radarTileCache.set(tileKey, { savedAt: Date.now(), ...result });
          if (radarTileCache.size > 800) {
            const firstKey = radarTileCache.keys().next().value;
            if (firstKey) radarTileCache.delete(firstKey);
          }
          return result;
        })();
        radarTileInFlight.set(tileKey, requestPromise);
        requestPromise.finally(() => radarTileInFlight.delete(tileKey)).catch(() => undefined);
      }

      const tile = await requestPromise;
      res.setHeader('Content-Type', tile.contentType);
      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
      return res.send(tile.bytes);
    } catch (error: any) {
      const cached = tileKey ? radarTileCache.get(tileKey) : undefined;
      if (cached && Date.now() - cached.savedAt <= RADAR_TILE_STALE_MS) {
        console.warn('RainViewer tile upstream failed; serving stale cached tile.');
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.setHeader('Warning', '110 - Response is stale');
        return res.send(cached.bytes);
      }

      const timedOut =
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError' ||
        error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error?.cause?.code === 'ETIMEDOUT' ||
        /timeout|timed out|ETIMEDOUT/i.test(String(error?.message || ''));
      console.warn(timedOut ? 'RainViewer radar tile timed out.' : 'RainViewer radar tile unavailable.');
      return res.status(502).send('Radar tile unavailable');
    }
  });

  // PAGASA hybrid rainfall mosaic (Philippines). The endpoint returns a
  // timeline of published radar images; the client selects the newest frame.
  app.get("/api/pagasa-radar", async (_req, res) => {
    try {
      const endpoint = "https://bagong.pagasa.dost.gov.ph/api/HybridTimeline";
      const requestHeaders = {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (WeatherNow dashboard)",
        Referer: "https://bagong.pagasa.dost.gov.ph/radar",
        Origin: "https://bagong.pagasa.dost.gov.ph",
      };
      let response = await fetch(endpoint, { method: "POST", headers: requestHeaders, body: "{}", signal: AbortSignal.timeout(12_000) });
      // PAGASA has changed this endpoint's accepted method before. A GET retry
      // keeps the rainfall layer alive if that happens again.
      if (!response.ok) response = await fetch(endpoint, { headers: requestHeaders, signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error(`PAGASA radar API Error: ${response.status}`);
      const data = await response.json();
      const frames: any[] = [];
      const seen = new Set<any>();
      const collectFrames = (value: any, depth = 0) => {
        if (depth > 5 || value == null || seen.has(value)) return;
        if (typeof value === 'object') seen.add(value);
        if (Array.isArray(value)) { value.forEach(item => collectFrames(item, depth + 1)); return; }
        if (typeof value !== 'object') return;
        if (typeof value.url === 'string' && (value.time != null || value.datetime != null || value.date != null)) {
          frames.push({ ...value, time: value.time ?? value.datetime ?? value.date });
        }
        Object.values(value).forEach(item => collectFrames(item, depth + 1));
      };
      // Prefer the documented rainfall estimate collection, but tolerate
      // harmless response wrappers/renames from the official endpoint.
      collectFrames(data?.rainfall_estimate ?? data);
      const latest = [...frames].filter(frame => frame?.url).sort((a, b) => {
        const aTime = Date.parse(String(a?.time || '')) || Number(a?.time) || 0;
        const bTime = Date.parse(String(b?.time || '')) || Number(b?.time) || 0;
        return aTime - bTime;
      }).at(-1);
      if (!latest?.url) return res.status(404).json({ error: "No PAGASA radar frame available" });
      const imageUrl = new URL(latest.url);
      const radarHost = imageUrl.hostname.toLowerCase();
      const officialRadarHost = radarHost === 'api.meteopilipinas.gov.ph' || radarHost.endsWith('.meteopilipinas.gov.ph') ||
        radarHost === 'pagasa.dost.gov.ph' || radarHost.endsWith('.pagasa.dost.gov.ph') ||
        radarHost === 'panahon.gov.ph' || radarHost.endsWith('.panahon.gov.ph');
      if (imageUrl.protocol !== 'https:' || !officialRadarHost) {
        throw new Error(`PAGASA returned an unexpected radar image host: ${radarHost}`);
      }
      let usedCachedFrame = false;
      try {
        const image = await fetchPagasaRadarBytes(imageUrl);
        const contentType = image.contentType;
        if (image.status < 200 || image.status >= 300 || !contentType.toLowerCase().startsWith('image/')) throw new Error(`PAGASA image returned ${image.status}`);
        const bytes = image.bytes;
        const prefix = bytes.subarray(0, 12);
        const isPng = prefix.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
        const isJpeg = prefix.subarray(0, 3).toString('hex') === 'ffd8ff';
        const isWebp = prefix.subarray(0, 4).toString('ascii') === 'RIFF' && prefix.subarray(8, 12).toString('ascii') === 'WEBP';
        if (bytes.length < 12 || bytes.length > 20 * 1024 * 1024 || (!isPng && !isJpeg && !isWebp)) throw new Error('PAGASA radar response was not a supported image');
        pagasaRadarCache = { time: String(latest.time || ''), sourceUrl: imageUrl.href, contentType, bytes, savedAt: Date.now() };
      } catch (imageError) {
        // A recent official frame is safer than an empty layer during a short
        // PAGASA image-host outage. Never claim the cached frame is current.
        if (!pagasaRadarCache || Date.now() - pagasaRadarCache.savedAt > 6 * 60 * 60_000) throw imageError;
        usedCachedFrame = true;
      }
      res.setHeader("Cache-Control", "no-store");
      res.json({ time: pagasaRadarCache!.time, url: '/api/pagasa-radar-image', cached: usedCachedFrame });
    } catch (error) {
      console.error("Server proxy error (PAGASA radar):", error);
      res.status(502).json({ error: "Failed to fetch PAGASA radar data" });
    }
  });

  app.get('/api/pagasa-radar-image', (_req, res) => {
    if (!pagasaRadarCache) return res.status(404).json({ error: 'No verified PAGASA radar image is cached.' });
    res.setHeader('Content-Type', pagasaRadarCache.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(pagasaRadarCache.bytes);
  });

  // Public legal pages for Google OAuth / WeatherNow.
  // The Settings language is passed as ?lang= so these pages use the same
  // language on desktop, tablet, and mobile. Direct public links default to English.
  type LegalSection = { heading: string; paragraphs: string[] };
  type LegalDocument = { title: string; heading: string; intro: string; sections: LegalSection[]; contactHeading: string; contactBefore: string; contactLink: string };
  type LegalLanguageContent = { dir: 'ltr' | 'rtl'; close: string; closeTitle: string; legalNav: string; privacyLabel: string; termsLabel: string; effective: string; privacy: LegalDocument; terms: LegalDocument };
  const legalContent = {
  "en": {
    "dir": "ltr",
    "close": "Close and return to dashboard",
    "closeTitle": "Close",
    "legalNav": "Legal and app links",
    "privacyLabel": "Privacy Policy",
    "termsLabel": "Terms of Service",
    "effective": "Effective date: September 12, 2026",
    "privacy": {
      "title": "Privacy Policy",
      "heading": "WeatherNow Privacy Policy",
      "intro": "WeatherNow provides weather information, maps, forecasts, environmental information, news, calendar features, a personal weather journal, and optional media features. This Privacy Policy explains how information is handled when you use WeatherNow.",
      "sections": [
        {
          "heading": "Information you provide or authorize",
          "paragraphs": [
            "WeatherNow may process information you choose to provide, including saved locations, settings, journal entries, and photos you add to journal entries. When you choose to connect a Google account, WeatherNow requests access only for Google-integrated features that you initiate, such as Calendar access and journal-related synchronization."
          ]
        },
        {
          "heading": "Google account information",
          "paragraphs": [
            "If you sign in with Google, WeatherNow may receive basic account information such as your email address and an OAuth access token needed to use the Google features you authorize. The dashboard uses that authorization to load Google Calendar information and to provide Google-connected journal functionality.",
            "WeatherNow's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements."
          ]
        },
        {
          "heading": "Calendar and journal data",
          "paragraphs": [
            "Calendar information is used to display events and calendar sources inside WeatherNow. Journal information is used to provide the personal weather journal and, when Google-connected features are enabled, to support synchronization or backup functionality initiated by you."
          ]
        },
        {
          "heading": "Location information",
          "paragraphs": [
            "If you allow device location access, WeatherNow uses your coordinates to provide local weather, forecasts, maps, environmental information, and nearby or location-based results. You can also search for or select locations manually."
          ]
        },
        {
          "heading": "Local browser storage",
          "paragraphs": [
            "WeatherNow uses browser storage for app settings, saved locations, cached weather or environmental information, installation state, and other data needed to keep the dashboard working between sessions. Clearing browser or site data may remove locally stored information."
          ]
        },
        {
          "heading": "Third-party services",
          "paragraphs": [
            "WeatherNow retrieves information or functionality from third-party services used by the dashboard, which may include Google services, Open-Meteo, OpenStreetMap-related services, weather agencies, satellite/radar providers, YouTube, and news publishers. Those providers may process requests under their own privacy policies and terms."
          ]
        },
        {
          "heading": "Sharing and sale of personal information",
          "paragraphs": [
            "WeatherNow does not sell your personal information. Information is shared with third-party providers only as needed to provide features you request or when required by law."
          ]
        },
        {
          "heading": "Data retention and control",
          "paragraphs": [
            "You can disconnect your Google account from WeatherNow by signing out. You can also remove WeatherNow's Google account access from your Google Account permissions. Locally stored dashboard data can be removed by clearing the site's browser storage. Data stored in your own Google account remains subject to Google's controls and retention settings."
          ]
        },
        {
          "heading": "Security",
          "paragraphs": [
            "WeatherNow uses standard browser security mechanisms and HTTPS when deployed securely. No internet service can guarantee absolute security, so users should avoid placing highly sensitive information in journal entries."
          ]
        },
        {
          "heading": "Children",
          "paragraphs": [
            "WeatherNow is not intended to knowingly collect personal information from children in violation of applicable law."
          ]
        },
        {
          "heading": "Changes to this policy",
          "paragraphs": [
            "This Privacy Policy may be updated as WeatherNow features or legal requirements change. The effective date above will be updated when material changes are made."
          ]
        }
      ],
      "contactHeading": "Contact",
      "contactBefore": "For privacy questions about WeatherNow, contact the developer through the",
      "contactLink": "WeatherNow GitHub repository"
    },
    "terms": {
      "title": "Terms of Service",
      "heading": "WeatherNow Terms of Service",
      "intro": "These Terms of Service govern your use of WeatherNow. By using WeatherNow, you agree to these terms.",
      "sections": [
        {
          "heading": "Weather and environmental information",
          "paragraphs": [
            "WeatherNow combines information from external weather, environmental, mapping, satellite, radar, and related providers. Forecasts and observations may be delayed, incomplete, unavailable, or inaccurate. WeatherNow is provided for general informational purposes and must not be treated as an official emergency, aviation, marine-navigation, medical, or life-safety service."
          ]
        },
        {
          "heading": "Google-connected features",
          "paragraphs": [
            "Google Calendar and other Google-connected functionality is optional. By connecting a Google account, you authorize WeatherNow to use the permissions you approve for the features you choose to use. You remain responsible for your Google account and may revoke WeatherNow access through your Google Account settings."
          ]
        },
        {
          "heading": "Journal and user content",
          "paragraphs": [
            "You are responsible for journal text, photos, locations, and other content you add to WeatherNow. Do not upload content you do not have the right to use. You are responsible for maintaining any backups you consider important."
          ]
        },
        {
          "heading": "Third-party services and content",
          "paragraphs": [
            "WeatherNow may display or link to information from third parties, including weather providers, map services, news publishers, Google services, YouTube, and other data providers. Their services, content, availability, and policies are controlled by those providers, not WeatherNow."
          ]
        },
        {
          "heading": "Acceptable use",
          "paragraphs": [
            "You may not use WeatherNow to violate applicable law, interfere with the service, attempt unauthorized access to accounts or systems, abuse third-party APIs, or misuse content supplied by third-party providers."
          ]
        },
        {
          "heading": "Availability and changes",
          "paragraphs": [
            "WeatherNow may change, suspend, or discontinue features when providers, APIs, technical requirements, or project needs change. Continuous availability is not guaranteed."
          ]
        },
        {
          "heading": "No warranties",
          "paragraphs": [
            "WeatherNow is provided on an \"as is\" and \"as available\" basis without warranties of uninterrupted operation, error-free data, forecast accuracy, or fitness for a particular purpose, to the extent permitted by applicable law."
          ]
        },
        {
          "heading": "Limitation of liability",
          "paragraphs": [
            "To the extent permitted by applicable law, the developer of WeatherNow is not liable for losses resulting from reliance on weather information, provider outages, unavailable features, lost locally stored data, third-party content, or use of the service."
          ]
        },
        {
          "heading": "Changes to these terms",
          "paragraphs": [
            "These Terms may be updated as WeatherNow changes. Continued use after an updated version is published constitutes acceptance of the revised Terms to the extent permitted by applicable law."
          ]
        }
      ],
      "contactHeading": "Contact",
      "contactBefore": "Questions about these Terms can be raised through the",
      "contactLink": "WeatherNow GitHub repository"
    }
  },
  "es": {
    "dir": "ltr",
    "close": "Cerrar y volver al panel",
    "closeTitle": "Cerrar",
    "legalNav": "Enlaces legales y de la aplicación",
    "privacyLabel": "Política de privacidad",
    "termsLabel": "Términos del servicio",
    "effective": "Fecha de entrada en vigor: 12 de septiembre de 2026",
    "privacy": {
      "title": "Política de privacidad",
      "heading": "Política de privacidad de WeatherNow",
      "intro": "WeatherNow ofrece información meteorológica, mapas, pronósticos, información ambiental, noticias, funciones de calendario, un diario meteorológico personal y funciones multimedia opcionales. Esta Política de privacidad explica cómo se maneja la información cuando usas WeatherNow.",
      "sections": [
        {
          "heading": "Información que proporcionas o autorizas",
          "paragraphs": [
            "WeatherNow puede procesar la información que decidas proporcionar, incluidas ubicaciones guardadas, ajustes, entradas del diario y fotos que añadas. Si conectas una cuenta de Google, WeatherNow solicita acceso solo para las funciones integradas con Google que tú inicias, como el acceso al Calendario y la sincronización relacionada con el diario."
          ]
        },
        {
          "heading": "Información de la cuenta de Google",
          "paragraphs": [
            "Si inicias sesión con Google, WeatherNow puede recibir información básica de la cuenta, como tu correo electrónico y un token de acceso OAuth necesario para usar las funciones de Google que autorices. El panel usa esa autorización para cargar información de Google Calendar y ofrecer funciones del diario conectadas con Google.",
            "El uso y la transferencia por WeatherNow de información recibida de las API de Google cumplirán la Política de datos de usuario de los servicios API de Google, incluidos los requisitos de Uso limitado."
          ]
        },
        {
          "heading": "Datos del calendario y del diario",
          "paragraphs": [
            "La información del calendario se usa para mostrar eventos y fuentes de calendario dentro de WeatherNow. La información del diario se usa para ofrecer el diario meteorológico personal y, cuando están activadas las funciones conectadas con Google, para admitir la sincronización o copia de seguridad iniciada por ti."
          ]
        },
        {
          "heading": "Información de ubicación",
          "paragraphs": [
            "Si permites el acceso a la ubicación del dispositivo, WeatherNow usa tus coordenadas para ofrecer clima local, pronósticos, mapas, información ambiental y resultados cercanos o basados en ubicación. También puedes buscar o seleccionar ubicaciones manualmente."
          ]
        },
        {
          "heading": "Almacenamiento local del navegador",
          "paragraphs": [
            "WeatherNow usa el almacenamiento del navegador para ajustes de la aplicación, ubicaciones guardadas, información meteorológica o ambiental en caché, estado de instalación y otros datos necesarios para mantener el panel entre sesiones. Borrar los datos del navegador o del sitio puede eliminar información almacenada localmente."
          ]
        },
        {
          "heading": "Servicios de terceros",
          "paragraphs": [
            "WeatherNow obtiene información o funciones de servicios de terceros, que pueden incluir servicios de Google, Open-Meteo, servicios relacionados con OpenStreetMap, agencias meteorológicas, proveedores de satélite/radar, YouTube y editores de noticias. Esos proveedores pueden procesar solicitudes conforme a sus propias políticas y términos."
          ]
        },
        {
          "heading": "Compartición y venta de información personal",
          "paragraphs": [
            "WeatherNow no vende tu información personal. La información solo se comparte con proveedores externos cuando es necesario para ofrecer las funciones que solicitas o cuando lo exige la ley."
          ]
        },
        {
          "heading": "Conservación y control de datos",
          "paragraphs": [
            "Puedes desconectar tu cuenta de Google de WeatherNow cerrando sesión. También puedes retirar el acceso de WeatherNow desde los permisos de tu Cuenta de Google. Los datos guardados localmente pueden eliminarse borrando el almacenamiento del sitio. Los datos almacenados en tu propia cuenta de Google siguen sujetos a los controles y plazos de conservación de Google."
          ]
        },
        {
          "heading": "Seguridad",
          "paragraphs": [
            "WeatherNow usa mecanismos de seguridad estándar del navegador y HTTPS cuando se despliega de forma segura. Ningún servicio de Internet puede garantizar seguridad absoluta, por lo que debes evitar incluir información muy sensible en las entradas del diario."
          ]
        },
        {
          "heading": "Menores",
          "paragraphs": [
            "WeatherNow no está destinado a recopilar conscientemente información personal de menores de forma contraria a la legislación aplicable."
          ]
        },
        {
          "heading": "Cambios en esta política",
          "paragraphs": [
            "Esta Política de privacidad puede actualizarse cuando cambien las funciones de WeatherNow o los requisitos legales. La fecha de entrada en vigor se actualizará cuando haya cambios importantes."
          ]
        }
      ],
      "contactHeading": "Contacto",
      "contactBefore": "Para preguntas de privacidad sobre WeatherNow, contacta con el desarrollador mediante el",
      "contactLink": "repositorio de WeatherNow en GitHub"
    },
    "terms": {
      "title": "Términos del servicio",
      "heading": "Términos del servicio de WeatherNow",
      "intro": "Estos Términos del servicio regulan tu uso de WeatherNow. Al usar WeatherNow, aceptas estos términos.",
      "sections": [
        {
          "heading": "Información meteorológica y ambiental",
          "paragraphs": [
            "WeatherNow combina información de proveedores externos de meteorología, medio ambiente, mapas, satélite, radar y servicios relacionados. Los pronósticos y observaciones pueden retrasarse, ser incompletos, no estar disponibles o ser inexactos. WeatherNow se ofrece con fines informativos generales y no debe tratarse como un servicio oficial de emergencias, aviación, navegación marítima, medicina o seguridad vital."
          ]
        },
        {
          "heading": "Funciones conectadas con Google",
          "paragraphs": [
            "Google Calendar y otras funciones conectadas con Google son opcionales. Al conectar una cuenta de Google, autorizas a WeatherNow a usar los permisos que apruebes para las funciones que elijas. Sigues siendo responsable de tu cuenta de Google y puedes revocar el acceso de WeatherNow desde los ajustes de tu Cuenta de Google."
          ]
        },
        {
          "heading": "Diario y contenido del usuario",
          "paragraphs": [
            "Eres responsable del texto del diario, fotos, ubicaciones y demás contenido que añadas a WeatherNow. No subas contenido que no tengas derecho a usar. También eres responsable de mantener las copias de seguridad que consideres importantes."
          ]
        },
        {
          "heading": "Servicios y contenido de terceros",
          "paragraphs": [
            "WeatherNow puede mostrar o enlazar información de terceros, incluidos proveedores meteorológicos, servicios de mapas, editores de noticias, servicios de Google, YouTube y otros proveedores de datos. Sus servicios, contenido, disponibilidad y políticas están controlados por esos proveedores, no por WeatherNow."
          ]
        },
        {
          "heading": "Uso aceptable",
          "paragraphs": [
            "No puedes usar WeatherNow para infringir la ley aplicable, interferir con el servicio, intentar acceso no autorizado a cuentas o sistemas, abusar de API de terceros ni utilizar indebidamente contenido de proveedores externos."
          ]
        },
        {
          "heading": "Disponibilidad y cambios",
          "paragraphs": [
            "WeatherNow puede cambiar, suspender o retirar funciones cuando cambien los proveedores, API, requisitos técnicos o necesidades del proyecto. No se garantiza disponibilidad continua."
          ]
        },
        {
          "heading": "Sin garantías",
          "paragraphs": [
            "WeatherNow se proporciona «tal cual» y «según disponibilidad», sin garantías de funcionamiento ininterrumpido, datos sin errores, exactitud de los pronósticos o idoneidad para un fin concreto, en la medida permitida por la ley aplicable."
          ]
        },
        {
          "heading": "Limitación de responsabilidad",
          "paragraphs": [
            "En la medida permitida por la ley aplicable, el desarrollador de WeatherNow no responde por pérdidas derivadas de confiar en información meteorológica, interrupciones de proveedores, funciones no disponibles, pérdida de datos locales, contenido de terceros o uso del servicio."
          ]
        },
        {
          "heading": "Cambios en estos términos",
          "paragraphs": [
            "Estos Términos pueden actualizarse cuando cambie WeatherNow. El uso continuado tras publicarse una versión actualizada constituye aceptación de los Términos revisados en la medida permitida por la ley aplicable."
          ]
        }
      ],
      "contactHeading": "Contacto",
      "contactBefore": "Las preguntas sobre estos Términos pueden plantearse mediante el",
      "contactLink": "repositorio de WeatherNow en GitHub"
    }
  },
  "fr": {
    "dir": "ltr",
    "close": "Fermer et revenir au tableau de bord",
    "closeTitle": "Fermer",
    "legalNav": "Liens juridiques et de l’application",
    "privacyLabel": "Politique de confidentialité",
    "termsLabel": "Conditions d’utilisation",
    "effective": "Date d’entrée en vigueur : 12 septembre 2026",
    "privacy": {
      "title": "Politique de confidentialité",
      "heading": "Politique de confidentialité de WeatherNow",
      "intro": "WeatherNow fournit des informations météo, des cartes, des prévisions, des informations environnementales, des actualités, des fonctions de calendrier, un journal météo personnel et des fonctions multimédias facultatives. Cette politique explique comment les informations sont traitées lorsque vous utilisez WeatherNow.",
      "sections": [
        {
          "heading": "Informations que vous fournissez ou autorisez",
          "paragraphs": [
            "WeatherNow peut traiter les informations que vous choisissez de fournir, notamment les lieux enregistrés, les réglages, les entrées du journal et les photos ajoutées au journal. Si vous connectez un compte Google, WeatherNow demande uniquement les accès nécessaires aux fonctions Google que vous déclenchez, comme le calendrier et la synchronisation du journal."
          ]
        },
        {
          "heading": "Informations du compte Google",
          "paragraphs": [
            "Si vous vous connectez avec Google, WeatherNow peut recevoir des informations de base telles que votre adresse e-mail et un jeton d’accès OAuth nécessaire aux fonctions Google que vous autorisez. Le tableau de bord utilise cette autorisation pour charger Google Calendar et fournir les fonctions du journal liées à Google.",
            "L’utilisation et le transfert par WeatherNow des informations reçues des API Google respecteront la politique relative aux données utilisateur des services API Google, y compris les exigences d’utilisation limitée."
          ]
        },
        {
          "heading": "Données du calendrier et du journal",
          "paragraphs": [
            "Les informations du calendrier servent à afficher les événements et les sources de calendrier dans WeatherNow. Les informations du journal servent au journal météo personnel et, lorsque les fonctions Google sont activées, à la synchronisation ou à la sauvegarde que vous initiez."
          ]
        },
        {
          "heading": "Informations de localisation",
          "paragraphs": [
            "Si vous autorisez l’accès à la localisation de l’appareil, WeatherNow utilise vos coordonnées pour fournir la météo locale, les prévisions, les cartes, les informations environnementales et les résultats proches ou géolocalisés. Vous pouvez aussi rechercher ou choisir un lieu manuellement."
          ]
        },
        {
          "heading": "Stockage local du navigateur",
          "paragraphs": [
            "WeatherNow utilise le stockage du navigateur pour les réglages, les lieux enregistrés, les données météo ou environnementales en cache, l’état d’installation et d’autres données nécessaires entre les sessions. Effacer les données du navigateur ou du site peut supprimer les informations stockées localement."
          ]
        },
        {
          "heading": "Services tiers",
          "paragraphs": [
            "WeatherNow récupère des informations ou fonctions auprès de services tiers, notamment Google, Open-Meteo, des services liés à OpenStreetMap, des agences météo, des fournisseurs satellite/radar, YouTube et des éditeurs d’actualités. Ces fournisseurs peuvent traiter les requêtes selon leurs propres politiques et conditions."
          ]
        },
        {
          "heading": "Partage et vente des informations personnelles",
          "paragraphs": [
            "WeatherNow ne vend pas vos informations personnelles. Elles ne sont partagées avec des prestataires tiers que lorsque cela est nécessaire pour fournir une fonction demandée ou lorsque la loi l’exige."
          ]
        },
        {
          "heading": "Conservation et contrôle des données",
          "paragraphs": [
            "Vous pouvez déconnecter votre compte Google de WeatherNow en vous déconnectant. Vous pouvez aussi retirer l’accès de WeatherNow dans les autorisations de votre compte Google. Les données locales peuvent être supprimées en effaçant le stockage du site. Les données de votre compte Google restent soumises aux contrôles et règles de conservation de Google."
          ]
        },
        {
          "heading": "Sécurité",
          "paragraphs": [
            "WeatherNow utilise les mécanismes de sécurité standard du navigateur et HTTPS lorsqu’il est déployé de façon sécurisée. Aucun service Internet ne peut garantir une sécurité absolue ; évitez donc de placer des informations très sensibles dans le journal."
          ]
        },
        {
          "heading": "Enfants",
          "paragraphs": [
            "WeatherNow n’a pas pour objectif de collecter sciemment des informations personnelles d’enfants en violation de la loi applicable."
          ]
        },
        {
          "heading": "Modifications de cette politique",
          "paragraphs": [
            "Cette politique peut être mise à jour lorsque les fonctions de WeatherNow ou les exigences légales changent. La date d’entrée en vigueur ci-dessus sera mise à jour lors de modifications importantes."
          ]
        }
      ],
      "contactHeading": "Contact",
      "contactBefore": "Pour toute question de confidentialité concernant WeatherNow, contactez le développeur via le",
      "contactLink": "dépôt GitHub de WeatherNow"
    },
    "terms": {
      "title": "Conditions d’utilisation",
      "heading": "Conditions d’utilisation de WeatherNow",
      "intro": "Ces Conditions régissent votre utilisation de WeatherNow. En utilisant WeatherNow, vous acceptez ces conditions.",
      "sections": [
        {
          "heading": "Informations météo et environnementales",
          "paragraphs": [
            "WeatherNow combine des informations provenant de fournisseurs externes de météo, d’environnement, de cartographie, de satellite, de radar et de services associés. Les prévisions et observations peuvent être retardées, incomplètes, indisponibles ou inexactes. WeatherNow est fourni à titre d’information générale et ne doit pas être considéré comme un service officiel d’urgence, d’aviation, de navigation maritime, médical ou de sécurité des personnes."
          ]
        },
        {
          "heading": "Fonctions connectées à Google",
          "paragraphs": [
            "Google Calendar et les autres fonctions liées à Google sont facultatives. En connectant un compte Google, vous autorisez WeatherNow à utiliser les permissions que vous approuvez pour les fonctions choisies. Vous restez responsable de votre compte Google et pouvez révoquer l’accès de WeatherNow dans les paramètres de votre compte Google."
          ]
        },
        {
          "heading": "Journal et contenu utilisateur",
          "paragraphs": [
            "Vous êtes responsable du texte du journal, des photos, des lieux et des autres contenus ajoutés à WeatherNow. Ne téléversez pas de contenu que vous n’avez pas le droit d’utiliser. Vous êtes responsable des sauvegardes que vous jugez importantes."
          ]
        },
        {
          "heading": "Services et contenus tiers",
          "paragraphs": [
            "WeatherNow peut afficher ou lier des informations de tiers, notamment des fournisseurs météo, services cartographiques, éditeurs d’actualités, services Google, YouTube et autres fournisseurs de données. Leurs services, contenus, disponibilité et politiques relèvent de ces fournisseurs, pas de WeatherNow."
          ]
        },
        {
          "heading": "Utilisation acceptable",
          "paragraphs": [
            "Vous ne pouvez pas utiliser WeatherNow pour enfreindre la loi, perturber le service, tenter un accès non autorisé à des comptes ou systèmes, abuser d’API tierces ou détourner du contenu fourni par des tiers."
          ]
        },
        {
          "heading": "Disponibilité et modifications",
          "paragraphs": [
            "WeatherNow peut modifier, suspendre ou supprimer des fonctions lorsque les fournisseurs, API, exigences techniques ou besoins du projet évoluent. Une disponibilité continue n’est pas garantie."
          ]
        },
        {
          "heading": "Absence de garanties",
          "paragraphs": [
            "WeatherNow est fourni « en l’état » et « selon disponibilité », sans garantie de fonctionnement ininterrompu, de données sans erreur, d’exactitude des prévisions ou d’adéquation à un usage particulier, dans les limites autorisées par la loi."
          ]
        },
        {
          "heading": "Limitation de responsabilité",
          "paragraphs": [
            "Dans les limites autorisées par la loi, le développeur de WeatherNow n’est pas responsable des pertes résultant de la confiance accordée aux informations météo, des pannes de fournisseurs, de fonctions indisponibles, de pertes de données locales, de contenus tiers ou de l’utilisation du service."
          ]
        },
        {
          "heading": "Modifications de ces conditions",
          "paragraphs": [
            "Ces Conditions peuvent être mises à jour lorsque WeatherNow évolue. La poursuite de l’utilisation après publication d’une version mise à jour vaut acceptation des Conditions révisées dans les limites autorisées par la loi."
          ]
        }
      ],
      "contactHeading": "Contact",
      "contactBefore": "Les questions concernant ces Conditions peuvent être posées via le",
      "contactLink": "dépôt GitHub de WeatherNow"
    }
  },
  "de": {
    "dir": "ltr",
    "close": "Schließen und zum Dashboard zurückkehren",
    "closeTitle": "Schließen",
    "legalNav": "Rechtliche und App-Links",
    "privacyLabel": "Datenschutzerklärung",
    "termsLabel": "Nutzungsbedingungen",
    "effective": "Gültig ab: 12. September 2026",
    "privacy": {
      "title": "Datenschutzerklärung",
      "heading": "WeatherNow Datenschutzerklärung",
      "intro": "WeatherNow bietet Wetterinformationen, Karten, Vorhersagen, Umweltdaten, Nachrichten, Kalenderfunktionen, ein persönliches Wetterjournal und optionale Medienfunktionen. Diese Datenschutzerklärung erläutert, wie Informationen bei der Nutzung von WeatherNow verarbeitet werden.",
      "sections": [
        {
          "heading": "Informationen, die Sie bereitstellen oder autorisieren",
          "paragraphs": [
            "WeatherNow kann Informationen verarbeiten, die Sie bereitstellen, darunter gespeicherte Orte, Einstellungen, Journaleinträge und Fotos. Wenn Sie ein Google-Konto verbinden, fordert WeatherNow nur Zugriff für von Ihnen gestartete Google-Funktionen an, etwa Kalenderzugriff und Journal-Synchronisierung."
          ]
        },
        {
          "heading": "Google-Kontoinformationen",
          "paragraphs": [
            "Wenn Sie sich mit Google anmelden, kann WeatherNow grundlegende Kontoinformationen wie Ihre E-Mail-Adresse und ein OAuth-Zugriffstoken erhalten, das für die von Ihnen autorisierten Google-Funktionen benötigt wird. Das Dashboard verwendet diese Autorisierung, um Google Calendar zu laden und Google-verbundene Journalfunktionen bereitzustellen.",
            "Die Nutzung und Übertragung von Informationen aus Google APIs durch WeatherNow entspricht der Google API Services User Data Policy einschließlich der Anforderungen zur eingeschränkten Nutzung."
          ]
        },
        {
          "heading": "Kalender- und Journaldaten",
          "paragraphs": [
            "Kalenderinformationen werden zur Anzeige von Ereignissen und Kalenderquellen in WeatherNow verwendet. Journalinformationen dienen dem persönlichen Wetterjournal und, wenn Google-Funktionen aktiviert sind, der von Ihnen veranlassten Synchronisierung oder Sicherung."
          ]
        },
        {
          "heading": "Standortinformationen",
          "paragraphs": [
            "Wenn Sie den Standortzugriff erlauben, nutzt WeatherNow Ihre Koordinaten für lokales Wetter, Vorhersagen, Karten, Umweltdaten und standortbezogene Ergebnisse. Orte können auch manuell gesucht oder gewählt werden."
          ]
        },
        {
          "heading": "Lokaler Browserspeicher",
          "paragraphs": [
            "WeatherNow nutzt Browserspeicher für App-Einstellungen, gespeicherte Orte, zwischengespeicherte Wetter- oder Umweltdaten, Installationsstatus und weitere Daten, die zwischen Sitzungen benötigt werden. Das Löschen von Browser- oder Websitedaten kann lokal gespeicherte Informationen entfernen."
          ]
        },
        {
          "heading": "Drittanbieterdienste",
          "paragraphs": [
            "WeatherNow bezieht Informationen oder Funktionen von Drittanbietern, darunter Google-Dienste, Open-Meteo, OpenStreetMap-bezogene Dienste, Wetterbehörden, Satelliten-/Radaranbieter, YouTube und Nachrichtenanbieter. Diese können Anfragen nach ihren eigenen Datenschutzregeln und Bedingungen verarbeiten."
          ]
        },
        {
          "heading": "Weitergabe und Verkauf personenbezogener Daten",
          "paragraphs": [
            "WeatherNow verkauft Ihre personenbezogenen Daten nicht. Informationen werden nur an Drittanbieter weitergegeben, soweit dies für angeforderte Funktionen erforderlich oder gesetzlich vorgeschrieben ist."
          ]
        },
        {
          "heading": "Datenaufbewahrung und Kontrolle",
          "paragraphs": [
            "Sie können Ihr Google-Konto durch Abmelden trennen und WeatherNow den Zugriff in den Berechtigungen Ihres Google-Kontos entziehen. Lokal gespeicherte Dashboard-Daten können durch Löschen des Website-Speichers entfernt werden. Daten in Ihrem Google-Konto unterliegen den Kontrollen und Aufbewahrungsregeln von Google."
          ]
        },
        {
          "heading": "Sicherheit",
          "paragraphs": [
            "WeatherNow verwendet übliche Browser-Sicherheitsmechanismen und bei sicherer Bereitstellung HTTPS. Kein Internetdienst kann absolute Sicherheit garantieren; vermeiden Sie daher besonders sensible Informationen in Journaleinträgen."
          ]
        },
        {
          "heading": "Kinder",
          "paragraphs": [
            "WeatherNow ist nicht dazu bestimmt, wissentlich personenbezogene Daten von Kindern unter Verstoß gegen geltendes Recht zu sammeln."
          ]
        },
        {
          "heading": "Änderungen dieser Erklärung",
          "paragraphs": [
            "Diese Datenschutzerklärung kann bei Änderungen an WeatherNow oder rechtlichen Anforderungen aktualisiert werden. Bei wesentlichen Änderungen wird das oben genannte Gültigkeitsdatum angepasst."
          ]
        }
      ],
      "contactHeading": "Kontakt",
      "contactBefore": "Bei Datenschutzfragen zu WeatherNow kontaktieren Sie den Entwickler über das",
      "contactLink": "WeatherNow-GitHub-Repository"
    },
    "terms": {
      "title": "Nutzungsbedingungen",
      "heading": "WeatherNow Nutzungsbedingungen",
      "intro": "Diese Nutzungsbedingungen regeln Ihre Nutzung von WeatherNow. Durch die Nutzung von WeatherNow stimmen Sie diesen Bedingungen zu.",
      "sections": [
        {
          "heading": "Wetter- und Umweltinformationen",
          "paragraphs": [
            "WeatherNow kombiniert Informationen externer Anbieter für Wetter, Umwelt, Karten, Satellit, Radar und verwandte Dienste. Vorhersagen und Beobachtungen können verspätet, unvollständig, nicht verfügbar oder ungenau sein. WeatherNow dient allgemeinen Informationszwecken und ist kein offizieller Dienst für Notfälle, Luftfahrt, Seeschifffahrt, Medizin oder Lebenssicherheit."
          ]
        },
        {
          "heading": "Mit Google verbundene Funktionen",
          "paragraphs": [
            "Google Calendar und andere Google-Funktionen sind optional. Durch Verbinden eines Google-Kontos autorisieren Sie WeatherNow, die von Ihnen genehmigten Berechtigungen für gewählte Funktionen zu verwenden. Sie bleiben für Ihr Google-Konto verantwortlich und können den Zugriff von WeatherNow in den Google-Kontoeinstellungen widerrufen."
          ]
        },
        {
          "heading": "Journal und Nutzerinhalte",
          "paragraphs": [
            "Sie sind für Journaltexte, Fotos, Orte und andere Inhalte verantwortlich, die Sie WeatherNow hinzufügen. Laden Sie keine Inhalte hoch, zu deren Nutzung Sie nicht berechtigt sind. Für wichtige Sicherungen sind Sie selbst verantwortlich."
          ]
        },
        {
          "heading": "Drittanbieterdienste und -inhalte",
          "paragraphs": [
            "WeatherNow kann Informationen von Drittanbietern anzeigen oder verlinken, darunter Wetteranbieter, Kartendienste, Nachrichtenanbieter, Google-Dienste, YouTube und weitere Datenanbieter. Deren Dienste, Inhalte, Verfügbarkeit und Richtlinien werden von diesen Anbietern kontrolliert, nicht von WeatherNow."
          ]
        },
        {
          "heading": "Zulässige Nutzung",
          "paragraphs": [
            "Sie dürfen WeatherNow nicht nutzen, um geltendes Recht zu verletzen, den Dienst zu stören, unbefugten Zugriff auf Konten oder Systeme zu versuchen, Drittanbieter-APIs zu missbrauchen oder Inhalte von Drittanbietern missbräuchlich zu verwenden."
          ]
        },
        {
          "heading": "Verfügbarkeit und Änderungen",
          "paragraphs": [
            "WeatherNow kann Funktionen ändern, aussetzen oder einstellen, wenn sich Anbieter, APIs, technische Anforderungen oder Projektanforderungen ändern. Eine dauerhafte Verfügbarkeit wird nicht garantiert."
          ]
        },
        {
          "heading": "Keine Gewährleistungen",
          "paragraphs": [
            "WeatherNow wird im gesetzlich zulässigen Umfang „wie besehen“ und „wie verfügbar“ ohne Gewähr für unterbrechungsfreien Betrieb, fehlerfreie Daten, Vorhersagegenauigkeit oder Eignung für einen bestimmten Zweck bereitgestellt."
          ]
        },
        {
          "heading": "Haftungsbeschränkung",
          "paragraphs": [
            "Soweit gesetzlich zulässig, haftet der Entwickler von WeatherNow nicht für Verluste durch Vertrauen auf Wetterinformationen, Anbieterausfälle, nicht verfügbare Funktionen, verlorene lokale Daten, Drittanbieterinhalte oder die Nutzung des Dienstes."
          ]
        },
        {
          "heading": "Änderungen dieser Bedingungen",
          "paragraphs": [
            "Diese Bedingungen können bei Änderungen an WeatherNow aktualisiert werden. Die fortgesetzte Nutzung nach Veröffentlichung einer aktualisierten Fassung gilt im gesetzlich zulässigen Umfang als Zustimmung zu den überarbeiteten Bedingungen."
          ]
        }
      ],
      "contactHeading": "Kontakt",
      "contactBefore": "Fragen zu diesen Bedingungen können über das",
      "contactLink": "WeatherNow-GitHub-Repository"
    }
  },
  "zh": {
    "dir": "ltr",
    "close": "关闭并返回仪表板",
    "closeTitle": "关闭",
    "legalNav": "法律与应用链接",
    "privacyLabel": "隐私政策",
    "termsLabel": "服务条款",
    "effective": "生效日期：2026年9月12日",
    "privacy": {
      "title": "隐私政策",
      "heading": "WeatherNow 隐私政策",
      "intro": "WeatherNow 提供天气信息、地图、预报、环境信息、新闻、日历功能、个人天气日志和可选媒体功能。本隐私政策说明你使用 WeatherNow 时信息如何被处理。",
      "sections": [
        {
          "heading": "你提供或授权的信息",
          "paragraphs": [
            "WeatherNow 可能处理你选择提供的信息，包括已保存地点、设置、日志条目以及添加到日志中的照片。连接 Google 帐号时，WeatherNow 仅为你主动使用的 Google 集成功能请求访问权限，例如日历访问和与日志相关的同步。"
          ]
        },
        {
          "heading": "Google 帐号信息",
          "paragraphs": [
            "如果你使用 Google 登录，WeatherNow 可能获得基本帐号信息，例如电子邮件地址，以及使用你所授权 Google 功能所需的 OAuth 访问令牌。仪表板使用该授权加载 Google 日历信息并提供与 Google 连接的日志功能。",
            "WeatherNow 对从 Google API 获取的信息的使用和传输将遵守 Google API 服务用户数据政策，包括“有限使用”要求。"
          ]
        },
        {
          "heading": "日历和日志数据",
          "paragraphs": [
            "日历信息用于在 WeatherNow 中显示事件和日历来源。日志信息用于提供个人天气日志，并在启用 Google 连接功能时支持由你发起的同步或备份。"
          ]
        },
        {
          "heading": "位置信息",
          "paragraphs": [
            "如果你允许设备位置访问，WeatherNow 会使用坐标提供本地天气、预报、地图、环境信息以及附近或基于位置的结果。你也可以手动搜索或选择地点。"
          ]
        },
        {
          "heading": "浏览器本地存储",
          "paragraphs": [
            "WeatherNow 使用浏览器存储保存应用设置、地点、缓存的天气或环境信息、安装状态以及维持跨会话运行所需的其他数据。清除浏览器或网站数据可能会删除本地保存的信息。"
          ]
        },
        {
          "heading": "第三方服务",
          "paragraphs": [
            "WeatherNow 会从第三方服务获取信息或功能，其中可能包括 Google 服务、Open-Meteo、OpenStreetMap 相关服务、气象机构、卫星/雷达提供商、YouTube 和新闻发布者。这些提供商可能依据各自的隐私政策和条款处理请求。"
          ]
        },
        {
          "heading": "个人信息的共享和出售",
          "paragraphs": [
            "WeatherNow 不出售你的个人信息。只有在提供你请求的功能所必需或法律要求时，才会与第三方提供商共享信息。"
          ]
        },
        {
          "heading": "数据保留与控制",
          "paragraphs": [
            "你可以通过退出登录断开 Google 帐号，也可以在 Google 帐号权限中撤销 WeatherNow 的访问。清除网站浏览器存储可删除本地仪表板数据。保存在你 Google 帐号中的数据仍受 Google 的控制和保留设置约束。"
          ]
        },
        {
          "heading": "安全",
          "paragraphs": [
            "WeatherNow 在安全部署时使用标准浏览器安全机制和 HTTPS。任何互联网服务都无法保证绝对安全，因此请避免在日志中填写高度敏感的信息。"
          ]
        },
        {
          "heading": "儿童",
          "paragraphs": [
            "WeatherNow 无意在违反适用法律的情况下故意收集儿童的个人信息。"
          ]
        },
        {
          "heading": "本政策的变更",
          "paragraphs": [
            "随着 WeatherNow 功能或法律要求发生变化，本隐私政策可能会更新。发生重大变更时，上述生效日期也会更新。"
          ]
        }
      ],
      "contactHeading": "联系",
      "contactBefore": "如对 WeatherNow 的隐私有疑问，请通过以下方式联系开发者：",
      "contactLink": "WeatherNow GitHub 仓库"
    },
    "terms": {
      "title": "服务条款",
      "heading": "WeatherNow 服务条款",
      "intro": "本服务条款规范你对 WeatherNow 的使用。使用 WeatherNow 即表示你同意这些条款。",
      "sections": [
        {
          "heading": "天气与环境信息",
          "paragraphs": [
            "WeatherNow 汇集外部天气、环境、地图、卫星、雷达及相关提供商的信息。预报和观测可能延迟、不完整、不可用或不准确。WeatherNow 仅用于一般信息参考，不应被视为官方应急、航空、海上导航、医疗或生命安全服务。"
          ]
        },
        {
          "heading": "Google 连接功能",
          "paragraphs": [
            "Google 日历和其他 Google 连接功能均为可选。连接 Google 帐号即表示你授权 WeatherNow 在你选择使用的功能中使用你批准的权限。你仍需对自己的 Google 帐号负责，并可在 Google 帐号设置中撤销 WeatherNow 的访问。"
          ]
        },
        {
          "heading": "日志与用户内容",
          "paragraphs": [
            "你应对添加到 WeatherNow 的日志文字、照片、地点和其他内容负责。请勿上传你无权使用的内容。你也应自行维护认为重要的备份。"
          ]
        },
        {
          "heading": "第三方服务和内容",
          "paragraphs": [
            "WeatherNow 可能显示或链接第三方信息，包括天气提供商、地图服务、新闻发布者、Google 服务、YouTube 和其他数据提供商。它们的服务、内容、可用性和政策由相应提供商控制，而非 WeatherNow。"
          ]
        },
        {
          "heading": "可接受的使用",
          "paragraphs": [
            "不得使用 WeatherNow 违反适用法律、干扰服务、尝试未经授权访问帐号或系统、滥用第三方 API，或不当使用第三方提供的内容。"
          ]
        },
        {
          "heading": "可用性与变更",
          "paragraphs": [
            "当提供商、API、技术要求或项目需求发生变化时，WeatherNow 可能更改、暂停或停止某些功能。不保证持续可用。"
          ]
        },
        {
          "heading": "不作保证",
          "paragraphs": [
            "在适用法律允许的范围内，WeatherNow 按“现状”和“可用状态”提供，不保证服务不中断、数据无错误、预报准确或适合特定用途。"
          ]
        },
        {
          "heading": "责任限制",
          "paragraphs": [
            "在适用法律允许的范围内，WeatherNow 开发者不对因依赖天气信息、提供商中断、功能不可用、本地数据丢失、第三方内容或使用本服务而造成的损失承担责任。"
          ]
        },
        {
          "heading": "条款变更",
          "paragraphs": [
            "随着 WeatherNow 的变化，本条款可能更新。在适用法律允许的范围内，更新版本发布后继续使用即表示接受修订后的条款。"
          ]
        }
      ],
      "contactHeading": "联系",
      "contactBefore": "有关这些条款的问题可通过以下方式提出：",
      "contactLink": "WeatherNow GitHub 仓库"
    }
  },
  "ja": {
    "dir": "ltr",
    "close": "閉じてダッシュボードに戻る",
    "closeTitle": "閉じる",
    "legalNav": "法的情報とアプリのリンク",
    "privacyLabel": "プライバシーポリシー",
    "termsLabel": "利用規約",
    "effective": "発効日：2026年9月12日",
    "privacy": {
      "title": "プライバシーポリシー",
      "heading": "WeatherNow プライバシーポリシー",
      "intro": "WeatherNow は、天気情報、地図、予報、環境情報、ニュース、カレンダー機能、個人用天気日記、任意のメディア機能を提供します。本ポリシーでは、WeatherNow 利用時の情報の取り扱いについて説明します。",
      "sections": [
        {
          "heading": "提供または許可する情報",
          "paragraphs": [
            "WeatherNow は、保存した場所、設定、日記の記録、日記に追加した写真など、あなたが提供する情報を処理する場合があります。Google アカウントを接続する場合、カレンダーへのアクセスや日記同期など、あなたが開始した Google 連携機能に必要な範囲でのみアクセスを求めます。"
          ]
        },
        {
          "heading": "Google アカウント情報",
          "paragraphs": [
            "Google でログインすると、WeatherNow はメールアドレスなどの基本情報と、許可した Google 機能に必要な OAuth アクセストークンを受け取る場合があります。ダッシュボードはこの認証を使って Google カレンダーを読み込み、Google 連携の日記機能を提供します。",
            "Google API から受け取った情報の WeatherNow による利用および移転は、限定的使用要件を含む Google API サービスのユーザーデータポリシーに従います。"
          ]
        },
        {
          "heading": "カレンダーと日記のデータ",
          "paragraphs": [
            "カレンダー情報は WeatherNow 内でイベントやカレンダーソースを表示するために使用されます。日記情報は個人用天気日記を提供し、Google 連携が有効な場合は、あなたが開始する同期やバックアップを支援するために使用されます。"
          ]
        },
        {
          "heading": "位置情報",
          "paragraphs": [
            "端末の位置情報へのアクセスを許可した場合、WeatherNow は座標を使って地域の天気、予報、地図、環境情報、周辺または位置ベースの結果を提供します。場所を手動で検索・選択することもできます。"
          ]
        },
        {
          "heading": "ブラウザのローカルストレージ",
          "paragraphs": [
            "WeatherNow はアプリ設定、保存場所、キャッシュされた天気・環境情報、インストール状態、セッション間で必要なその他のデータをブラウザに保存します。ブラウザまたはサイトデータを消去すると、ローカル情報が削除される場合があります。"
          ]
        },
        {
          "heading": "第三者サービス",
          "paragraphs": [
            "WeatherNow は Google、Open-Meteo、OpenStreetMap 関連サービス、気象機関、衛星・レーダー提供者、YouTube、ニュース配信元などの第三者サービスから情報や機能を取得します。各提供者は独自のポリシーと条件に従ってリクエストを処理する場合があります。"
          ]
        },
        {
          "heading": "個人情報の共有と販売",
          "paragraphs": [
            "WeatherNow は個人情報を販売しません。情報は、あなたが求める機能の提供に必要な場合、または法律で要求される場合に限り第三者と共有されます。"
          ]
        },
        {
          "heading": "データ保持と管理",
          "paragraphs": [
            "WeatherNow からログアウトして Google アカウントを切断でき、Google アカウントの権限設定から WeatherNow のアクセスを削除することもできます。サイトのブラウザストレージを消去するとローカルデータを削除できます。Google アカウント内のデータは Google の管理と保持設定に従います。"
          ]
        },
        {
          "heading": "セキュリティ",
          "paragraphs": [
            "WeatherNow は安全に展開されている場合、標準的なブラウザのセキュリティ機構と HTTPS を使用します。インターネットサービスは絶対的な安全性を保証できないため、日記に非常に機密性の高い情報を記載しないでください。"
          ]
        },
        {
          "heading": "子ども",
          "paragraphs": [
            "WeatherNow は適用法に反して子どもの個人情報を意図的に収集することを目的としていません。"
          ]
        },
        {
          "heading": "本ポリシーの変更",
          "paragraphs": [
            "WeatherNow の機能または法的要件の変更に応じて本ポリシーを更新する場合があります。重要な変更がある場合は上記の発効日を更新します。"
          ]
        }
      ],
      "contactHeading": "連絡先",
      "contactBefore": "WeatherNow のプライバシーに関する質問は、開発者へ次の場所からお問い合わせください：",
      "contactLink": "WeatherNow GitHub リポジトリ"
    },
    "terms": {
      "title": "利用規約",
      "heading": "WeatherNow 利用規約",
      "intro": "本利用規約は WeatherNow の利用に適用されます。WeatherNow を利用することで、本規約に同意したものとみなされます。",
      "sections": [
        {
          "heading": "天気および環境情報",
          "paragraphs": [
            "WeatherNow は外部の天気、環境、地図、衛星、レーダーなどの提供者から情報を組み合わせます。予報や観測は遅延、不完全、利用不能、または不正確な場合があります。WeatherNow は一般的な情報提供を目的としており、公式の緊急、航空、海上航行、医療、生命安全サービスとして扱うべきではありません。"
          ]
        },
        {
          "heading": "Google 連携機能",
          "paragraphs": [
            "Google カレンダーなどの Google 連携機能は任意です。Google アカウントを接続すると、選択した機能について承認した権限を WeatherNow が利用することを許可します。Google アカウントの管理責任はあなたにあり、Google アカウント設定から WeatherNow のアクセスを取り消せます。"
          ]
        },
        {
          "heading": "日記とユーザーコンテンツ",
          "paragraphs": [
            "WeatherNow に追加する日記の文章、写真、場所などのコンテンツについてはあなたが責任を負います。利用権のないコンテンツをアップロードしないでください。重要と考えるバックアップの維持もあなたの責任です。"
          ]
        },
        {
          "heading": "第三者サービスとコンテンツ",
          "paragraphs": [
            "WeatherNow は天気提供者、地図サービス、ニュース配信元、Google サービス、YouTube、その他のデータ提供者など、第三者の情報を表示またはリンクする場合があります。それらのサービス、内容、可用性、ポリシーは WeatherNow ではなく各提供者が管理します。"
          ]
        },
        {
          "heading": "許容される利用",
          "paragraphs": [
            "適用法への違反、サービスの妨害、アカウントやシステムへの不正アクセスの試行、第三者 API の乱用、第三者コンテンツの不正利用のために WeatherNow を使用してはいけません。"
          ]
        },
        {
          "heading": "可用性と変更",
          "paragraphs": [
            "提供者、API、技術要件、プロジェクトの必要性が変化した場合、WeatherNow は機能を変更、一時停止、終了することがあります。継続的な可用性は保証されません。"
          ]
        },
        {
          "heading": "保証の否認",
          "paragraphs": [
            "適用法で認められる範囲で、WeatherNow は「現状有姿」かつ「提供可能な範囲」で提供され、継続稼働、データの無誤謬性、予報の正確性、特定目的への適合性を保証しません。"
          ]
        },
        {
          "heading": "責任の制限",
          "paragraphs": [
            "適用法で認められる範囲で、WeatherNow の開発者は、天気情報への依存、提供者の障害、利用不能な機能、ローカルデータの消失、第三者コンテンツ、本サービスの利用による損失について責任を負いません。"
          ]
        },
        {
          "heading": "規約の変更",
          "paragraphs": [
            "WeatherNow の変更に伴い本規約を更新する場合があります。更新版の公開後も利用を継続した場合、適用法で認められる範囲で改訂規約に同意したものとみなされます。"
          ]
        }
      ],
      "contactHeading": "連絡先",
      "contactBefore": "本規約に関する質問は次の場所から提出できます：",
      "contactLink": "WeatherNow GitHub リポジトリ"
    }
  },
  "ko": {
    "dir": "ltr",
    "close": "닫고 대시보드로 돌아가기",
    "closeTitle": "닫기",
    "legalNav": "법적 및 앱 링크",
    "privacyLabel": "개인정보 처리방침",
    "termsLabel": "서비스 약관",
    "effective": "시행일: 2026년 9월 12일",
    "privacy": {
      "title": "개인정보 처리방침",
      "heading": "WeatherNow 개인정보 처리방침",
      "intro": "WeatherNow는 날씨 정보, 지도, 예보, 환경 정보, 뉴스, 캘린더 기능, 개인 날씨 일지 및 선택적 미디어 기능을 제공합니다. 이 방침은 WeatherNow를 사용할 때 정보가 어떻게 처리되는지 설명합니다.",
      "sections": [
        {
          "heading": "제공하거나 승인하는 정보",
          "paragraphs": [
            "WeatherNow는 저장한 위치, 설정, 일지 항목, 일지에 추가한 사진 등 사용자가 제공한 정보를 처리할 수 있습니다. Google 계정을 연결하면 캘린더 접근 및 일지 동기화처럼 사용자가 시작한 Google 연동 기능에 필요한 권한만 요청합니다."
          ]
        },
        {
          "heading": "Google 계정 정보",
          "paragraphs": [
            "Google로 로그인하면 WeatherNow는 이메일 주소 같은 기본 계정 정보와 승인한 Google 기능에 필요한 OAuth 액세스 토큰을 받을 수 있습니다. 대시보드는 이 권한을 사용해 Google Calendar 정보를 불러오고 Google 연동 일지 기능을 제공합니다.",
            "WeatherNow의 Google API 정보 사용 및 전송은 제한적 사용 요구사항을 포함한 Google API 서비스 사용자 데이터 정책을 준수합니다."
          ]
        },
        {
          "heading": "캘린더 및 일지 데이터",
          "paragraphs": [
            "캘린더 정보는 WeatherNow 안에서 이벤트와 캘린더 소스를 표시하는 데 사용됩니다. 일지 정보는 개인 날씨 일지를 제공하고, Google 연동 기능이 활성화된 경우 사용자가 시작한 동기화 또는 백업을 지원하는 데 사용됩니다."
          ]
        },
        {
          "heading": "위치 정보",
          "paragraphs": [
            "기기 위치 접근을 허용하면 WeatherNow는 좌표를 사용해 지역 날씨, 예보, 지도, 환경 정보 및 주변/위치 기반 결과를 제공합니다. 위치를 직접 검색하거나 선택할 수도 있습니다."
          ]
        },
        {
          "heading": "브라우저 로컬 저장소",
          "paragraphs": [
            "WeatherNow는 앱 설정, 저장 위치, 캐시된 날씨/환경 정보, 설치 상태 및 세션 간 작동에 필요한 기타 데이터를 브라우저 저장소에 보관합니다. 브라우저 또는 사이트 데이터를 지우면 로컬 정보가 삭제될 수 있습니다."
          ]
        },
        {
          "heading": "제3자 서비스",
          "paragraphs": [
            "WeatherNow는 Google 서비스, Open-Meteo, OpenStreetMap 관련 서비스, 기상 기관, 위성/레이더 제공업체, YouTube, 뉴스 제공업체 등 제3자 서비스에서 정보나 기능을 가져옵니다. 해당 제공업체는 자체 개인정보 정책 및 약관에 따라 요청을 처리할 수 있습니다."
          ]
        },
        {
          "heading": "개인정보 공유 및 판매",
          "paragraphs": [
            "WeatherNow는 개인정보를 판매하지 않습니다. 요청한 기능 제공에 필요하거나 법률상 요구되는 경우에만 제3자 제공업체와 정보를 공유합니다."
          ]
        },
        {
          "heading": "데이터 보관 및 제어",
          "paragraphs": [
            "WeatherNow에서 로그아웃해 Google 계정을 연결 해제할 수 있고 Google 계정 권한에서 WeatherNow의 접근을 철회할 수도 있습니다. 사이트 브라우저 저장소를 지우면 로컬 대시보드 데이터를 삭제할 수 있습니다. Google 계정에 저장된 데이터는 Google의 관리 및 보관 설정을 따릅니다."
          ]
        },
        {
          "heading": "보안",
          "paragraphs": [
            "WeatherNow는 안전하게 배포될 때 표준 브라우저 보안 메커니즘과 HTTPS를 사용합니다. 어떤 인터넷 서비스도 절대적인 보안을 보장할 수 없으므로 일지에 매우 민감한 정보를 입력하지 마세요."
          ]
        },
        {
          "heading": "아동",
          "paragraphs": [
            "WeatherNow는 관련 법률을 위반하여 아동의 개인정보를 고의로 수집하기 위한 서비스가 아닙니다."
          ]
        },
        {
          "heading": "이 방침의 변경",
          "paragraphs": [
            "WeatherNow 기능 또는 법적 요구사항이 변경되면 이 개인정보 처리방침을 업데이트할 수 있습니다. 중요한 변경이 있을 경우 위 시행일도 업데이트됩니다."
          ]
        }
      ],
      "contactHeading": "문의",
      "contactBefore": "WeatherNow 개인정보 관련 문의는 개발자에게 다음을 통해 연락할 수 있습니다:",
      "contactLink": "WeatherNow GitHub 저장소"
    },
    "terms": {
      "title": "서비스 약관",
      "heading": "WeatherNow 서비스 약관",
      "intro": "이 서비스 약관은 WeatherNow 사용에 적용됩니다. WeatherNow를 사용하면 이 약관에 동의하는 것입니다.",
      "sections": [
        {
          "heading": "날씨 및 환경 정보",
          "paragraphs": [
            "WeatherNow는 외부 날씨, 환경, 지도, 위성, 레이더 및 관련 제공업체의 정보를 결합합니다. 예보와 관측은 지연되거나 불완전하거나 이용할 수 없거나 부정확할 수 있습니다. WeatherNow는 일반적인 정보 제공 목적이며 공식 비상, 항공, 해상 항법, 의료 또는 생명 안전 서비스로 간주해서는 안 됩니다."
          ]
        },
        {
          "heading": "Google 연동 기능",
          "paragraphs": [
            "Google Calendar 및 기타 Google 연동 기능은 선택 사항입니다. Google 계정을 연결하면 선택한 기능에 대해 승인한 권한을 WeatherNow가 사용하도록 허용합니다. Google 계정에 대한 책임은 사용자에게 있으며 Google 계정 설정에서 WeatherNow 접근을 철회할 수 있습니다."
          ]
        },
        {
          "heading": "일지 및 사용자 콘텐츠",
          "paragraphs": [
            "WeatherNow에 추가하는 일지 글, 사진, 위치 및 기타 콘텐츠에 대한 책임은 사용자에게 있습니다. 사용할 권리가 없는 콘텐츠를 업로드하지 마세요. 중요하다고 생각하는 백업을 유지할 책임도 사용자에게 있습니다."
          ]
        },
        {
          "heading": "제3자 서비스 및 콘텐츠",
          "paragraphs": [
            "WeatherNow는 날씨 제공업체, 지도 서비스, 뉴스 제공업체, Google 서비스, YouTube 및 기타 데이터 제공업체 등 제3자의 정보를 표시하거나 링크할 수 있습니다. 서비스, 콘텐츠, 이용 가능성 및 정책은 WeatherNow가 아니라 해당 제공업체가 관리합니다."
          ]
        },
        {
          "heading": "허용되는 사용",
          "paragraphs": [
            "WeatherNow를 관련 법률 위반, 서비스 방해, 계정/시스템 무단 접근 시도, 제3자 API 남용 또는 제3자 콘텐츠 오용에 사용해서는 안 됩니다."
          ]
        },
        {
          "heading": "이용 가능성 및 변경",
          "paragraphs": [
            "제공업체, API, 기술 요구사항 또는 프로젝트 필요가 바뀌면 WeatherNow는 기능을 변경, 일시 중단 또는 종료할 수 있습니다. 지속적인 이용 가능성은 보장되지 않습니다."
          ]
        },
        {
          "heading": "보증 없음",
          "paragraphs": [
            "관련 법률이 허용하는 범위에서 WeatherNow는 “있는 그대로” 및 “이용 가능한 상태로” 제공되며 중단 없는 운영, 오류 없는 데이터, 예보 정확성 또는 특정 목적에의 적합성을 보증하지 않습니다."
          ]
        },
        {
          "heading": "책임 제한",
          "paragraphs": [
            "관련 법률이 허용하는 범위에서 WeatherNow 개발자는 날씨 정보 의존, 제공업체 장애, 기능 이용 불가, 로컬 데이터 손실, 제3자 콘텐츠 또는 서비스 사용으로 인한 손실에 책임을 지지 않습니다."
          ]
        },
        {
          "heading": "약관 변경",
          "paragraphs": [
            "WeatherNow가 변경됨에 따라 이 약관도 업데이트될 수 있습니다. 업데이트된 버전 공개 후 계속 사용하면 관련 법률이 허용하는 범위에서 개정 약관에 동의한 것으로 간주됩니다."
          ]
        }
      ],
      "contactHeading": "문의",
      "contactBefore": "이 약관에 관한 질문은 다음을 통해 제기할 수 있습니다:",
      "contactLink": "WeatherNow GitHub 저장소"
    }
  },
  "ru": {
    "dir": "ltr",
    "close": "Закрыть и вернуться к панели",
    "closeTitle": "Закрыть",
    "legalNav": "Правовые ссылки и ссылки приложения",
    "privacyLabel": "Политика конфиденциальности",
    "termsLabel": "Условия использования",
    "effective": "Дата вступления в силу: 12 сентября 2026 г.",
    "privacy": {
      "title": "Политика конфиденциальности",
      "heading": "Политика конфиденциальности WeatherNow",
      "intro": "WeatherNow предоставляет информацию о погоде, карты, прогнозы, экологические данные, новости, функции календаря, личный погодный журнал и дополнительные мультимедийные функции. Эта политика объясняет, как обрабатывается информация при использовании WeatherNow.",
      "sections": [
        {
          "heading": "Информация, которую вы предоставляете или разрешаете",
          "paragraphs": [
            "WeatherNow может обрабатывать выбранные вами данные, включая сохранённые места, настройки, записи журнала и добавленные фотографии. При подключении аккаунта Google WeatherNow запрашивает доступ только для инициированных вами функций Google, например календаря и синхронизации журнала."
          ]
        },
        {
          "heading": "Информация аккаунта Google",
          "paragraphs": [
            "При входе через Google WeatherNow может получить базовые сведения, например адрес электронной почты, и OAuth-токен, необходимый для разрешённых функций Google. Панель использует авторизацию для загрузки Google Calendar и функций журнала, связанных с Google.",
            "Использование и передача WeatherNow данных, полученных через Google API, соответствуют политике пользовательских данных Google API Services, включая требования Limited Use."
          ]
        },
        {
          "heading": "Данные календаря и журнала",
          "paragraphs": [
            "Данные календаря используются для отображения событий и источников календаря в WeatherNow. Данные журнала используются для личного погодного журнала и, при включённых функциях Google, для инициированной вами синхронизации или резервного копирования."
          ]
        },
        {
          "heading": "Данные о местоположении",
          "paragraphs": [
            "Если вы разрешаете доступ к местоположению устройства, WeatherNow использует координаты для локальной погоды, прогнозов, карт, экологической информации и результатов по местоположению. Также можно искать или выбирать места вручную."
          ]
        },
        {
          "heading": "Локальное хранилище браузера",
          "paragraphs": [
            "WeatherNow использует хранилище браузера для настроек приложения, сохранённых мест, кэшированных погодных/экологических данных, состояния установки и других данных, нужных между сеансами. Очистка данных браузера или сайта может удалить локальную информацию."
          ]
        },
        {
          "heading": "Сторонние сервисы",
          "paragraphs": [
            "WeatherNow получает информацию и функции от сторонних сервисов, включая Google, Open-Meteo, сервисы OpenStreetMap, метеослужбы, поставщиков спутниковых/радарных данных, YouTube и издателей новостей. Они могут обрабатывать запросы по собственным политикам и условиям."
          ]
        },
        {
          "heading": "Передача и продажа персональных данных",
          "paragraphs": [
            "WeatherNow не продаёт ваши персональные данные. Они передаются сторонним поставщикам только когда это необходимо для запрошенных функций или требуется законом."
          ]
        },
        {
          "heading": "Хранение данных и управление",
          "paragraphs": [
            "Вы можете отключить аккаунт Google, выйдя из WeatherNow, а также отозвать доступ WeatherNow в разрешениях аккаунта Google. Локальные данные панели можно удалить очисткой хранилища сайта. Данные в вашем аккаунте Google остаются под правилами и настройками хранения Google."
          ]
        },
        {
          "heading": "Безопасность",
          "paragraphs": [
            "WeatherNow использует стандартные механизмы безопасности браузера и HTTPS при безопасном развёртывании. Ни один интернет-сервис не гарантирует абсолютную безопасность, поэтому не размещайте особо чувствительную информацию в журнале."
          ]
        },
        {
          "heading": "Дети",
          "paragraphs": [
            "WeatherNow не предназначен для сознательного сбора персональных данных детей в нарушение применимого законодательства."
          ]
        },
        {
          "heading": "Изменения политики",
          "paragraphs": [
            "Политика может обновляться при изменении функций WeatherNow или требований закона. При существенных изменениях дата вступления в силу будет обновлена."
          ]
        }
      ],
      "contactHeading": "Контакты",
      "contactBefore": "По вопросам конфиденциальности WeatherNow свяжитесь с разработчиком через",
      "contactLink": "репозиторий WeatherNow на GitHub"
    },
    "terms": {
      "title": "Условия использования",
      "heading": "Условия использования WeatherNow",
      "intro": "Эти Условия регулируют использование WeatherNow. Используя WeatherNow, вы соглашаетесь с ними.",
      "sections": [
        {
          "heading": "Погодная и экологическая информация",
          "paragraphs": [
            "WeatherNow объединяет сведения внешних поставщиков погоды, экологии, карт, спутниковых и радарных данных. Прогнозы и наблюдения могут быть задержаны, неполны, недоступны или неточны. WeatherNow предназначен для общей информации и не является официальной службой экстренной помощи, авиации, морской навигации, медицины или безопасности жизни."
          ]
        },
        {
          "heading": "Функции, связанные с Google",
          "paragraphs": [
            "Google Calendar и другие функции Google необязательны. Подключая аккаунт Google, вы разрешаете WeatherNow использовать одобренные вами права для выбранных функций. Вы отвечаете за свой аккаунт Google и можете отозвать доступ WeatherNow в настройках аккаунта."
          ]
        },
        {
          "heading": "Журнал и пользовательский контент",
          "paragraphs": [
            "Вы отвечаете за текст журнала, фотографии, места и другой контент, добавляемый в WeatherNow. Не загружайте контент, на использование которого у вас нет прав. Вы также отвечаете за важные для вас резервные копии."
          ]
        },
        {
          "heading": "Сторонние сервисы и контент",
          "paragraphs": [
            "WeatherNow может показывать или ссылаться на информацию третьих сторон, включая поставщиков погоды, карт, новостей, сервисы Google, YouTube и других поставщиков данных. Их услуги, контент, доступность и политики контролируются ими, а не WeatherNow."
          ]
        },
        {
          "heading": "Допустимое использование",
          "paragraphs": [
            "Нельзя использовать WeatherNow для нарушения закона, вмешательства в работу сервиса, попыток несанкционированного доступа к аккаунтам или системам, злоупотребления сторонними API или неправомерного использования стороннего контента."
          ]
        },
        {
          "heading": "Доступность и изменения",
          "paragraphs": [
            "WeatherNow может менять, приостанавливать или прекращать функции при изменении поставщиков, API, технических требований или потребностей проекта. Постоянная доступность не гарантируется."
          ]
        },
        {
          "heading": "Отсутствие гарантий",
          "paragraphs": [
            "В пределах, разрешённых законом, WeatherNow предоставляется «как есть» и «по мере доступности» без гарантий бесперебойной работы, безошибочных данных, точности прогноза или пригодности для конкретной цели."
          ]
        },
        {
          "heading": "Ограничение ответственности",
          "paragraphs": [
            "В пределах, разрешённых законом, разработчик WeatherNow не несёт ответственности за убытки из-за доверия погодной информации, сбоев поставщиков, недоступных функций, потери локальных данных, стороннего контента или использования сервиса."
          ]
        },
        {
          "heading": "Изменения условий",
          "paragraphs": [
            "Условия могут обновляться при изменении WeatherNow. Продолжение использования после публикации обновлённой версии означает принятие пересмотренных Условий в пределах, разрешённых законом."
          ]
        }
      ],
      "contactHeading": "Контакты",
      "contactBefore": "Вопросы по этим Условиям можно задать через",
      "contactLink": "репозиторий WeatherNow на GitHub"
    }
  },
  "ar": {
    "dir": "rtl",
    "close": "إغلاق والعودة إلى لوحة المعلومات",
    "closeTitle": "إغلاق",
    "legalNav": "روابط قانونية وروابط التطبيق",
    "privacyLabel": "سياسة الخصوصية",
    "termsLabel": "شروط الخدمة",
    "effective": "تاريخ السريان: 12 سبتمبر 2026",
    "privacy": {
      "title": "سياسة الخصوصية",
      "heading": "سياسة خصوصية WeatherNow",
      "intro": "يوفر WeatherNow معلومات الطقس والخرائط والتوقعات والمعلومات البيئية والأخبار وميزات التقويم ويوميات طقس شخصية وميزات وسائط اختيارية. توضح هذه السياسة كيفية التعامل مع المعلومات عند استخدام WeatherNow.",
      "sections": [
        {
          "heading": "المعلومات التي تقدمها أو تسمح بها",
          "paragraphs": [
            "قد يعالج WeatherNow المعلومات التي تختار تقديمها، بما في ذلك المواقع المحفوظة والإعدادات وإدخالات اليوميات والصور المضافة إليها. عند ربط حساب Google، يطلب WeatherNow الوصول فقط للميزات المتكاملة مع Google التي تبدأها أنت، مثل الوصول إلى التقويم والمزامنة المتعلقة باليوميات."
          ]
        },
        {
          "heading": "معلومات حساب Google",
          "paragraphs": [
            "إذا سجلت الدخول باستخدام Google، فقد يتلقى WeatherNow معلومات أساسية مثل عنوان بريدك الإلكتروني ورمز وصول OAuth اللازم لاستخدام ميزات Google التي تسمح بها. تستخدم لوحة المعلومات هذا التفويض لتحميل Google Calendar وتوفير وظائف اليوميات المرتبطة بـ Google.",
            "يلتزم استخدام WeatherNow ونقله للمعلومات المستلمة من Google APIs بسياسة بيانات مستخدم خدمات Google API، بما في ذلك متطلبات الاستخدام المحدود."
          ]
        },
        {
          "heading": "بيانات التقويم واليوميات",
          "paragraphs": [
            "تُستخدم معلومات التقويم لعرض الأحداث ومصادر التقويم داخل WeatherNow. وتُستخدم معلومات اليوميات لتوفير يوميات الطقس الشخصية، وعند تفعيل ميزات Google، لدعم المزامنة أو النسخ الاحتياطي الذي تبدأه أنت."
          ]
        },
        {
          "heading": "معلومات الموقع",
          "paragraphs": [
            "إذا سمحت بالوصول إلى موقع الجهاز، يستخدم WeatherNow إحداثياتك لتوفير الطقس المحلي والتوقعات والخرائط والمعلومات البيئية والنتائج القريبة أو المعتمدة على الموقع. ويمكنك أيضًا البحث عن المواقع أو اختيارها يدويًا."
          ]
        },
        {
          "heading": "التخزين المحلي للمتصفح",
          "paragraphs": [
            "يستخدم WeatherNow تخزين المتصفح لإعدادات التطبيق والمواقع المحفوظة وبيانات الطقس أو البيئة المخزنة مؤقتًا وحالة التثبيت وغيرها من البيانات اللازمة بين الجلسات. قد يؤدي مسح بيانات المتصفح أو الموقع إلى حذف المعلومات المحلية."
          ]
        },
        {
          "heading": "خدمات الجهات الخارجية",
          "paragraphs": [
            "يحصل WeatherNow على معلومات أو وظائف من خدمات خارجية قد تشمل Google وOpen-Meteo وخدمات مرتبطة بـ OpenStreetMap وهيئات الأرصاد ومزودي الأقمار الصناعية/الرادار وYouTube وناشري الأخبار. وقد تعالج هذه الجهات الطلبات وفق سياساتها وشروطها الخاصة."
          ]
        },
        {
          "heading": "مشاركة وبيع المعلومات الشخصية",
          "paragraphs": [
            "لا يبيع WeatherNow معلوماتك الشخصية. ولا تتم مشاركة المعلومات مع مزودي الجهات الخارجية إلا عند الحاجة لتقديم ميزة تطلبها أو عندما يفرض القانون ذلك."
          ]
        },
        {
          "heading": "الاحتفاظ بالبيانات والتحكم بها",
          "paragraphs": [
            "يمكنك فصل حساب Google عن WeatherNow بتسجيل الخروج، كما يمكنك إزالة وصول WeatherNow من أذونات حساب Google. ويمكن حذف بيانات لوحة المعلومات المحلية بمسح تخزين الموقع. أما البيانات المخزنة في حساب Google فتظل خاضعة لضوابط Google وإعدادات الاحتفاظ."
          ]
        },
        {
          "heading": "الأمان",
          "paragraphs": [
            "يستخدم WeatherNow آليات أمان المتصفح القياسية وHTTPS عند النشر الآمن. لا يمكن لأي خدمة إنترنت ضمان الأمان المطلق، لذلك يُنصح بعدم وضع معلومات شديدة الحساسية في اليوميات."
          ]
        },
        {
          "heading": "الأطفال",
          "paragraphs": [
            "لا يهدف WeatherNow إلى جمع معلومات شخصية عن الأطفال عن علم بما يخالف القانون المعمول به."
          ]
        },
        {
          "heading": "التغييرات على هذه السياسة",
          "paragraphs": [
            "قد يتم تحديث هذه السياسة مع تغير ميزات WeatherNow أو المتطلبات القانونية. وسيتم تحديث تاريخ السريان أعلاه عند إجراء تغييرات جوهرية."
          ]
        }
      ],
      "contactHeading": "التواصل",
      "contactBefore": "لأسئلة الخصوصية حول WeatherNow، تواصل مع المطور عبر",
      "contactLink": "مستودع WeatherNow على GitHub"
    },
    "terms": {
      "title": "شروط الخدمة",
      "heading": "شروط خدمة WeatherNow",
      "intro": "تحكم شروط الخدمة هذه استخدامك لـ WeatherNow. باستخدام WeatherNow فإنك توافق على هذه الشروط.",
      "sections": [
        {
          "heading": "معلومات الطقس والبيئة",
          "paragraphs": [
            "يجمع WeatherNow معلومات من مزودي الطقس والبيئة والخرائط والأقمار الصناعية والرادار وغيرهم. قد تكون التوقعات والمشاهدات متأخرة أو ناقصة أو غير متاحة أو غير دقيقة. يوفر WeatherNow معلومات عامة فقط ولا يجب اعتباره خدمة رسمية للطوارئ أو الطيران أو الملاحة البحرية أو الطب أو سلامة الحياة."
          ]
        },
        {
          "heading": "الميزات المرتبطة بـ Google",
          "paragraphs": [
            "Google Calendar والوظائف الأخرى المرتبطة بـ Google اختيارية. بربط حساب Google، تفوض WeatherNow باستخدام الأذونات التي توافق عليها للميزات التي تختارها. تظل مسؤولًا عن حساب Google ويمكنك إلغاء وصول WeatherNow من إعدادات حساب Google."
          ]
        },
        {
          "heading": "اليوميات ومحتوى المستخدم",
          "paragraphs": [
            "أنت مسؤول عن نصوص اليوميات والصور والمواقع وأي محتوى آخر تضيفه إلى WeatherNow. لا ترفع محتوى لا تملك حق استخدامه. كما أنك مسؤول عن الاحتفاظ بأي نسخ احتياطية تراها مهمة."
          ]
        },
        {
          "heading": "خدمات ومحتوى الجهات الخارجية",
          "paragraphs": [
            "قد يعرض WeatherNow أو يربط معلومات من جهات خارجية، بما في ذلك مزودو الطقس وخدمات الخرائط وناشرو الأخبار وخدمات Google وYouTube وغيرهم. تتحكم تلك الجهات في خدماتها ومحتواها وتوفرها وسياساتها، وليس WeatherNow."
          ]
        },
        {
          "heading": "الاستخدام المقبول",
          "paragraphs": [
            "لا يجوز استخدام WeatherNow لانتهاك القانون المعمول به أو التدخل في الخدمة أو محاولة الوصول غير المصرح به إلى الحسابات أو الأنظمة أو إساءة استخدام واجهات API الخارجية أو محتوى الجهات الخارجية."
          ]
        },
        {
          "heading": "التوفر والتغييرات",
          "paragraphs": [
            "قد يغير WeatherNow الميزات أو يعلقها أو يوقفها عندما تتغير الجهات المزودة أو واجهات API أو المتطلبات التقنية أو احتياجات المشروع. لا يوجد ضمان للتوفر المستمر."
          ]
        },
        {
          "heading": "عدم وجود ضمانات",
          "paragraphs": [
            "يُقدم WeatherNow «كما هو» و«حسب التوفر» دون ضمان التشغيل المتواصل أو خلو البيانات من الأخطاء أو دقة التوقعات أو الملاءمة لغرض محدد، ضمن الحدود التي يسمح بها القانون."
          ]
        },
        {
          "heading": "تحديد المسؤولية",
          "paragraphs": [
            "ضمن الحدود التي يسمح بها القانون، لا يكون مطور WeatherNow مسؤولًا عن الخسائر الناتجة عن الاعتماد على معلومات الطقس أو انقطاع المزودين أو عدم توفر الميزات أو فقدان البيانات المحلية أو محتوى الجهات الخارجية أو استخدام الخدمة."
          ]
        },
        {
          "heading": "التغييرات على الشروط",
          "paragraphs": [
            "قد يتم تحديث هذه الشروط مع تغير WeatherNow. ويُعد استمرار الاستخدام بعد نشر نسخة محدثة قبولًا للشروط المعدلة ضمن الحدود التي يسمح بها القانون."
          ]
        }
      ],
      "contactHeading": "التواصل",
      "contactBefore": "يمكن طرح الأسئلة حول هذه الشروط عبر",
      "contactLink": "مستودع WeatherNow على GitHub"
    }
  }
} as Record<string, LegalLanguageContent>;

  const legalLanguage = (value: unknown) => {
    const raw = typeof value === 'string' ? value.toLowerCase().split('-')[0] : 'en';
    return Object.prototype.hasOwnProperty.call(legalContent, raw) ? raw : 'en';
  };
  const escapeLegalHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const renderLegalDocument = (doc: LegalDocument, labels: LegalLanguageContent) => `
    <h1>${escapeLegalHtml(doc.heading)}</h1>
    <p class="meta">${escapeLegalHtml(labels.effective)}</p>
    <p>${escapeLegalHtml(doc.intro)}</p>
    ${doc.sections.map(section => `<h2>${escapeLegalHtml(section.heading)}</h2>${section.paragraphs.map(paragraph => `<p>${escapeLegalHtml(paragraph)}</p>`).join('')}`).join('')}
    <h2>${escapeLegalHtml(doc.contactHeading)}</h2>
    <p>${escapeLegalHtml(doc.contactBefore)} <a href="https://github.com/unknownjed/WeatherNow" rel="noopener noreferrer">${escapeLegalHtml(doc.contactLink)}</a>.</p>`;

  const renderLegalPage = (lang: string, doc: LegalDocument, labels: LegalLanguageContent) => `<!doctype html>
<html lang="${lang}" dir="${labels.dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>${escapeLegalHtml(doc.title)} | WeatherNow</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; color: #0f172a; line-height: 1.65; }
    main { width: min(900px, calc(100% - 32px)); margin: 40px auto; }
    .card { background: #fff; border: 1px solid #cbd5e1; border-radius: 16px; padding: clamp(20px, 4vw, 36px); box-shadow: 0 12px 35px rgba(15,23,42,.08); }
    h1 { margin: 0 0 4px; font-size: clamp(1.8rem, 4vw, 2.5rem); }
    h2 { margin-top: 2rem; font-size: 1.15rem; }
    p, li { font-size: .98rem; }
    .meta { color: #64748b; margin: 0 0 1.75rem; }
    a { color: #2563eb; }
    nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid #e2e8f0; }
    .close-button { position: fixed; top: max(14px, env(safe-area-inset-top, 0px)); right: max(14px, env(safe-area-inset-right, 0px)); z-index: 20; width: 42px; height: 42px; border: 1px solid #cbd5e1; border-radius: 999px; background: rgba(255,255,255,.94); color: #0f172a; font: 700 26px/1 system-ui, sans-serif; display: grid; place-items: center; cursor: pointer; box-shadow: 0 8px 24px rgba(15,23,42,.14); }
    .close-button:hover { background: #f1f5f9; }
    .close-button:focus-visible { outline: 3px solid #60a5fa; outline-offset: 2px; }
    @media (prefers-color-scheme: dark) { body { background: #020617; color: #e2e8f0; } .card { background: #0f172a; border-color: #334155; box-shadow: none; } .meta { color: #94a3b8; } a { color: #60a5fa; } nav { border-color: #334155; } .close-button { background: rgba(15,23,42,.94); color: #e2e8f0; border-color: #475569; } .close-button:hover { background: #1e293b; } }
  </style>
</head>
<body>
  <button class="close-button" type="button" aria-label="${escapeLegalHtml(labels.close)}" title="${escapeLegalHtml(labels.closeTitle)}" onclick="if (history.length > 1) { history.back(); } else { location.href = '/'; }">&times;</button>
  <main><article class="card">
    ${renderLegalDocument(doc, labels)}
    <nav aria-label="${escapeLegalHtml(labels.legalNav)}">
      <a href="/">WeatherNow</a>
      <a href="/privacy?lang=${lang}">${escapeLegalHtml(labels.privacyLabel)}</a>
      <a href="/terms?lang=${lang}">${escapeLegalHtml(labels.termsLabel)}</a>
    </nav>
  </article></main>
</body>
</html>`;

  app.get('/privacy', (req, res) => {
    const lang = legalLanguage(req.query.lang);
    const labels = legalContent[lang];
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Language', lang);
    res.send(renderLegalPage(lang, labels.privacy, labels));
  });

  app.get('/terms', (req, res) => {
    const lang = legalLanguage(req.query.lang);
    const labels = legalContent[lang];
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Language', lang);
    res.send(renderLegalPage(lang, labels.terms, labels));
  });

  // Vite middleware for development.
  // npm sets npm_lifecycle_event automatically. Treat the explicit dev scripts
  // as development even if a stale .env file contains NODE_ENV=production.
  // This prevents npm run dev / dev:watch from accidentally serving dist/.
  const npmLifecycleEvent = String(process.env.npm_lifecycle_event || '').toLowerCase();
  const isExplicitDevRun = npmLifecycleEvent === 'dev' || npmLifecycleEvent === 'dev:watch';

  if (isExplicitDevRun || process.env.NODE_ENV !== "production") {
    // Kill any service worker left behind by an older production/PWA build.
    // Without this, an installed mobile/tablet PWA can keep serving an old
    // precached index and asset bundle even though Vite is serving fresh source.
    app.get('/sw.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.send(`self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())await caches.delete(key);await self.registration.unregister();await self.clients.claim();for(const client of await self.clients.matchAll({type:'window'}))client.navigate(client.url)})()));`);
    });
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.get('/sw.js', (req, res) => {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'sw.js'));
    });
    app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'manifest.webmanifest'));
    });
    app.get('/', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();








