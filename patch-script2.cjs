const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const ttsReplace = `
      let script = \`Hey there! Welcome to your WeatherNow update for \${locationName}! Right now, we are looking at \${description.toLowerCase()} conditions, with a current temperature of \${Math.round(temperature)} degrees! Factoring in the wind and humidity, it actually feels like \${Math.round(feelsLike)} degrees.\`;
      if (language === 'es') script = \`¡Hola! ¡Bienvenido a tu actualización de WeatherNow para \${locationName}! En este momento, tenemos \${description.toLowerCase()}, con una temperatura actual de \${Math.round(temperature)} grados. Considerando el viento y la humedad, la sensación térmica es de \${Math.round(feelsLike)} grados.\`;
      if (language === 'ja') script = \`こんにちは！\${locationName}のWeatherNowアップデートへようこそ！現在の天気は\${description}で、気温は\${Math.round(temperature)}度です。風と湿度を考慮すると、体感温度は\${Math.round(feelsLike)}度になります。\`;
      if (language === 'fr') script = \`Bonjour ! Bienvenue dans votre mise à jour WeatherNow pour \${locationName} ! En ce moment, nous avons des conditions de \${description.toLowerCase()}, avec une température actuelle de \${Math.round(temperature)} degrés ! En tenant compte du vent et de l'humidité, le ressenti est de \${Math.round(feelsLike)} degrés.\`;

      if (language === 'es') {
         script += \` La humedad es del \${humidity} por ciento, y tenemos velocidades del viento de \${Math.round(windSpeed)}.\`;
         if (high !== undefined && low !== undefined) script += \` Para el resto de hoy, pronosticamos una máxima de \${Math.round(high)} y una mínima de \${Math.round(low)}.\`;
      } else if (language === 'ja') {
         script += \` 湿度は\${humidity}％で、風速は\${Math.round(windSpeed)}です。\`;
         if (high !== undefined && low !== undefined) script += \` 今日の残りの時間は、最高気温\${Math.round(high)}度、最低気温\${Math.round(low)}度と予想されています。\`;
      } else if (language === 'fr') {
         script += \` L'humidité est de \${humidity} pour cent, et nous avons des vents de \${Math.round(windSpeed)}.\`;
         if (high !== undefined && low !== undefined) script += \` Pour le reste de la journée, nous prévoyons un maximum de \${Math.round(high)} et un minimum de \${Math.round(low)}.\`;
      } else {
        script += \` The relative humidity is sitting at \${humidity} percent, and we've got wind speeds of \${Math.round(windSpeed)}.\`;
        if (high !== undefined && low !== undefined) {
          script += \` For the rest of today, we're forecasting a high of \${Math.round(high)} degrees and a low of \${Math.round(low)}.\`;
        }
      }

      const prep = getPreparations(currentCode, windSpeed, locationName, temperature, humidity, tempUnit, language);
      if (prep) {
        script += \` \${prep}\`;
      }

      if (tomorrowHigh !== undefined && tomorrowLow !== undefined && tomorrowCode !== undefined) {
        const tomorrowDesc = getWeatherDescription(tomorrowCode).text.toLowerCase();
        if (language === 'es') script += \` Mirando hacia mañana, esperamos condiciones de \${tomorrowDesc}, con una máxima de \${Math.round(tomorrowHigh)} y una mínima de \${Math.round(tomorrowLow)}.\`;
        else if (language === 'ja') script += \` 明日については、\${tomorrowDesc}の条件が予想され、最高気温は\${Math.round(tomorrowHigh)}度、最低気温は\${Math.round(tomorrowLow)}度です。\`;
        else if (language === 'fr') script += \` En regardant vers demain, attendez-vous à des conditions de \${tomorrowDesc}, avec un maximum de \${Math.round(tomorrowHigh)} et un minimum de \${Math.round(tomorrowLow)}.\`;
        else script += \` Looking ahead to tomorrow, expect \${tomorrowDesc} conditions, with a high of \${Math.round(tomorrowHigh)} and a low of \${Math.round(tomorrowLow)}.\`;
      }
      
      if (language === 'es') script += \` ¡Que tengas un día absolutamente fantástico!\`;
      else if (language === 'ja') script += \` 素晴らしい一日をお過ごしください！\`;
      else if (language === 'fr') script += \` Passez une journée absolument fantastique !\`;
      else script += \` Have an absolutely fantastic day ahead!\`;

      globalUtterance = new SpeechSynthesisUtterance(script);
      globalUtterance.rate = 1.15;
      globalUtterance.pitch = 1.25;

      const voices = speechAPI.getVoices();
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
      } else {
          preferredVoice = voices.find(v => v.lang.includes('en-') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen') || v.name.includes('Google UK English Female') || v.name.includes('Google US English')));
      }

      if (preferredVoice) {
        globalUtterance.voice = preferredVoice;
      }
      globalUtterance.onend = () => updateGlobalState(false);
      globalUtterance.onerror = () => updateGlobalState(false);
      speechAPI.speak(globalUtterance);
      updateGlobalState(true);
`;

const startIndex = code.indexOf('// Create an energetic news-anchor style script');
const endIndex = code.indexOf('updateGlobalState(true);\n    }');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + ttsReplace + "\n" + code.substring(endIndex);
  fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
  console.log("Successfully replaced script generation.");
} else {
  console.log("Could not find start/end indices.");
}

