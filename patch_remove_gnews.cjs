const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldRegex = /const googleNewsUrl = [^\n]+;\s+const bingNewsUrl = [^\n]+;\s+const fallbackUrl = [^\n]+;\s+const urls = \[bingNewsUrl, googleNewsUrl, fallbackUrl\];/s;

const newCode = `const bingNewsUrl = \`https://www.bing.com/news/search?q=\${encodeURIComponent(topic + ' weather')}&format=rss\`;
      const fallbackUrl = \`https://flipboard.com/topic/\${encodeURIComponent(country ? country.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'weather')}.rss\`;
      const urls = [bingNewsUrl, fallbackUrl];`;

code = code.replace(oldRegex, newCode);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
