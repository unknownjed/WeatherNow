const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const startIdx = code.indexOf('const toggleSpeaking = () => {');
const endIdx = code.indexOf('  const [showPopup, setShowPopup] = useState(false);', startIdx);

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
      if (language === 'ko') script = \`안녕하세요! \${locationName}의 WeatherNow 업데이트에 오신 것을 환영합니다! 현재 날씨는 \${description}이고, 기온은 \${Math.round(temperature)}도입니다! 바람과 습도를 고려하면 체감 온도는 \${Math.round(feelsLike)}도입니다.\`;
      if (language === 'ru') script = \`Привет! Добро пожаловать в прогноз WeatherNow для \${locationName}! Сейчас у нас \${description.toLowerCase()}, текущая температура \${Math.round(temperature)} градусов! С учетом ветра и влажности ощущается как \${Math.round(feelsLike)} градусов.\`;
      if (language === 'ar') script = \`مرحباً! مرحباً بك في تحديث WeatherNow لـ \${locationName}! في الوقت الحالي، لدينا ظروف \${description.toLowerCase()}، مع درجة حرارة حالية تبلغ \${Math.round(temperature)} درجة! بالنظر إلى الرياح والرطوبة، يبدو الأمر وكأنه \${Math.round(feelsLike)} درجة.\`;

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
      } else if (language === 'ko') {
         script += \` 습도는 \${humidity}%이고, 풍속은 \${Math.round(windSpeed)}입니다.\`;
         if (high !== undefined && low !== undefined) script += \` 오늘 남은 시간 동안 최고 기온은 \${Math.round(high)}도, 최저 기온은 \${Math.round(low)}도로 예상됩니다.\`;
      } else if (language === 'ru') {
         script += \` Влажность составляет \${humidity} процентов, скорость ветра \${Math.round(windSpeed)}.\`;
         if (high !== undefined && low !== undefined) script += \` На оставшуюся часть дня ожидается максимум \${Math.round(high)} и минимум \${Math.round(low)}.\`;
      } else if (language === 'ar') {
         script += \` تبلغ نسبة الرطوبة \${humidity} بالمائة، وسرعة الرياح \${Math.round(windSpeed)}.\`;
         if (high !== undefined && low !== undefined) script += \` بالنسبة لبقية اليوم، نتوقع أن تصل درجة الحرارة العظمى إلى \${Math.round(high)} والصغرى إلى \${Math.round(low)}.\`;
      } else {
        script += \` The relative humidity is sitting at \${humidity} percent, and we've got wind speeds of \${Math.round(windSpeed)}.\`;
        if (high !== undefined && low !== undefined) {
          script += \` For the rest of today, we're forecasting a high of \${Math.round(high)} degrees and a low of \${Math.round(low)}.\`;
        }
      }

      const prep = getPreparations(currentCode, windSpeed, locationName, temperature, humidity, tempUnit, language);
      if (prep) {
        script += ' ' + prep;
      }

      if (tomorrowHigh !== undefined && tomorrowLow !== undefined && tomorrowCode !== undefined && tomorrowCode !== null) {
        const tomorrowDesc = (language === 'es') ? 'similares' : (language === 'fr') ? 'similaires' : (language === 'zh') ? '相似的' : (language === 'ja') ? '同様の' : (language === 'de') ? 'ähnliche' : (language === 'ko') ? '비슷한' : (language === 'ru') ? 'похожие' : (language === 'ar') ? 'مماثلة' : 'similar';
        if (language === 'es') script += \` Para mañana, se esperan condiciones \${tomorrowDesc}, con una máxima de \${Math.round(tomorrowHigh)} y una mínima de \${Math.round(tomorrowLow)}.\`;
        else if (language === 'fr') script += \` En ce qui concerne demain, attendez-vous à des conditions \${tomorrowDesc}, avec un maximum de \${Math.round(tomorrowHigh)} et un minimum de \${Math.round(tomorrowLow)}.\`;
        else if (language === 'ja') script += \` 明日は、最高気温\${Math.round(tomorrowHigh)}度、最低気温\${Math.round(tomorrowLow)}度で、\${tomorrowDesc}天気が続く見込みです。\`;
        else if (language === 'zh') script += \` 展望明天，预计天气\${tomorrowDesc}，最高气温 \${Math.round(tomorrowHigh)} 度，最低气温 \${Math.round(tomorrowLow)} 度。\`;
        else if (language === 'de') script += \` Mit Blick auf morgen erwarten wir \${tomorrowDesc} Bedingungen, mit Höchstwerten von \${Math.round(tomorrowHigh)} und Tiefstwerten von \${Math.round(tomorrowLow)}.\`;
        else if (language === 'ko') script += \` 내일은 최고 기온 \${Math.round(tomorrowHigh)}도, 최저 기온 \${Math.round(tomorrowLow)}도의 \${tomorrowDesc} 날씨가 예상됩니다.\`;
        else if (language === 'ru') script += \` Завтра ожидаются \${tomorrowDesc} условия, с максимумом \${Math.round(tomorrowHigh)} и минимумом \${Math.round(tomorrowLow)}.\`;
        else if (language === 'ar') script += \` بالنظر إلى الغد، توقع ظروفاً \${tomorrowDesc}، مع بلوغ درجة الحرارة العظمى \${Math.round(tomorrowHigh)} والصغرى \${Math.round(tomorrowLow)}.\`;
        else script += \` Looking ahead to tomorrow, expect \${tomorrowDesc} conditions, with a high of \${Math.round(tomorrowHigh)} and a low of \${Math.round(tomorrowLow)}.\`;
      }
      
      if (language === 'zh') script += \` 祝您度过美好的一天！\`;
      else if (language === 'de') script += \` Haben Sie einen absolut fantastischen Tag!\`;
      else if (language === 'es') script += \` ¡Que tengas un día absolutamente fantástico!\`;
      else if (language === 'ja') script += \` 素晴らしい一日をお過ごしください！\`;
      else if (language === 'fr') script += \` Passez une journée absolument fantastique !\`;
      else if (language === 'ko') script += \` 정말 환상적인 하루 보내세요!\`;
      else if (language === 'ru') script += \` Желаем вам абсолютно фантастического дня!\`;
      else if (language === 'ar') script += \` أتمنى لك يومًا رائعًا للغاية!\`;
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
      } else if (language === 'zh') {
          globalUtterance.lang = 'zh-CN';
          preferredVoice = voices.find(v => v.lang.includes('zh-'));
      } else if (language === 'de') {
          globalUtterance.lang = 'de-DE';
          preferredVoice = voices.find(v => v.lang.includes('de-'));
      } else if (language === 'ko') {
          globalUtterance.lang = 'ko-KR';
          preferredVoice = voices.find(v => v.lang.includes('ko-'));
      } else if (language === 'ru') {
          globalUtterance.lang = 'ru-RU';
          preferredVoice = voices.find(v => v.lang.includes('ru-'));
      } else if (language === 'ar') {
          globalUtterance.lang = 'ar-SA';
          preferredVoice = voices.find(v => v.lang.includes('ar-'));
      } else {
          globalUtterance.lang = 'en-US';
          preferredVoice = voices.find(v => v.lang.includes('en-') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen') || v.name.includes('Google UK English Female') || v.name.includes('Google US English')));
      }

      if (preferredVoice) {
        globalUtterance.voice = preferredVoice;
      }
      globalUtterance.onend = () => updateGlobalState(false);
      globalUtterance.onerror = () => updateGlobalState(false);
      speechAPI.speak(globalUtterance);
      updateGlobalState(true);
    }
  };

`;

code = code.slice(0, startIdx) + newToggleSpeaking + code.slice(endIdx);

fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
