const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherMap.tsx', 'utf8');

code = code.replace(
  "const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');",
  "const res = await fetch('/api/radar');"
);

fs.writeFileSync('src/components/WeatherMap.tsx', code);
