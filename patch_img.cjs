const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldRegex = /function getHighResImgUrl\(url: string \| null\): string \| null \{\n  if \(\!url\) return null;\n\n  \/\/ Upgrade BBC thumbnails from 240px to 800px width\n  if \(url\.includes\('ichef\.bbci\.co\.uk'\) && url\.includes\('\/240\/'\)\) \{\n    return url\.replace\('\/240\/', '\/800\/'\);\n  \}\n\n  return url;\n\}/g;

const newCode = `function getHighResImgUrl(url: string | null): string | null {
  if (!url) return null;

  // Upgrade BBC thumbnails from 240px to 800px width
  if (url.includes('ichef.bbci.co.uk') && url.includes('/240/')) {
    return url.replace('/240/', '/800/');
  }
  
  // Upgrade Bing News thumbnails
  if (url.includes('bing.com/th?id=')) {
    return url.replace('&pid=News', '').replace(/&w=\\d+/, '').replace(/&h=\\d+/, '') + '&w=800&h=450&c=14';
  }

  return url;
}`;

code = code.replace(oldRegex, newCode);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
