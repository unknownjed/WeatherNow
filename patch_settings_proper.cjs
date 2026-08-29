const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

code = code.replace(/Device GPS/g, "{t('deviceLocation')}");
code = code.replace(/Primary Saved/g, "{t('savedLocations')}");

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
