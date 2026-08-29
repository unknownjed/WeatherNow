const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldUrls = `      const googleNewsUrl = \`https://news.google.com/rss/search?q=\${encodeURIComponent(topic + ' weather OR news')}&hl=\${hl}&gl=\${gl}&ceid=\${gl}:\${hl}\`;
      const fallbackUrl = \`https://flipboard.com/topic/\${encodeURIComponent(country ? country.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'weather')}.rss\`;
      const urls = [googleNewsUrl, fallbackUrl];`;

const newUrls = `      const googleNewsUrl = \`https://news.google.com/rss/search?q=\${encodeURIComponent(topic + ' weather OR news')}&hl=\${hl}&gl=\${gl}&ceid=\${gl}:\${hl}\`;
      const bingNewsUrl = \`https://www.bing.com/news/search?q=\${encodeURIComponent(topic + ' weather')}&format=rss\`;
      const fallbackUrl = \`https://flipboard.com/topic/\${encodeURIComponent(country ? country.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'weather')}.rss\`;
      const urls = [bingNewsUrl, googleNewsUrl, fallbackUrl];`;

code = code.replace(oldUrls, newUrls);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
