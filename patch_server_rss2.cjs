const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldParser = "const rssParser = new Parser();";
const newParser = `const rssParser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure']
    ]
  }
});`;

code = code.replace(oldParser, newParser);

const oldRoute = `      const feed = await rssParser.parseURL(url);
      res.json(feed);`;

const newRoute = `      const feed = await rssParser.parseURL(url);
      
      // Post-process feed to extract thumbnail
      if (feed && feed.items) {
        feed.items = feed.items.map(item => {
          let thumbnail = null;
          
          if (item.mediaContent && item.mediaContent['$'] && item.mediaContent['$'].url) {
            thumbnail = item.mediaContent['$'].url;
          } else if (item.mediaThumbnail && item.mediaThumbnail['$'] && item.mediaThumbnail['$'].url) {
            thumbnail = item.mediaThumbnail['$'].url;
          } else if (item.enclosure && item.enclosure.url) {
            thumbnail = item.enclosure.url;
          } else if (item.content) {
            const match = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match) thumbnail = match[1];
          }
          
          return { ...item, thumbnail };
        });
      }
      
      res.json(feed);`;

code = code.replace(oldRoute, newRoute);

fs.writeFileSync('server.ts', code);
