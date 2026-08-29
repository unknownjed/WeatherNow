const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("const url = \`https://geocoding-api.open-meteo.com/v1/search?name=\${encodeURIComponent(q)}&count=5&language=en&format=json\`;", "const url = \`https://geocoding-api.open-meteo.com/v1/search?name=\${encodeURIComponent(q as string)}&count=5&language=en&format=json\`;");

fs.writeFileSync('server.ts', code);
