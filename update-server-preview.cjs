const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const previewEndpoint = `
  // 6. Link Meta Image Proxy
  app.get("/api/link-preview", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing url" });
      }
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' },
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
`;

if (!content.includes('/api/link-preview')) {
  content = content.replace('// Vite middleware for development', previewEndpoint + '\n  // Vite middleware for development');
  fs.writeFileSync('server.ts', content, 'utf8');
  console.log('Updated server.ts');
}
