const fs = require('fs');
let code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const importStatement = `import { enUS, es, fr, de, zhCN, ja, ko, ru, ar } from 'date-fns/locale';\n\n`;

const newFunc = `export function getDateLocale(lang: string) {
  switch(lang) {
    case 'es': return es;
    case 'fr': return fr;
    case 'de': return de;
    case 'zh': return zhCN;
    case 'ja': return ja;
    case 'ko': return ko;
    case 'ru': return ru;
    case 'ar': return ar;
    default: return enUS;
  }
}

export type LanguageCode = keyof typeof translations;`;

code = importStatement + code.replace('export type LanguageCode = keyof typeof translations;', newFunc);

fs.writeFileSync('src/lib/i18n.ts', code);
