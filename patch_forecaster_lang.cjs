const fs = require('fs');

let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const oldVoiceBlock = /const voices = speechAPI\.getVoices\(\);[\s\S]*?preferredVoice = voices\.find\(v => v\.lang\.includes\('en-'\) && \(v\.name\.includes\('Samantha'\) \|\| v\.name\.includes\('Victoria'\) \|\| v\.name\.includes\('Karen'\) \|\| v\.name\.includes\('Google UK English Female'\) \|\| v\.name\.includes\('Google US English'\)\)\);\n\s*\}/;

const newVoiceBlock = `const voices = speechAPI.getVoices();
      let preferredVoice;
      if (language === 'es') {
          globalUtterance.lang = 'es-ES';
          preferredVoice = voices.find(v => v.lang.includes('es-'));
      } else if (language === 'ja') {
          globalUtterance.lang = 'ja-JP';
          preferredVoice = voices.find(v => v.lang.includes('ja-'));
      } else if (language === 'fr') {
          globalUtterance.lang = 'fr-FR';
          preferredVoice = voices.find(v => v.lang.includes('fr-'));
      } else if (language === 'zh') {
          globalUtterance.lang = 'zh-CN';
          preferredVoice = voices.find(v => v.lang.includes('zh-'));
      } else if (language === 'de') {
          globalUtterance.lang = 'de-DE';
          preferredVoice = voices.find(v => v.lang.includes('de-'));
      } else {
          globalUtterance.lang = 'en-US';
          preferredVoice = voices.find(v => v.lang.includes('en-') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen') || v.name.includes('Google UK English Female') || v.name.includes('Google US English')));
      }`;

code = code.replace(oldVoiceBlock, newVoiceBlock);

fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
