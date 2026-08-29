const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

// The language match for voices is currently `v.lang.includes('ja-')`. Let's use `v.lang.startsWith('ja')` or similar.
const regex = /let preferredVoice;[\s\S]*?if \(preferredVoice\) \{/m;

const newCode = `
      // Ensure voices are loaded (Chrome sometimes needs this)
      let voices = speechAPI.getVoices();
      
      const setVoice = () => {
          voices = speechAPI.getVoices();
          let preferredVoice;
          const langPrefix = language === 'zh' ? 'zh' : language; // etc
          
          if (language === 'en') {
              globalUtterance.lang = 'en-US';
              preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Google UK English Female')));
          } else {
              const langMap: Record<string, string> = {
                  es: 'es-ES',
                  fr: 'fr-FR',
                  ja: 'ja-JP',
                  zh: 'zh-CN',
                  de: 'de-DE',
                  ko: 'ko-KR',
                  ru: 'ru-RU',
                  ar: 'ar-SA'
              };
              globalUtterance.lang = langMap[language] || 'en-US';
              preferredVoice = voices.find(v => v.lang.startsWith(language));
          }
          
          if (!preferredVoice) {
              // Fallback: just try to find by lang
              preferredVoice = voices.find(v => v.lang.includes(language));
          }

          if (preferredVoice) {
              globalUtterance.voice = preferredVoice;
          }
          
          globalUtterance.onend = () => updateGlobalState(false);
          globalUtterance.onerror = () => updateGlobalState(false);
          speechAPI.speak(globalUtterance);
          updateGlobalState(true);
      };
      
      if (voices.length === 0) {
          speechAPI.onvoiceschanged = () => {
              setVoice();
          };
      } else {
          setVoice();
      }
    }
  };
`;

code = code.replace(/const voices = speechAPI\.getVoices\(\);[\s\S]*?updateGlobalState\(true\);\n    \}/, newCode.trim());

fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
