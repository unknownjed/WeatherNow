const fs = require('fs');

let content = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

// Replace google news URLs with BBC/Flipboard
content = content.replace(
  /country \? \`https:\/\/news\.google\.com\/rss\/headlines\/section\/geo\/\$\{encodeURIComponent\(country\)\}\` \: null,/,
  'country ? `https://flipboard.com/topic/${encodeURIComponent(country)}.rss` : null,'
);

content = content.replace(
  /\`https:\/\/news\.google\.com\/rss\/headlines\/section\/topic\/WORLD\`/,
  '`https://feeds.bbci.co.uk/news/world/rss.xml`'
);

content = content.replace(
  /\`https:\/\/news\.google\.com\/rss\/headlines\/section\/topic\/SCITECH\`/,
  '`https://feeds.bbci.co.uk/news/technology/rss.xml`'
);

fs.writeFileSync('src/components/NewsFeed.tsx', content, 'utf8');
console.log('Updated NewsFeed.tsx URLs');
