const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

code = code.replace(/>Data unavailable</g, ">{t('dataUnavailable')}<");

fs.writeFileSync('src/components/NewsFeed.tsx', code);
