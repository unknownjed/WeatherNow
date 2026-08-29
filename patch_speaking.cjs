const fs = require('fs');

let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const oldToggleSpeakingPattern = /const toggleSpeaking = \(\) => \{[\s\S]*?const prep = getPreparations\(currentCode, windSpeed, locationName, temperature, humidity, tempUnit, language\);/m;

const newToggleSpeaking = `const toggleSpeaking = () => {
    if (!speechAPI) return;

    if (isGloballyPlaying) {
      speechAPI.cancel();
      updateGlobalState(false);
    } else {
      
      let script = \`Hey there! Welcome to your WeatherNow update for \${locationName}! Right now, we are looking at \${description.toLowerCase()} conditions, with a current temperature of \${Math.round(temperature)} degrees! Factoring in the wind and humidity, it actually feels like \${Math.round(feelsLike)} degrees.\`;
      
      if (language === 'zh') script = \`你好！欢迎收听 \${locationName} 的 WeatherNow 天气播报！目前天气是 \${description}，当前气温为 \${Math.round(temperature)} 度！综合风速和湿度，体感温度约为 \${Math.round(feelsLike)} 度。\`;
      if (language === 'de') script = \`Hallo! Willkommen bei Ihrem WeatherNow-Update für \${locationName}! Im Moment haben wir \${description.toLowerCase()} bei einer aktuellen Temperatur von \${Math.round(temperature)} Grad! Unter Berücksichtigung von Wind und Luftfeuchtigkeit fühlt es sich an wie \${Math.round(feelsLike)} Grad.\`;
      if (language === 'es') script = \`¡Hola! ¡Bienvenido a tu actualización de WeatherNow para \${locationName}! En este momento, tenemos \${description.toLowerCase()}, con una temperatura actual de \${Math.round(temperature)} grados. Considerando el viento y la humedad, la sensación térmica es de \${Math.round(feelsLike)} grados.\`;
      if (language === 'ja') script = \`こんにちは！\${locationName}のWeatherNowアップデートへようこそ！現在の天気は\${description}で、気温は\${Math.round(temperature)}度です。風と湿度を考慮すると、体感温度は\${Math.round(feelsLike)}度になります。\`;
      if (language === 'fr') script = \`Bonjour ! Bienvenue dans votre mise à jour WeatherNow pour \${locationName} ! En ce moment, nous avons des conditions de \${description.toLowerCase()}, avec une température actuelle de \${Math.round(temperature)} degrés ! En tenant compte du vent et de l'humidité, le ressenti est de \${Math.round(feelsLike)} degrés.\`;

      if (language === 'zh') {
         script += \` 相对湿度为 \${humidity}%，风速为 \${Math.round(windSpeed)}。\`;
         if (high !== undefined && low !== undefined) script += \` 预计今天剩余时间最高气温 \${Math.round(high)} 度，最低气温 \${Math.round(low)} 度。\`;
      } else if (language === 'de') {
         script += \` Die Luftfeuchtigkeit liegt bei \${humidity} Prozent und wir haben Windgeschwindigkeiten von \${Math.round(windSpeed)}.\`;
         if (high !== undefined && low !== undefined) script += \` Für den Rest des Tages erwarten wir Höchstwerte von \${Math.round(high)} und Tiefstwerte von \${Math.round(low)}.\`;
      } else if (language === 'es') {
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

      const prep = getPreparations(currentCode, windSpeed, locationName, temperature, humidity, tempUnit, language);`;

code = code.replace(oldToggleSpeakingPattern, newToggleSpeaking);

const oldSuffixPattern = /if \(language === 'es'\) script \+= \` ¡Que tengas un día absolutamente fantástico!\`;[\s\S]*?else script \+= \` Have an absolutely fantastic day ahead!\`;/m;

const newSuffix = `if (language === 'zh') script += \` 祝您度过美好的一天！\`;
      else if (language === 'de') script += \` Haben Sie einen absolut fantastischen Tag!\`;
      else if (language === 'es') script += \` ¡Que tengas un día absolutamente fantástico!\`;
      else if (language === 'ja') script += \` 素晴らしい一日をお過ごしください！\`;
      else if (language === 'fr') script += \` Passez une journée absolument fantastique !\`;
      else script += \` Have an absolutely fantastic day ahead!\`;`;

code = code.replace(oldSuffixPattern, newSuffix);

fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
