const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /                    24-Hour Forecast\s*<\/h3>/g,
  "                    {t('hourlyForecast')}\n                  </h3>"
);

code = code.replace(
  /                    24-Hour Temperature Trend\s*<\/h3>/g,
  "                    {t('hourTempTrend')}\n                  </h3>"
);

code = code.replace(
  /                    5-Day Forecast\s*<\/h3>/g,
  "                    {t('fiveDayForecast')}\n                  </h3>"
);

fs.writeFileSync('src/App.tsx', code);
