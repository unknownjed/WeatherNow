const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const radarRoute = `
  // 7. Radar Proxy
  app.get("/api/radar", async (req, res) => {
    try {
      const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      if (!response.ok) throw new Error(\`RainViewer API Error: \${response.status}\`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server proxy error (Radar):", error);
      res.status(500).json({ error: "Failed to fetch radar data" });
    }
  });
`;

code = code.replace("  // Vite middleware", radarRoute + "\n  // Vite middleware");
fs.writeFileSync('server.ts', code);
