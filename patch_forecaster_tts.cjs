const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const regex = /const executeSpeak = \(\) => \{[\s\S]*?updateGlobalState\(true\);\n          \};/;

const newCode = `const executeSpeak = () => {
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
                  
                  // Ultimate fallback: match string anywhere in lang or name
                  if (!preferredVoice) {
                      preferredVoice = voices.find(v => v.lang.toLowerCase().includes(normalizedLang) || v.name.toLowerCase().includes(normalizedLang));
                  }
              }
              
              if (preferredVoice) {
                  globalUtterance.voice = preferredVoice;
              } else if (language !== 'en' && voices.length > 0) {
                  // If we are in a foreign language and ABSOLUTELY NO matching voice is found,
                  // speaking it with an English voice will result in just numbers being read out.
                  // It is better to abort to prevent a broken experience.
                  console.warn("No native voice found for " + language + ", aborting speech to prevent number-only reading.");
                  updateGlobalState(false);
                  return;
              }
              
              globalUtterance.onend = () => updateGlobalState(false);
              globalUtterance.onerror = () => updateGlobalState(false);
              speechAPI.speak(globalUtterance);
              updateGlobalState(true);
          };`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
