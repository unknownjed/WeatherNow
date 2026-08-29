import Parser from 'rss-parser';
const parser = new Parser();
(async () => {
  const feed = await parser.parseURL('https://news.google.com/rss/search?q=weather');
  console.log(feed.items[0]);
})();
