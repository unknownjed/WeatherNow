const fs = require('fs');

function replaceInFile(filename, replaceFunc) {
  let code = fs.readFileSync(filename, 'utf8');
  code = replaceFunc(code);
  fs.writeFileSync(filename, code);
}

// FiveDayForecast
replaceInFile('src/components/FiveDayForecast.tsx', (code) => {
  code = code.replace("import { format } from 'date-fns';", "import { format } from 'date-fns';\nimport { getDateLocale, useTranslation } from '../lib/i18n';");
  code = code.replace("export function FiveDayForecast({ data }: { data: any }) {", "export function FiveDayForecast({ data, settings }: { data: any; settings: any }) {");
  
  // Update Today translation
  code = code.replace("if (!data || !data.time) return null;", "const t = useTranslation(settings?.language || 'en');\n  if (!data || !data.time) return null;");
  
  code = code.replace("{i === 0 ? 'Today' : format(day.date, 'EEE')}", "{i === 0 ? t('today') : format(day.date, 'EEE', { locale: getDateLocale(settings?.language || 'en') })}");
  return code;
});

// HourlyForecast
replaceInFile('src/components/HourlyForecast.tsx', (code) => {
  code = code.replace("import { format } from 'date-fns';", "import { format } from 'date-fns';\nimport { getDateLocale, useTranslation } from '../lib/i18n';");
  
  code = code.replace("const now = new Date();", "const t = useTranslation(settings?.language || 'en');\n  const now = new Date();");
  
  code = code.replace("{i === 0 ? 'Now' : format(hour.date, settings?.timeFormat === '24h' ? 'HH:mm' : 'ha')}", "{i === 0 ? t('currently') : format(hour.date, settings?.timeFormat === '24h' ? 'HH:mm' : 'ha', { locale: getDateLocale(settings?.language || 'en') })}");
  return code;
});

// WeatherChart
replaceInFile('src/components/WeatherChart.tsx', (code) => {
  code = code.replace("import { format, parseISO } from 'date-fns';", "import { format, parseISO } from 'date-fns';\nimport { getDateLocale } from '../lib/i18n';");
  code = code.replace("time: format(parseISO(time), settings?.timeFormat === '24h' ? 'HH:mm' : 'ha'),", "time: format(parseISO(time), settings?.timeFormat === '24h' ? 'HH:mm' : 'ha', { locale: getDateLocale(settings?.language || 'en') }),");
  return code;
});

// HistoricalChart
replaceInFile('src/components/HistoricalChart.tsx', (code) => {
  code = code.replace("import { format, parseISO } from 'date-fns';", "import { format, parseISO } from 'date-fns';\nimport { getDateLocale } from '../lib/i18n';");
  code = code.replace("export function HistoricalChart({ data }: { data: any }) {", "export function HistoricalChart({ data, settings }: { data: any; settings: any }) {");
  code = code.replace("date: format(parseISO(time), 'MMM d'),", "date: format(parseISO(time), 'MMM d', { locale: getDateLocale(settings?.language || 'en') }),");
  return code;
});

