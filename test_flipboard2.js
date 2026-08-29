import Parser from 'rss-parser';
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure']
    ]
  }
});
(async () => {
  const feed = await parser.parseURL('https://flipboard.com/topic/weather.rss');
  console.log(feed.items[0]);
})();
