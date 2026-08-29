const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const oldVoiceMatch = `              preferredVoice = voices.find(v => v.lang.startsWith(language));
          }
          
          if (!preferredVoice) {
              // Fallback: just try to find by lang
              preferredVoice = voices.find(v => v.lang.includes(language));
          }`;

const newVoiceMatch = `              // robust matching
              const normalizedLang = language.toLowerCase();
              preferredVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(normalizedLang));
          }
          
          if (!preferredVoice) {
              // Fallback: just try to find by lang or name
              preferredVoice = voices.find(v => 
                  v.lang.toLowerCase().includes(language.toLowerCase()) || 
                  v.name.toLowerCase().includes(language.toLowerCase())
              );
          }`;

code = code.replace(oldVoiceMatch, newVoiceMatch);
fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
