const Parser = require('rss-parser');
const parser = new Parser({
  customFields: {
    item: [
      ['News:Image', 'newsImage'],
    ]
  }
});
parser.parseURL('https://www.bing.com/news/search?q=Seattle+weather&format=rss').then(feed => {
  console.log(feed.items[0]);
}).catch(console.error);
