const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const oldCode = `      if (voices.length === 0) {
          speechAPI.onvoiceschanged = () => {
              setVoice();
          };
      } else {
          setVoice();
      }`;

const newCode = `      const trySpeak = (retries = 0) => {
          setVoice();
          
          if (!globalUtterance.voice && retries < 10) {
             // If we couldn't find a matching voice, maybe they are still loading
             setTimeout(() => trySpeak(retries + 1), 100);
             return;
          }
          
          globalUtterance.onend = () => updateGlobalState(false);
          globalUtterance.onerror = () => updateGlobalState(false);
          speechAPI.speak(globalUtterance);
          updateGlobalState(true);
      };
      
      trySpeak();`;

code = code.replace(oldCode, newCode);

// We need to make sure we don't call speak inside setVoice anymore
code = code.replace(`          globalUtterance.onend = () => updateGlobalState(false);
          globalUtterance.onerror = () => updateGlobalState(false);
          speechAPI.speak(globalUtterance);
          updateGlobalState(true);`, "");

fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
