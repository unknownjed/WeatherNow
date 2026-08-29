import Parser from 'rss-parser';
const parser = new Parser();
(async () => {
  const feed = await parser.parseURL('https://flipboard.com/topic/weather.rss');
  console.log(feed.items[0]);
})();
