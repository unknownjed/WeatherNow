const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

code = code.replace(/>\s*km\/h\s*<\/button>/g, ">{t('kmh')}</button>");
code = code.replace(/>\s*mph\s*<\/button>/g, ">{t('mph')}</button>");
code = code.replace(/>\s*Millimeters\s*<\/button>/g, ">{t('mm')}</button>");
code = code.replace(/>\s*Inches\s*<\/button>/g, ">{t('inches')}</button>");
code = code.replace(/>\s*12-hour\s*<\/button>/g, ">{t('twelveHour')}</button>");
code = code.replace(/>\s*24-hour\s*<\/button>/g, ">{t('twentyFourHour')}</button>");
code = code.replace(/>\s*Device\s*<\/button>/g, ">{t('device')}</button>");
code = code.replace(/>\s*Saved\s*<\/button>/g, ">{t('saved')}</button>");

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
