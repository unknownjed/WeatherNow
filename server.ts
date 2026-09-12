
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

  app.get("/api/weather", async (req, res) => {
    const { lat, lon, tempUnit, windUnit, precipUnit } = req.query;
    const cacheKey = `${lat}|${lon}|${tempUnit || 'celsius'}|${windUnit || 'kmh'}|${precipUnit || 'mm'}`;
    let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,weather_code,is_day,wind_speed_10m&hourly=temperature_2m,weather_code,is_day,precipitation,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`;

    if (tempUnit === 'fahrenheit') url += '&temperature_unit=fahrenheit';
    if (windUnit === 'mph') url += '&wind_speed_unit=mph';
    if (precipUnit === 'inch') url += '&precipitation_unit=inch';

    try {
      let lastError: unknown = null;

      // Retry once so a brief Open-Meteo connection timeout does not immediately fail.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
          if (!response.ok) throw new Error(`Weather API Error: ${response.status}`);

          const data = await response.json();
          weatherCache.set(cacheKey, { savedAt: Date.now(), data });
          return res.json(data);
        } catch (error) {
          lastError = error;
          if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 350));
        }
      }

      throw lastError;
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

  app.get('/api/radar-tile', async (req, res) => {
    try {
      const framePath = typeof req.query.path === 'string' ? req.query.path : '';
      const z = Number(req.query.z);
      const x = Number(req.query.x);
      const y = Number(req.query.y);
      if (!/^\/v2\/radar\/[A-Za-z0-9_-]+$/.test(framePath) || !Number.isInteger(z) || z < 0 || z > 7 ||
          !Number.isInteger(x) || x < 0 || !Number.isInteger(y) || y < 0) {
        return res.status(400).send('Invalid radar tile request');
      }
      const tileUrl = `https://tilecache.rainviewer.com${framePath}/256/${z}/${x}/${y}/2/1_1.png`;
      const response = await fetch(tileUrl, {
        headers: {
          Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
          Referer: 'https://www.rainviewer.com/',
          'User-Agent': 'Mozilla/5.0 (WeatherNow dashboard)',
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`RainViewer tile returned ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) throw new Error('RainViewer tile was not an image');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new Error('Invalid RainViewer tile size');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(bytes);
    } catch (error) {
      console.error('Server proxy error (Radar tile):', error);
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
  // These routes are intentionally registered before Vite/static SPA handling so
  // /privacy and /terms return real public HTML pages in both dev and production.
  const renderLegalPage = (title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>${title} | WeatherNow</title>
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
    @media (prefers-color-scheme: dark) {
      body { background: #020617; color: #e2e8f0; }
      .card { background: #0f172a; border-color: #334155; box-shadow: none; }
      .meta { color: #94a3b8; }
      a { color: #60a5fa; }
      nav { border-color: #334155; }
    }
  </style>
</head>
<body>
  <main>
    <article class="card">
      ${body}
      <nav aria-label="Legal and app links">
        <a href="/">WeatherNow</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
      </nav>
    </article>
  </main>
</body>
</html>`;

  app.get('/privacy', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderLegalPage('Privacy Policy', `
      <h1>WeatherNow Privacy Policy</h1>
      <p class="meta">Effective date: September 12, 2026</p>

      <p>WeatherNow provides weather information, maps, forecasts, environmental information, news, calendar features, a personal weather journal, and optional media features. This Privacy Policy explains how information is handled when you use WeatherNow.</p>

      <h2>Information you provide or authorize</h2>
      <p>WeatherNow may process information you choose to provide, including saved locations, settings, journal entries, and photos you add to journal entries. When you choose to connect a Google account, WeatherNow requests access only for Google-integrated features that you initiate, such as Calendar access and journal-related synchronization.</p>

      <h2>Google account information</h2>
      <p>If you sign in with Google, WeatherNow may receive basic account information such as your email address and an OAuth access token needed to use the Google features you authorize. The dashboard uses that authorization to load Google Calendar information and to provide Google-connected journal functionality.</p>
      <p>WeatherNow's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.</p>

      <h2>Calendar and journal data</h2>
      <p>Calendar information is used to display events and calendar sources inside WeatherNow. Journal information is used to provide the personal weather journal and, when Google-connected features are enabled, to support synchronization or backup functionality initiated by you.</p>

      <h2>Location information</h2>
      <p>If you allow device location access, WeatherNow uses your coordinates to provide local weather, forecasts, maps, environmental information, and nearby or location-based results. You can also search for or select locations manually.</p>

      <h2>Local browser storage</h2>
      <p>WeatherNow uses browser storage for app settings, saved locations, cached weather or environmental information, installation state, and other data needed to keep the dashboard working between sessions. Clearing browser or site data may remove locally stored information.</p>

      <h2>Third-party services</h2>
      <p>WeatherNow retrieves information or functionality from third-party services used by the dashboard, which may include Google services, Open-Meteo, OpenStreetMap-related services, weather agencies, satellite/radar providers, YouTube, and news publishers. Those providers may process requests under their own privacy policies and terms.</p>

      <h2>Sharing and sale of personal information</h2>
      <p>WeatherNow does not sell your personal information. Information is shared with third-party providers only as needed to provide features you request or when required by law.</p>

      <h2>Data retention and control</h2>
      <p>You can disconnect your Google account from WeatherNow by signing out. You can also remove WeatherNow's Google account access from your Google Account permissions. Locally stored dashboard data can be removed by clearing the site's browser storage. Data stored in your own Google account remains subject to Google's controls and retention settings.</p>

      <h2>Security</h2>
      <p>WeatherNow uses standard browser security mechanisms and HTTPS when deployed securely. No internet service can guarantee absolute security, so users should avoid placing highly sensitive information in journal entries.</p>

      <h2>Children</h2>
      <p>WeatherNow is not intended to knowingly collect personal information from children in violation of applicable law.</p>

      <h2>Changes to this policy</h2>
      <p>This Privacy Policy may be updated as WeatherNow features or legal requirements change. The effective date above will be updated when material changes are made.</p>

      <h2>Contact</h2>
      <p>For privacy questions about WeatherNow, contact the developer through the <a href="https://github.com/unknownjed/WeatherNow" rel="noopener noreferrer">WeatherNow GitHub repository</a>.</p>
    `));
  });

  app.get('/terms', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderLegalPage('Terms of Service', `
      <h1>WeatherNow Terms of Service</h1>
      <p class="meta">Effective date: September 12, 2026</p>

      <p>These Terms of Service govern your use of WeatherNow. By using WeatherNow, you agree to these terms.</p>

      <h2>Weather and environmental information</h2>
      <p>WeatherNow combines information from external weather, environmental, mapping, satellite, radar, and related providers. Forecasts and observations may be delayed, incomplete, unavailable, or inaccurate. WeatherNow is provided for general informational purposes and must not be treated as an official emergency, aviation, marine-navigation, medical, or life-safety service.</p>

      <h2>Google-connected features</h2>
      <p>Google Calendar and other Google-connected functionality is optional. By connecting a Google account, you authorize WeatherNow to use the permissions you approve for the features you choose to use. You remain responsible for your Google account and may revoke WeatherNow's access through your Google Account settings.</p>

      <h2>Journal and user content</h2>
      <p>You are responsible for journal text, photos, locations, and other content you add to WeatherNow. Do not upload content you do not have the right to use. You are responsible for maintaining any backups you consider important.</p>

      <h2>Third-party services and content</h2>
      <p>WeatherNow may display or link to information from third parties, including weather providers, map services, news publishers, Google services, YouTube, and other data providers. Their services, content, availability, and policies are controlled by those providers, not WeatherNow.</p>

      <h2>Acceptable use</h2>
      <p>You may not use WeatherNow to violate applicable law, interfere with the service, attempt unauthorized access to accounts or systems, abuse third-party APIs, or misuse content supplied by third-party providers.</p>

      <h2>Availability and changes</h2>
      <p>WeatherNow may change, suspend, or discontinue features when providers, APIs, technical requirements, or project needs change. Continuous availability is not guaranteed.</p>

      <h2>No warranties</h2>
      <p>WeatherNow is provided on an "as is" and "as available" basis without warranties of uninterrupted operation, error-free data, forecast accuracy, or fitness for a particular purpose, to the extent permitted by applicable law.</p>

      <h2>Limitation of liability</h2>
      <p>To the extent permitted by applicable law, the developer of WeatherNow is not liable for losses resulting from reliance on weather information, provider outages, unavailable features, lost locally stored data, third-party content, or use of the service.</p>

      <h2>Changes to these terms</h2>
      <p>These Terms may be updated as WeatherNow changes. Continued use after an updated version is published constitutes acceptance of the revised Terms to the extent permitted by applicable law.</p>

      <h2>Contact</h2>
      <p>Questions about these Terms can be raised through the <a href="https://github.com/unknownjed/WeatherNow" rel="noopener noreferrer">WeatherNow GitHub repository</a>.</p>
    `));
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








