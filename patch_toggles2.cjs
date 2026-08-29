const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');
code = code.replace(/>\s*Save Current\s*<\/button>/g, ">{t('saveCurrentLocation')}</button>");
code = code.replace(/>\s*Remove\s*<\/button>/g, ">{t('remove')}</button>");
fs.writeFileSync('src/components/SettingsPanel.tsx', code);
