const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldFunc = /function getHighResImgUrl\(url: string \| null\): string \| null \{[\s\S]*?\n\}/;

const newFunc = `function getHighResImgUrl(url: string | null): string | null {
  if (!url) return null;

  // Upgrade BBC thumbnails from 240px to 800px width
  if (url.includes('ichef.bbci.co.uk') && url.includes('/240/')) {
    return url.replace('/240/', '/800/');
  }
  
  if (url.includes('bing.com/th?id=')) {
    if (!url.includes('&w=')) {
      return url + '&w=800&h=450&c=14';
    }
  }

  return url;
}`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
