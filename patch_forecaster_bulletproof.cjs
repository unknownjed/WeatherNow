const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

// We need to replace the entire trySpeak block up to trySpeak();
const regex = /\/\/\s*Ensure voices are loaded[\s\S]*?trySpeak\(\);/m;

const newCode = `      // Bulletproof voice loading and playback
      const speakWhenReady = () => {
          let voices = speechAPI.getVoices();
          
          const executeSpeak = () => {
              voices = speechAPI.getVoices(); // Re-fetch
              let preferredVoice;
              
              if (language === 'en') {
                  globalUtterance.lang = 'en-US';
                  preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Google UK English Female')));
                  if (!preferredVoice) preferredVoice = voices.find(v => v.lang.startsWith('en'));
              } else {
                  const langMap: Record<string, string> = {
                      es: 'es-ES', fr: 'fr-FR', ja: 'ja-JP', zh: 'zh-CN', de: 'de-DE', ko: 'ko-KR', ru: 'ru-RU', ar: 'ar-SA'
                  };
                  globalUtterance.lang = langMap[language] || 'en-US';
                  
                  const normalizedLang = language.toLowerCase();
                  
                  // First try to find a Google network voice (often higher quality on Android/Chrome)
                  preferredVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(normalizedLang) && v.name.includes('Google'));
                  
                  // Fallback to any voice matching the language
                  if (!preferredVoice) {
                      preferredVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(normalizedLang));
                  }
                  
                  // Ultimate fallback: just match the string anywhere
                  if (!preferredVoice) {
                      preferredVoice = voices.find(v => v.lang.toLowerCase().includes(normalizedLang) || v.name.toLowerCase().includes(normalizedLang));
                  }
              }
              
              if (preferredVoice) {
                  globalUtterance.voice = preferredVoice;
              }
              
              globalUtterance.onend = () => updateGlobalState(false);
              globalUtterance.onerror = () => updateGlobalState(false);
              speechAPI.speak(globalUtterance);
              updateGlobalState(true);
          };
          
          // If voices aren't loaded yet, poll for them (up to 3 seconds)
          if (voices.length === 0) {
              let attempts = 0;
              const checkVoices = setInterval(() => {
                  voices = speechAPI.getVoices();
                  if (voices.length > 0 || attempts > 30) {
                      clearInterval(checkVoices);
                      executeSpeak();
                  }
                  attempts++;
              }, 100);
          } else {
              executeSpeak();
          }
      };
      
      speakWhenReady();`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
