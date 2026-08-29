
import 'dotenv/config';
import Parser from 'rss-parser';
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

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware to parse JSON
  app.use(express.json());

  app.get('/api/youtube-search', async (req, res) => {
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

    const cacheKey = `${query.toLocaleLowerCase()}|${pageToken}`;
    const cached = youtubeSearchCache.get(cacheKey);
    if (cached && now - cached.timestamp < YOUTUBE_CACHE_TTL) return res.json(cached.data);

    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10',
        videoEmbeddable: 'true',
        safeSearch: 'moderate',
        maxResults: '25',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        headers: { 'x-goog-api-key': apiKey },
      });
      const payload = await response.json();
      if (!response.ok) {
        console.error('YouTube search failed:', response.status, payload?.error?.message || 'Unknown API error');
        return res.status(response.status).json({ error: payload?.error?.message || 'YouTube search failed.', items: [] });
      }
      const data = {
        nextPageToken: payload.nextPageToken || null,
        items: (payload.items || []).map((item: any) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          channelTitle: item.snippet?.channelTitle,
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        })).filter((item: any) => item.videoId && item.title),
      };
      youtubeSearchCache.set(cacheKey, { data, timestamp: now });
      return res.json(data);
    } catch (error) {
      console.error('YouTube search proxy error:', error);
      return res.status(502).json({ error: 'Unable to reach YouTube search.', items: [] });
    }
  });

  // API Proxy Routes
  
  // 1. Weather Forecast Proxy
  app.get("/api/weather", async (req, res) => {
    try {
      const { lat, lon, tempUnit, windUnit, precipUnit } = req.query;
      let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      
      if (tempUnit === 'fahrenheit') url += '&temperature_unit=fahrenheit';
      if (windUnit === 'mph') url += '&wind_speed_unit=mph';
      if (precipUnit === 'inch') url += '&precipitation_unit=inch';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather API Error: ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Weather):", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  // 2. Historical Data Proxy
  app.get("/api/historical", async (req, res) => {
    try {
      const { lat, lon, startDate, endDate, tempUnit, precipUnit } = req.query;
      let url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      
      if (tempUnit === 'fahrenheit') url += '&temperature_unit=fahrenheit';
      if (precipUnit === 'inch') url += '&precipitation_unit=inch';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Archive API Error: ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Historical):", error);
      res.status(500).json({ error: "Failed to fetch historical data" });
    }
  });

  // 3. Search Locations Proxy (General Weather Cities)
  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q as string)}&count=5&language=en&format=json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Geocoding API Error: ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Search):", error);
      res.status(500).json({ error: "Failed to search locations" });
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
    try {
      const { lat, lon } = req.query;
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.city || data.locality || data.principalSubdivision) return res.json(data);
      }

      // Fallback for mobile networks or rate limits affecting the primary API.
      const fallbackUrl = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&format=jsonv2&zoom=10&addressdetails=1`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'WeatherNow/1.0 contact' },
        signal: AbortSignal.timeout(8000),
      });
      if (!fallbackResponse.ok) throw new Error(`Reverse Geocode fallback error: ${fallbackResponse.status}`);
      const fallback = await fallbackResponse.json();
      const address = fallback.address || {};
      res.json({
        city: address.city || address.town || address.municipality || address.village || address.county || '',
        locality: address.city_district || address.suburb || '',
        principalSubdivision: address.state || address.region || '',
        countryName: address.country || '',
        displayName: fallback.display_name || '',
      });
    } catch (error) {
      console.error("Server proxy error (Reverse Geocode):", error);
      res.status(500).json({ error: "Failed to reverse geocode" });
    }
  });

  // 5. Routing Proxy
  app.get("/api/route", async (req, res) => {
    try {
      const { startLon, startLat, endLon, endLat } = req.query;
      const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;
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
      
      const feed = await rssParser.parseURL(url);
      
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
      // Return empty feed structure on error so client does not block or throw
      res.status(200).json({ title: "News", items: [] });
    }
  });

  // 6. Link Meta Image Proxy
  app.get("/api/link-preview", async (req, res) => {
    try {
      let { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing url" });
      }
      
      // If it's a Bing News redirect link, extract the target URL to fetch directly
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('bing.com') && urlObj.searchParams.has('url')) {
          url = urlObj.searchParams.get('url') || url;
        }
      } catch (e) {}
      
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9' 
        },
        signal: AbortSignal.timeout(6500)
      });
      if (!response.ok) {
        return res.json({ image: null });
      }
      const html = await response.text();
      
      const ogImageMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) || 
                           html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i) ||
                           html.match(/<img[^>]+src=["']([^"']+)["']/i);
                           
      if (ogImageMatch && ogImageMatch[1]) {
        // Handle relative URLs if any
        let imgUrl = ogImageMatch[1];
        imgUrl = imgUrl.replace(/&amp;/g, '&');
        imgUrl = new URL(imgUrl, response.url || url).toString();
        if (/\b(logo|favicon|site-icon|app-icon|avatar|brandmark)\b/i.test(new URL(imgUrl).pathname)) {
          return res.json({ image: null });
        }
        res.json({ image: imgUrl });
      } else {
        res.json({ image: null });
      }
    } catch (error) {
      console.error("Link preview error");
      res.json({ image: null });
    }
  });


  // 7. Radar Proxy
  app.get("/api/radar", async (req, res) => {
    try {
      const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      if (!response.ok) throw new Error(`RainViewer API Error: ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Radar):", error);
      res.status(500).json({ error: "Failed to fetch radar data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'sw.js'));
    });
    app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.sendFile(path.join(distPath, 'manifest.json'));
    });
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
