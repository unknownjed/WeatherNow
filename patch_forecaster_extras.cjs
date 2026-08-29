const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const oldPrepBlock = /if \(language === 'fr'\) \{[\s\S]*?return "Des conditions douces, habillez-vous confortablement\.";\n\s*\}/;

const newPrepBlock = `if (language === 'fr') {
    if (wind >= 74) return "ALERTE ROUGE ! Vents extrêmes. Mettez-vous à l'abri !";
    if (wind >= 40 && isHeavyRain) return "Avertissement : Vents violents et fortes pluies.";
    if (code >= 51 && code <= 67) return "Pluie prévue, n'oubliez pas votre parapluie.";
    if (code >= 71 && code <= 86) return "Neige prévue, couvrez-vous bien.";
    if (code >= 95 && code <= 99) return "Orages attendus, restez à l'intérieur.";
    if (code <= 2) return isHot ? "Ciel dégagé mais très chaud. Hydratez-vous." : "Ciel dégagé, parfait pour sortir.";
    if (wind > 30) return "Il y a beaucoup de vent, soyez prudent.";
    return "Des conditions douces, habillez-vous confortablement.";
  }
  
  if (language === 'ko') {
    if (wind >= 74) return "적색 경보! 극한의 풍속이 감지되었습니다. 즉시 대피하세요!";
    if (wind >= 40 && isHeavyRain) return "경고: 강풍과 폭우가 예상됩니다. 실내에 머무르세요.";
    if (code >= 51 && code <= 67) return "비가 예상되니 우산을 잊지 마세요.";
    if (code >= 71 && code <= 86) return "눈이 예상되니 따뜻하게 입으세요.";
    if (code >= 95 && code <= 99) return "뇌우가 예상되니 실내에 머무르세요.";
    if (code <= 2) return isHot ? "맑고 매우 덥습니다. 수분을 유지하세요." : "맑은 날씨, 외출하기 좋습니다.";
    if (wind > 30) return "바람이 꽤 붑니다. 조심하세요.";
    return "온화한 조건입니다. 편안하게 입으세요.";
  }
  
  if (language === 'ru') {
    if (wind >= 74) return "КРАСНАЯ ТРЕВОГА! Экстремальный ветер. Немедленно найдите укрытие!";
    if (wind >= 40 && isHeavyRain) return "Предупреждение: Сильный ветер и проливной дождь. Оставайтесь в помещении.";
    if (code >= 51 && code <= 67) return "Ожидается дождь, не забудьте зонт.";
    if (code >= 71 && code <= 86) return "Ожидается снег, одевайтесь теплее.";
    if (code >= 95 && code <= 99) return "Ожидаются грозы, оставайтесь в помещении.";
    if (code <= 2) return isHot ? "Ясно, но очень жарко. Пейте больше воды." : "Ясный день, отлично подходит для прогулки.";
    if (wind > 30) return "Довольно ветрено, будьте осторожны.";
    return "Мягкие условия, одевайтесь комфортно.";
  }
  
  if (language === 'ar') {
    if (wind >= 74) return "تنبيه أحمر! رياح شديدة. ابحث عن مأوى على الفور!";
    if (wind >= 40 && isHeavyRain) return "تحذير: رياح قوية وأمطار غزيرة. ابق في الداخل.";
    if (code >= 51 && code <= 67) return "من المتوقع هطول أمطار، لا تنس مظلتك.";
    if (code >= 71 && code <= 86) return "من المتوقع تساقط الثلوج، ارتدي ملابس دافئة.";
    if (code >= 95 && code <= 99) return "من المتوقع حدوث عواصف رعدية، ابق في الداخل.";
    if (code <= 2) return isHot ? "سماء صافية ولكن الجو حار جدًا. حافظ على رطوبتك." : "يوم صافٍ، مثالي للخروج.";
    if (wind > 30) return "عاصف جدا، كن حذرا.";
    return "ظروف معتدلة، ارتدي ملابس مريحة.";
  }`;

code = code.replace(oldPrepBlock, newPrepBlock);


// Toggle speaking script translations
const oldToggleScript = /if \(language === 'fr'\) script = `Bonjour ! Bienvenue dans votre mise à jour WeatherNow pour \$\{locationName\} ! En ce moment, nous avons des conditions de \$\{description\.toLowerCase\(\)\}, avec une température actuelle de \$\{Math\.round\(temperature\)\} degrés ! En tenant compte du vent et de l'humidité, le ressenti est de \$\{Math\.round\(feelsLike\)\} degrés\.`;/;

const newToggleScript = `if (language === 'fr') script = \`Bonjour ! Bienvenue dans votre mise à jour WeatherNow pour \${locationName} ! En ce moment, nous avons des conditions de \${description.toLowerCase()}, avec une température actuelle de \${Math.round(temperature)} degrés ! En tenant compte du vent et de l'humidité, le ressenti est de \${Math.round(feelsLike)} degrés.\`;
      if (language === 'ko') script = \`안녕하세요! \${locationName}의 WeatherNow 업데이트에 오신 것을 환영합니다! 현재 날씨는 \${description}이고, 기온은 \${Math.round(temperature)}도입니다! 바람과 습도를 고려하면 체감 온도는 \${Math.round(feelsLike)}도입니다.\`;
      if (language === 'ru') script = \`Привет! Добро пожаловать в прогноз WeatherNow для \${locationName}! Сейчас у нас \${description.toLowerCase()}, текущая температура \${Math.round(temperature)} градусов! С учетом ветра и влажности ощущается как \${Math.round(feelsLike)} градусов.\`;
      if (language === 'ar') script = \`مرحباً! مرحباً بك في تحديث WeatherNow لـ \${locationName}! في الوقت الحالي، لدينا ظروف \${description.toLowerCase()}، مع درجة حرارة حالية تبلغ \${Math.round(temperature)} درجة! بالنظر إلى الرياح والرطوبة، يبدو الأمر وكأنه \${Math.round(feelsLike)} درجة.\`;`;

code = code.replace(oldToggleScript, newToggleScript);


const oldHumidityScript = /\} else if \(language === 'fr'\) \{[\s\S]*?\}\n\s*\}\n\s*else \{/;

const newHumidityScript = `} else if (language === 'fr') {
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
      } else {`;

code = code.replace(oldHumidityScript, newHumidityScript);

const oldSuffixScript = /else if \(language === 'fr'\) script \+= ` Passez une journée absolument fantastique !`;/;

const newSuffixScript = `else if (language === 'fr') script += \` Passez une journée absolument fantastique !\`;
      else if (language === 'ko') script += \` 정말 환상적인 하루 보내세요!\`;
      else if (language === 'ru') script += \` Желаем вам абсолютно фантастического дня!\`;
      else if (language === 'ar') script += \` أتمنى لك يومًا رائعًا للغاية!\`;`;

code = code.replace(oldSuffixScript, newSuffixScript);

// Also patch the preferred voices logic for ar, ko, ru
const oldVoiceLogic = /else if \(language === 'de'\) \{[\s\S]*?preferredVoice = voices\.find\(v => v\.lang\.includes\('de-'\)\);\n\s*\}/;

const newVoiceLogic = `else if (language === 'de') {
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
      }`;

code = code.replace(oldVoiceLogic, newVoiceLogic);

fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
