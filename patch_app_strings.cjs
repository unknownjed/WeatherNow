const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  />{t\('weatherDashboard'\)}<span className="text-sky-800 dark:text-slate-400 font-normal ml-0">Now<\/span><\/h1>/g,
  '>Weather<span className="text-sky-800 dark:text-slate-400 font-normal ml-0">Now</span></h1>'
);

code = code.replace(
  /Please connect your Google Calendar account in the top right header to view your full schedule in this tab\./g,
  "{t('connectCalendarTab')}"
);

code = code.replace(
  /Station: REK-09-ALPHA/g,
  "{t('station')}: REK-09-ALPHA"
);

code = code.replace(
  /Uptime: 99\.98%/g,
  "{t('uptime')}: 99.98%"
);

code = code.replace(
  /Source: Open-Meteo/g,
  "{t('source')}: Open-Meteo"
);

code = code.replace(
  />{settings\.windUnit === 'mph' \? 'mph' : 'km\/h'}</g,
  ">{settings.windUnit === 'mph' ? t('mph') : t('kmh')}<"
);

fs.writeFileSync('src/App.tsx', code);
