const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');
code = code.replace("setNews(allItems.slice(0, 30));", "setNews(allItems.slice(0, 50));");
fs.writeFileSync('src/components/NewsFeed.tsx', code);
