const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldCode = `      let hl = 'en-US';
      let gl = 'US';
      if (language === 'es') { hl = 'es-419'; gl = 'MX'; }
      else if (language === 'fr') { hl = 'fr-FR'; gl = 'FR'; }
      else if (language === 'de') { hl = 'de-DE'; gl = 'DE'; }
      else if (language === 'zh') { hl = 'zh-CN'; gl = 'CN'; }
      else if (language === 'ja') { hl = 'ja'; gl = 'JP'; }
      else if (language === 'ar') { hl = 'ar'; gl = 'EG'; }
      else if (language === 'ko') { hl = 'ko'; gl = 'KR'; }
      else if (language === 'ru') { hl = 'ru'; gl = 'RU'; }
      else if (language === 'it') { hl = 'it'; gl = 'IT'; }
      else if (language === 'pt') { hl = 'pt-BR'; gl = 'BR'; }
      else if (language === 'hi') { hl = 'hi'; gl = 'IN'; }`;

const newCode = `      let hl = 'en-US';
      let gl = 'US';`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
