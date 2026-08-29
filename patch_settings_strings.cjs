const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

code = code.replace(/>App & Integrations</g, ">{t('appIntegrations')}<");
code = code.replace(/>Google Calendar</g, ">{t('googleCalendar')}<");
// We might have multiple "Install App" - wait, there is the button with Install App
code = code.replace(/>Install App</g, ">{t('installAppText')}<");

code = code.replace(/>Theme</g, ">{t('theme')}<");
code = code.replace(/>Map Default Layer</g, ">{t('mapDefaultLayer')}<");
code = code.replace(/>Initial radar overlay shown\.</g, ">{t('mapDefaultDesc')}<");
code = code.replace(/°Celsius/g, "{t('celsius')}");
code = code.replace(/°Fahrenheit/g, "{t('fahrenheit')}");
code = code.replace(/>km\/h</g, ">{t('kmh')}<");
code = code.replace(/>mph</g, ">{t('mph')}<");
code = code.replace(/>mm</g, ">{t('mm')}<");
code = code.replace(/>inches</g, ">{t('inches')}<");
code = code.replace(/>12-Hour</g, ">{t('twelveHour')}<");
code = code.replace(/>24-Hour</g, ">{t('twentyFourHour')}<");
code = code.replace(/>Device</g, ">{t('device')}<");
code = code.replace(/>Saved</g, ">{t('saved')}<");
code = code.replace(/>Precipitation</g, ">{t('precipitation')}<");
code = code.replace(/>Temperature</g, ">{t('temperature')}<");
code = code.replace(/>Wind</g, ">{t('wind')}<");
code = code.replace(/>Cloud Cover</g, ">{t('cloudCover')}<");

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
