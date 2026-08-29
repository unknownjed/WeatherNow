const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

// quick regex parse to see keys in each language
const matches = [...content.matchAll(/"([^"]+)": \{([^}]+)\}/g)];
for (const match of matches) {
  const lang = match[1];
  const keys = match[2].match(/"([^"]+)":/g)?.map(s => s.replace(/"/g, '').replace(':', '')) || [];
  console.log(lang, keys.length);
}
