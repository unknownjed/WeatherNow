const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

// The language block replacement:
const oldLangBlock = `                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="ja">日本語</option>
                    <option value="fr">Français</option>`;
                    
const newLangBlock = `                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="it">Italiano</option>
                    <option value="pt">Português</option>
                    <option value="ru">Русский</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="hi">हिन्दी</option>
                    <option value="ar">العربية</option>`;
                    
code = code.replace(oldLangBlock, newLangBlock);

code = code.replace(/>Settings</g, `>{t('settings')}<`);
code = code.replace(/>Manage your weather preferences and app appearance.</g, `>{t('settingsDesc')}<`);
code = code.replace(/>Units & Formats</g, `>{t('unitsAndFormats')}<`);
code = code.replace(/>Temperature</g, `>{t('temperature')}<`);
code = code.replace(/>Select your preferred temperature unit.</g, `>{t('tempDesc')}<`);
code = code.replace(/>Wind Speed</g, `>{t('windSpeed')}<`);
code = code.replace(/>Select your preferred wind speed unit.</g, `>{t('windDesc')}<`);
code = code.replace(/>Precipitation</g, `>{t('precipitation')}<`);
code = code.replace(/>Select your preferred precipitation unit.</g, `>{t('precipDesc')}<`);
code = code.replace(/>Time Format</g, `>{t('timeFormat')}<`);
code = code.replace(/>Select 12-hour or 24-hour clock.</g, `>{t('timeDesc')}<`);
code = code.replace(/>Location & Privacy</g, `>{t('locationPrivacy')}<`);
code = code.replace(/>Startup Location</g, `>{t('startupLocation')}<`);
code = code.replace(/>Default location when you open the app.</g, `>{t('startupDesc')}<`);
code = code.replace(/>Device Location</g, `>{t('deviceLocation')}<`);
code = code.replace(/>Saved Locations</g, `>{t('savedLocations')}<`);
code = code.replace(/>Remove</g, `>{t('remove')}<`);
code = code.replace(/>No saved locations yet.</g, `>{t('noSavedLocations')}<`);
code = code.replace(/>Save Current Location</g, `>{t('saveCurrentLocation')}<`);
code = code.replace(/>Notifications & Alerts</g, `>{t('notificationsAlerts')}<`);
code = code.replace(/>Auto-Speak Forecast</g, `>{t('autoSpeak')}<`);
code = code.replace(/>Play audio forecast on startup.</g, `>{t('autoSpeakDesc')}<`);
code = code.replace(/>Severe Weather Alerts</g, `>{t('severeAlerts')}<`);
code = code.replace(/>Show pulsing warning banners.</g, `>{t('severeAlertsDesc')}<`);
code = code.replace(/>Calendar Notifications</g, `>{t('calendarNotif')}<`);
code = code.replace(/>Receive event reminders.</g, `>{t('calendarNotifDesc')}<`);
code = code.replace(/>Calendar Alerts</g, `>{t('calendarAlerts')}<`);
code = code.replace(/>Audio alerts for upcoming events.</g, `>{t('calendarAlertsDesc')}<`);
code = code.replace(/>Appearance</g, `>{t('appearance')}<`);
code = code.replace(/>App color mode.</g, `>{t('themeDesc')}<`);

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
