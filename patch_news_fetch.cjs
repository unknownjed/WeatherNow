const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

code = code.replace(
  /fetch\(\`https:\/\/api\.rss2json\.com\/v1\/api\.json\?rss_url=\$\{encodeURIComponent\(url\)\}\`\)/g,
  "fetch(`/api/rss?url=${encodeURIComponent(url)}`)"
);

fs.writeFileSync('src/components/NewsFeed.tsx', code);
