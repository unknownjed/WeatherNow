const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/>Locating...</g, `>{t('locating')}<`);
code = code.replace(/>Currently</g, `>{t('currently')}<`);
code = code.replace(/>Humidity</g, `>{t('humidity')}<`);
code = code.replace(/>Wind</g, `>{t('wind')}<`);
code = code.replace(/>Feels Like</g, `>{t('feelsLike')}<`);

fs.writeFileSync('src/App.tsx', code);
