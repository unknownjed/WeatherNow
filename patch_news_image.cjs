const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldReturn = `  return (
    <a 
      key={idx}`;
const newReturn = `  // Hide articles that fail to load an image preview to keep the feed visually clean
  if (!loadingImg && !imgUrl) return null;

  return (
    <a 
      key={idx}`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
