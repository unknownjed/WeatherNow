const fs = require('fs');

const extraEn = {
  connectCalendarTab: "Please connect your Google Calendar account in the top right header to view your full schedule in this tab.",
  station: "Station",
  uptime: "Uptime",
  source: "Source",
  celsius: "°Celsius",
  fahrenheit: "°Fahrenheit",
  kmh: "km/h",
  mph: "mph",
  mm: "mm",
  inches: "inches",
  twelveHour: "12-Hour",
  twentyFourHour: "24-Hour",
  device: "Device",
  saved: "Saved",
  mapDefaultLayer: "Map Default Layer",
  mapDefaultDesc: "Initial radar overlay shown.",
  cloudCover: "Cloud Cover",
  googleCalendar: "Google Calendar",
  installAppText: "Install App"
};

const extraEs = {
  connectCalendarTab: "Conecte su cuenta de Google Calendar en el encabezado superior derecho para ver su horario completo en esta pestaña.",
  station: "Estación",
  uptime: "Tiempo de act.",
  source: "Fuente",
  celsius: "°Celsius",
  fahrenheit: "°Fahrenheit",
  kmh: "km/h",
  mph: "mph",
  mm: "mm",
  inches: "pulgadas",
  twelveHour: "12 horas",
  twentyFourHour: "24 horas",
  device: "Dispositivo",
  saved: "Guardado",
  mapDefaultLayer: "Capa de mapa por defecto",
  mapDefaultDesc: "Capa de radar inicial mostrada.",
  cloudCover: "Nubosidad",
  googleCalendar: "Google Calendar",
  installAppText: "Instalar App"
};

const extraFr = {
  connectCalendarTab: "Veuillez connecter votre compte Google Agenda dans l'en-tête en haut à droite pour voir votre emploi du temps complet dans cet onglet.",
  station: "Station",
  uptime: "Disponibilité",
  source: "Source",
  celsius: "°Celsius",
  fahrenheit: "°Fahrenheit",
  kmh: "km/h",
  mph: "mph",
  mm: "mm",
  inches: "pouces",
  twelveHour: "12 Heures",
  twentyFourHour: "24 Heures",
  device: "Appareil",
  saved: "Enregistré",
  mapDefaultLayer: "Couche de carte par défaut",
  mapDefaultDesc: "Superposition radar initiale affichée.",
  cloudCover: "Couverture nuageuse",
  googleCalendar: "Google Agenda",
  installAppText: "Installer l'app"
};

const extraDe = {
  connectCalendarTab: "Bitte verbinden Sie Ihr Google Kalender-Konto oben rechts, um Ihren vollständigen Zeitplan in diesem Tab anzuzeigen.",
  station: "Station",
  uptime: "Betriebszeit",
  source: "Quelle",
  celsius: "°Celsius",
  fahrenheit: "°Fahrenheit",
  kmh: "km/h",
  mph: "mph",
  mm: "mm",
  inches: "Zoll",
  twelveHour: "12-Stunden",
  twentyFourHour: "24-Stunden",
  device: "Gerät",
  saved: "Gespeichert",
  mapDefaultLayer: "Standard-Kartenebene",
  mapDefaultDesc: "Anfangs angezeigtes Radar-Overlay.",
  cloudCover: "Bewölkung",
  googleCalendar: "Google Kalender",
  installAppText: "App installieren"
};

const extraZh = {
  connectCalendarTab: "请在右上角连接您的 Google 日历帐户，以在此标签页中查看您的完整日程安排。",
  station: "站点",
  uptime: "正常运行时间",
  source: "来源",
  celsius: "°Celsius",
  fahrenheit: "°Fahrenheit",
  kmh: "km/h",
  mph: "mph",
  mm: "毫米",
  inches: "英寸",
  twelveHour: "12小时",
  twentyFourHour: "24小时",
  device: "设备",
  saved: "已保存",
  mapDefaultLayer: "地图默认图层",
  mapDefaultDesc: "最初显示的雷达叠加层。",
  cloudCover: "云量",
  googleCalendar: "Google 日历",
  installAppText: "安装应用"
};

const extraJa = {
  connectCalendarTab: "このタブで完全なスケジュールを表示するには、右上のヘッダーで Google カレンダー アカウントを接続してください。",
  station: "ステーション",
  uptime: "稼働時間",
  source: "ソース",
  celsius: "°Celsius",
  fahrenheit: "°Fahrenheit",
  kmh: "km/h",
  mph: "mph",
  mm: "mm",
  inches: "インチ",
  twelveHour: "12時間",
  twentyFourHour: "24時間",
  device: "デバイス",
  saved: "保存済み",
  mapDefaultLayer: "マップのデフォルトレイヤー",
  mapDefaultDesc: "最初に表示されるレーダーオーバーレイ。",
  cloudCover: "雲量",
  googleCalendar: "Google カレンダー",
  installAppText: "アプリをインストール"
};

let code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

function injectTranslations(langCode, extraObj, codeStr) {
  const marker1 = '"' + langCode + '": {';
  const marker2 = langCode + ': {';
  let markerIdx = codeStr.indexOf(marker1);
  if (markerIdx === -1) markerIdx = codeStr.indexOf(marker2);
  
  if (markerIdx !== -1) {
    const injectStr = Object.entries(extraObj).map(([k, v]) => '    "' + k + '": "' + v + '",').join('\n') + '\n';
    const splitIdx = codeStr.indexOf('{', markerIdx) + 1;
    return codeStr.slice(0, splitIdx) + '\n' + injectStr + codeStr.slice(splitIdx);
  }
  return codeStr;
}

code = injectTranslations('en', extraEn, code);
code = injectTranslations('es', extraEs, code);
code = injectTranslations('fr', extraFr, code);
code = injectTranslations('de', extraDe, code);
code = injectTranslations('zh', extraZh, code);
code = injectTranslations('ja', extraJa, code);

fs.writeFileSync('src/lib/i18n.ts', code);
