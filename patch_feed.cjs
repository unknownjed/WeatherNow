const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldRegex = /const bingNewsUrl = [^\n]+;\s+const fallbackUrl = [^\n]+;\s+const urls = \[bingNewsUrl, fallbackUrl\];/s;

const newCode = `const bingWeather = \`https://www.bing.com/news/search?q=\${encodeURIComponent(topic + ' weather')}&format=rss\`;
      const bingNews = \`https://www.bing.com/news/search?q=\${encodeURIComponent(topic + ' top news')}&format=rss\`;
      const bingLocal = \`https://www.bing.com/news/search?q=\${encodeURIComponent(topic + ' local updates')}&format=rss\`;
      const fallbackUrl = \`https://flipboard.com/topic/\${encodeURIComponent(country ? country.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'news')}.rss\`;
      const urls = [bingWeather, bingNews, bingLocal, fallbackUrl];`;

code = code.replace(oldRegex, newCode);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
