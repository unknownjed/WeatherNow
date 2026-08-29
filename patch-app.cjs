const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const tImport = `import { useTranslation } from './lib/i18n';\n`;
if (!code.includes(tImport)) {
  code = code.replace("import { SettingsPanel }", tImport + "import { SettingsPanel }");
}

const hook = `  const t = useTranslation(settings.language);\n`;
if (!code.includes("useTranslation(settings.language)")) {
  code = code.replace("  useEffect(() => {", hook + "\n  useEffect(() => {");
}

code = code.replace(/>Regional Radar</g, ">{t('regionalRadar')}<");
code = code.replace(/>24-Hour Temperature Trend</g, ">{t('hourTempTrend')}<");
code = code.replace(/>5-Day Forecast</g, ">{t('fiveDayForecast')}<");
code = code.replace(/>Data unavailable</g, ">{t('dataUnavailable')}<");
code = code.replace(/>Failed to load weather data.</g, ">{t('failedToLoadWeather')}<");
code = code.replace(/>Retry</g, ">{t('retry')}<");
code = code.replace(/'SEVERE WARNING'/g, "t('severeWarning')");
code = code.replace(/'UPCOMING ALERT'/g, "t('upcomingAlert')");
code = code.replace(/>Connect Google Calendar</g, ">{t('connectCalendar')}<");
code = code.replace(/>Sign in to see how the weather might affect your upcoming schedule.</g, ">{t('calendarDescription')}<");
code = code.replace(/>Sign in with Google</g, ">{t('signInWithGoogle')}<");
code = code.replace(/>No upcoming events this week.</g, ">{t('noEvents')}<");

code = code.replace(/>Weather</g, ">{t('weatherDashboard')}<");
// Need to carefully replace only the bottom nav tab names.
code = code.replace(/<span className="text-\[10px\] font-medium tracking-wider uppercase">Weather<\/span>/g, `<span className="text-[10px] font-medium tracking-wider uppercase">{t('dashboard')}</span>`);
code = code.replace(/<span className="text-\[10px\] font-medium tracking-wider uppercase">News<\/span>/g, `<span className="text-[10px] font-medium tracking-wider uppercase">{t('news')}</span>`);
code = code.replace(/<span className="text-\[10px\] font-medium tracking-wider uppercase">Calendar<\/span>/g, `<span className="text-[10px] font-medium tracking-wider uppercase">{t('calendar')}</span>`);
code = code.replace(/<span className="text-\[10px\] font-medium tracking-wider uppercase">Settings<\/span>/g, `<span className="text-[10px] font-medium tracking-wider uppercase">{t('settings')}</span>`);


fs.writeFileSync('src/App.tsx', code);
