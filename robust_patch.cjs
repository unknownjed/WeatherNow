const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldRegex = /const googleNewsUrl = [^\n]+;\s+const fallbackUrl = [^\n]+;\s+const urls = \[googleNewsUrl, fallbackUrl\];/s;

const newCode = `const googleNewsUrl = \`https://news.google.com/rss/search?q=\${encodeURIComponent(topic + ' weather OR news')}&hl=\${hl}&gl=\${gl}&ceid=\${gl}:\${hl}\`;
      const bingNewsUrl = \`https://www.bing.com/news/search?q=\${encodeURIComponent(topic + ' weather')}&format=rss\`;
      const fallbackUrl = \`https://flipboard.com/topic/\${encodeURIComponent(country ? country.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'weather')}.rss\`;
      const urls = [bingNewsUrl, googleNewsUrl, fallbackUrl];`;

code = code.replace(oldRegex, newCode);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
