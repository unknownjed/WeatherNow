const fs = require('fs');

const cleanServer = `
import Parser from 'rss-parser';
const rssParser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure']
    ]
  }
});

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Proxy Routes
  
  // 1. Weather Forecast Proxy
  app.get("/api/weather", async (req, res) => {
    try {
      const { lat, lon, tempUnit, windUnit, precipUnit } = req.query;
      let url = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto\`;
      
      if (tempUnit === 'fahrenheit') url += '&temperature_unit=fahrenheit';
      if (windUnit === 'mph') url += '&wind_speed_unit=mph';
      if (precipUnit === 'inch') url += '&precipitation_unit=inch';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(\`Weather API Error: \${response.status}\`);
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
      let url = \`https://archive-api.open-meteo.com/v1/archive?latitude=\${lat}&longitude=\${lon}&start_date=\${startDate}&end_date=\${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto\`;
      
      if (tempUnit === 'fahrenheit') url += '&temperature_unit=fahrenheit';
      if (precipUnit === 'inch') url += '&precipitation_unit=inch';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(\`Archive API Error: \${response.status}\`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Historical):", error);
      res.status(500).json({ error: "Failed to fetch historical data" });
    }
  });

  // 3. Search Locations Proxy
  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      const url = \`https://geocoding-api.open-meteo.com/v1/search?name=\${encodeURIComponent(q)}&count=5&language=en&format=json\`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(\`Geocoding API Error: \${response.status}\`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Search):", error);
      res.status(500).json({ error: "Failed to search locations" });
    }
  });

  // 4. Reverse Geocoding Proxy
  app.get("/api/reverse-geocode", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      const url = \`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=\${lat}&longitude=\${lon}&localityLanguage=en\`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(\`Reverse Geocode API Error: \${response.status}\`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Reverse Geocode):", error);
      res.status(500).json({ error: "Failed to reverse geocode" });
    }
  });

  // 5. Routing Proxy
  app.get("/api/route", async (req, res) => {
    try {
      const { startLon, startLat, endLon, endLat } = req.query;
      const url = \`https://router.project-osrm.org/route/v1/driving/\${startLon},\${startLat};\${endLon},\${endLat}?overview=full&geometries=geojson&steps=true\`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(\`Routing API Error: \${response.status}\`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Routing):", error);
      res.status(500).json({ error: "Failed to fetch route" });
    }
  });
  
  // RSS Proxy
  app.get("/api/rss", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing url" });
      }
      
      const feed = await rssParser.parseURL(url);
      
      // Post-process feed to extract thumbnail
      if (feed && feed.items) {
        feed.items = feed.items.map(item => {
          let thumbnail = null;
          
          if (item.mediaContent && item.mediaContent['$'] && item.mediaContent['$'].url) {
            thumbnail = item.mediaContent['$'].url;
          } else if (item.mediaThumbnail && item.mediaThumbnail['$'] && item.mediaThumbnail['$'].url) {
            thumbnail = item.mediaThumbnail['$'].url;
          } else if (item.enclosure && item.enclosure.url) {
            thumbnail = item.enclosure.url;
          } else if (item.content) {
            const match = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match) thumbnail = match[1];
          }
          
          return { ...item, thumbnail };
        });
      }
      
      res.json(feed);
    } catch (error) {
      console.error("RSS fetch error for url:", req.query.url, error);
      res.status(500).json({ error: "Failed to fetch RSS" });
    }
  });

  // 6. Link Meta Image Proxy
  app.get("/api/link-preview", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing url" });
      }
      
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9' 
        },
        signal: AbortSignal.timeout(5000)
      });
      const html = await response.text();
      
      const ogImageMatch = html.match(/<meta\\s+(?:property|name)=["'](?:og:image|twitter:image)["']\\s+content=["']([^"']+)["']/i) || 
                           html.match(/<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
                           
      if (ogImageMatch && ogImageMatch[1]) {
        // Handle relative URLs if any
        let imgUrl = ogImageMatch[1];
        if (imgUrl.startsWith('/')) {
          const origin = new URL(url).origin;
          imgUrl = origin + imgUrl;
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();
`;

fs.writeFileSync('server.ts', cleanServer);
