const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const matches = [...content.matchAll(/"([^"]+)":\s*\{([\s\S]*?)\}/g)];
for (const match of matches) {
  const lang = match[1];
  const block = match[2];
  const keys = block.match(/"([^"]+)":/g)?.map(s => s.replace(/"/g, '').replace(':', '')) || [];
  console.log(lang, keys.length);
}
