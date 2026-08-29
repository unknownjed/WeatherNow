const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const oldGreeting = `      if (language === 'zh') script = \`你好！欢迎收听 \${locationName} 的 WeatherNow 天气播报！目前天气是 \${description}，当前气温为 \${Math.round(temperature)} 度！综合风速和湿度，体感温度约为 \${Math.round(feelsLike)} 度。\`;`;
const newGreeting = `      if (language === 'zh') script = \`你好！欢迎收听 \${locationName} 的 WeatherNow 天气播报！目前天气是 \${description}，当前气温为 \${Math.round(temperature)} 度！综合风速和湿度，体感温度约为 \${Math.round(feelsLike)} 度。\`;
      if (language === 'it') script = \`Ciao! Benvenuti all'aggiornamento WeatherNow per \${locationName}! In questo momento ci sono condizioni di \${description.toLowerCase()}, con una temperatura di \${Math.round(temperature)} gradi! Considerando vento e umidità, la temperatura percepita è di \${Math.round(feelsLike)} gradi.\`;
      if (language === 'pt') script = \`Olá! Bem-vindo à sua atualização WeatherNow para \${locationName}! No momento, temos condições de \${description.toLowerCase()}, com temperatura atual de \${Math.round(temperature)} graus! Considerando o vento e a umidade, a sensação térmica é de \${Math.round(feelsLike)} graus.\`;
      if (language === 'hi') script = \`नमस्ते! \${locationName} के लिए WeatherNow अपडेट में आपका स्वागत है! अभी \${description.toLowerCase()} है, और तापमान \${Math.round(temperature)} डिग्री है! हवा और उमस को देखते हुए, यह \${Math.round(feelsLike)} डिग्री जैसा महसूस होता है।\`;`;
code = code.replace(oldGreeting, newGreeting);

const oldStats = `      } else if (language === 'ja') {
         script += \` 湿度は\${humidity}％で、風速は\${Math.round(windSpeed)}です。\`;`;
const newStats = `      } else if (language === 'it') {
         script += \` L'umidità è al \${humidity} percento e abbiamo venti a \${Math.round(windSpeed)}.\`;
         if (high !== undefined && low !== undefined) script += \` Per il resto della giornata, prevediamo massime di \${Math.round(high)} e minime di \${Math.round(low)}.\`;
      } else if (language === 'pt') {
         script += \` A umidade é de \${humidity} por cento e temos ventos de \${Math.round(windSpeed)}.\`;
         if (high !== undefined && low !== undefined) script += \` Para o resto de hoje, prevemos máxima de \${Math.round(high)} e mínima de \${Math.round(low)}.\`;
      } else if (language === 'hi') {
         script += \` आर्द्रता \${humidity} प्रतिशत है, और हवा की गति \${Math.round(windSpeed)} है।\`;
         if (high !== undefined && low !== undefined) script += \` आज के लिए अधिकतम \${Math.round(high)} और न्यूनतम \${Math.round(low)} रहने का अनुमान है।\`;
      } else if (language === 'ja') {
         script += \` 湿度は\${humidity}％で、風速は\${Math.round(windSpeed)}です。\`;`;
code = code.replace(oldStats, newStats);

const oldTomorrow = `        else if (language === 'ar') script += \` بالنظر إلى الغد، توقع ظروفاً \${tomorrowDesc}، مع بلوغ درجة الحرارة العظمى \${Math.round(tomorrowHigh)} والصغرى \${Math.round(tomorrowLow)}.\`;
        else script += \` Looking ahead to tomorrow, expect \${tomorrowDesc} conditions, with a high of \${Math.round(tomorrowHigh)} and a low of \${Math.round(tomorrowLow)}.\`;`;
const newTomorrow = `        else if (language === 'ar') script += \` بالنظر إلى الغد، توقع ظروفاً \${tomorrowDesc}، مع بلوغ درجة الحرارة العظمى \${Math.round(tomorrowHigh)} والصغرى \${Math.round(tomorrowLow)}.\`;
        else if (language === 'it') script += \` Guardando a domani, aspettatevi \${tomorrowDesc}, con una massima di \${Math.round(tomorrowHigh)} e una minima di \${Math.round(tomorrowLow)}.\`;
        else if (language === 'pt') script += \` Para amanhã, espere condições de \${tomorrowDesc}, com máxima de \${Math.round(tomorrowHigh)} e mínima de \${Math.round(tomorrowLow)}.\`;
        else if (language === 'hi') script += \` कल के लिए, \${tomorrowDesc} की उम्मीद है, अधिकतम \${Math.round(tomorrowHigh)} और न्यूनतम \${Math.round(tomorrowLow)} के साथ।\`;
        else script += \` Looking ahead to tomorrow, expect \${tomorrowDesc} conditions, with a high of \${Math.round(tomorrowHigh)} and a low of \${Math.round(tomorrowLow)}.\`;`;
code = code.replace(oldTomorrow, newTomorrow);

const oldBye = `      else if (language === 'ar') script += \` أتمنى لك يومًا رائعًا للغاية!\`;
      else script += \` Have an absolutely fantastic day ahead!\`;`;
const newBye = `      else if (language === 'ar') script += \` أتمنى لك يومًا رائعًا للغاية!\`;
      else if (language === 'it') script += \` Ti auguro una giornata assolutamente fantastica!\`;
      else if (language === 'pt') script += \` Tenha um dia absolutamente fantástico!\`;
      else if (language === 'hi') script += \` आपका दिन बहुत शानदार हो!\`;
      else script += \` Have an absolutely fantastic day ahead!\`;`;
code = code.replace(oldBye, newBye);

const oldLangMap = `                  const langMap: Record<string, string> = {
                      es: 'es-ES', fr: 'fr-FR', ja: 'ja-JP', zh: 'zh-CN', de: 'de-DE', ko: 'ko-KR', ru: 'ru-RU', ar: 'ar-SA'
                  };`;
const newLangMap = `                  const langMap: Record<string, string> = {
                      es: 'es-ES', fr: 'fr-FR', ja: 'ja-JP', zh: 'zh-CN', de: 'de-DE', ko: 'ko-KR', ru: 'ru-RU', ar: 'ar-SA', it: 'it-IT', pt: 'pt-BR', hi: 'hi-IN'
                  };`;
code = code.replace(oldLangMap, newLangMap);

fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
