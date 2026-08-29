const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  />24-Hour Forecast<\/h3>/g,
  ">{t('hourlyForecast')}</h3>"
);

code = code.replace(
  />24-Hour Temperature Trend<\/h3>/g,
  ">{t('hourTempTrend')}</h3>"
);

code = code.replace(
  />5-Day Forecast<\/h3>/g,
  ">{t('fiveDayForecast')}</h3>"
);

fs.writeFileSync('src/App.tsx', code);
