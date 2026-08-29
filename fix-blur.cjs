const fs = require('fs');

let content = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const helper = `
function getHighResImgUrl(url: string | null): string | null {
  if (!url) return null;
  // Upgrade BBC thumbnails from 240px to 800px width
  if (url.includes('ichef.bbci.co.uk') && url.includes('/240/')) {
    return url.replace('/240/', '/800/');
  }
  return url;
}
`;

if (!content.includes('getHighResImgUrl')) {
  // Insert helper before NewsItemCard
  content = content.replace('function NewsItemCard', helper + '\nfunction NewsItemCard');
  
  // Update state init
  content = content.replace(
    'const [imgUrl, setImgUrl] = useState<string | null>(item.enclosure?.link || item.enclosure?.thumbnail || item.thumbnail || null);',
    'const [imgUrl, setImgUrl] = useState<string | null>(getHighResImgUrl(item.enclosure?.link || item.enclosure?.thumbnail || item.thumbnail || null));'
  );
  
  // Update link-preview result
  content = content.replace(
    'if (data.image) setImgUrl(data.image);',
    'if (data.image) setImgUrl(getHighResImgUrl(data.image));'
  );

  fs.writeFileSync('src/components/NewsFeed.tsx', content, 'utf8');
  console.log('Fixed blurred images');
}
