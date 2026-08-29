const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("<FiveDayForecast data={weather.daily} />", "<FiveDayForecast data={weather.daily} settings={settings} />");
code = code.replace("<HistoricalChart data={historicalData} />", "<HistoricalChart data={historicalData} settings={settings} />");

fs.writeFileSync('src/App.tsx', code);
