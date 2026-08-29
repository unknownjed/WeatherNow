const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importStatement = "import Parser from 'rss-parser';\nconst rssParser = new Parser();\n";
code = code.replace("import express", importStatement + "import express");

const rssRoute = `
  app.get("/api/rss", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing url" });
      }
      const feed = await rssParser.parseURL(url);
      res.json(feed);
    } catch (error) {
      console.error("RSS fetch error for url:", req.query.url, error);
      res.status(500).json({ error: "Failed to fetch RSS" });
    }
  });
`;

code = code.replace('  // 6. Link Meta Image Proxy', rssRoute + '\n  // 6. Link Meta Image Proxy');

fs.writeFileSync('server.ts', code);
