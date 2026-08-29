const fs = require('fs');

const extras = {
  en: "24-Hour Forecast",
  es: "Pronóstico de 24 horas",
  fr: "Prévisions sur 24 heures",
  de: "24-Stunden-Wettervorhersage",
  zh: "24小时预报",
  ja: "24時間予報"
};

let code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

Object.keys(extras).forEach(lang => {
  const marker1 = '"' + lang + '": {';
  const marker2 = lang + ': {';
  let markerIdx = code.indexOf(marker1);
  if (markerIdx === -1) markerIdx = code.indexOf(marker2);
  
  if (markerIdx !== -1) {
    const injectStr = '    "hourlyForecast": "' + extras[lang] + '",\n';
    const splitIdx = code.indexOf('{', markerIdx) + 1;
    code = code.slice(0, splitIdx) + '\n' + injectStr + code.slice(splitIdx);
  }
});

fs.writeFileSync('src/lib/i18n.ts', code);
