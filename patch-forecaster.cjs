const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

const getPreparationsPattern = /function getPreparations[\s\S]*?export function WeatherForecaster/m;

const getPreparationsReplacement = `
function getPreparations(code: number | undefined, wind: number, locationName: string, temperature: number, humidity: number, tempUnit: 'celsius' | 'fahrenheit' = 'celsius', language: string = 'en'): string {
  if (code === undefined) return "";
  
  const isHot = (tempUnit === 'celsius' && temperature >= 30) || (tempUnit === 'fahrenheit' && temperature >= 86);
  
  if (language === 'es') {
    if (wind >= 74) return "¡ALERTA ROJA! Vientos extremos. ¡Busque refugio!";
    if (wind >= 40) return "Advertencia: Fuertes vientos y lluvia.";
    if (code >= 51 && code <= 67) return "Lluvia pronosticada, no olvide su paraguas.";
    if (code >= 71 && code <= 86) return "Nieve en el pronóstico, abríguese bien.";
    if (code >= 95 && code <= 99) return "Tormentas eléctricas esperadas, manténgase a salvo.";
    if (code <= 2) return isHot ? "Día despejado pero muy caluroso. Manténgase hidratado." : "Día despejado, ideal para gafas de sol.";
    if (wind > 30) return "Bastante viento, tenga cuidado.";
    return "Condiciones templadas, vístase cómodamente.";
  } else if (language === 'ja') {
    if (wind >= 74) return "赤色警報！猛烈な風です。すぐに避難してください！";
    if (wind >= 40) return "警告：強風と大雨です。";
    if (code >= 51 && code <= 67) return "雨の予報です。傘を忘れずに。";
    if (code >= 71 && code <= 86) return "雪の予報です。暖かくしてください。";
    if (code >= 95 && code <= 99) return "雷雨が予想されます。屋内に留まってください。";
    if (code <= 2) return isHot ? "晴れますが猛暑です。水分補給をしてください。" : "晴れのいい天気です。";
    if (wind > 30) return "風が強いので気をつけてください。";
    return "穏やかな天気です。";
  } else if (language === 'fr') {
    if (wind >= 74) return "ALERTE ROUGE ! Vents extrêmes. Mettez-vous à l'abri !";
    if (wind >= 40) return "Avertissement : Vents violents et fortes pluies.";
    if (code >= 51 && code <= 67) return "Pluie prévue, n'oubliez pas votre parapluie.";
    if (code >= 71 && code <= 86) return "Neige prévue, couvrez-vous bien.";
    if (code >= 95 && code <= 99) return "Orages attendus, restez à l'intérieur.";
    if (code <= 2) return isHot ? "Ciel dégagé mais temps très chaud. Hydratez-vous." : "Ciel dégagé, parfait pour les lunettes de soleil.";
    if (wind > 30) return "Il y a beaucoup de vent, soyez prudent.";
    return "Des conditions douces, habillez-vous confortablement.";
  }
  
  // English Default
  if (wind >= 74) return "RED ALERT! Extreme wind speeds. Seek shelter immediately!";
  if (wind >= 40) return "Warning: Heavy rain and strong winds.";
  if (code >= 51 && code <= 67) return "Rain expected, don't forget your umbrella.";
  if (code >= 71 && code <= 86) return "Snow is in the forecast, bundle up.";
  if (code >= 95 && code <= 99) return "Thunderstorms expected, stay indoors.";
  if (code <= 2) return isHot ? "Clear but very hot. Stay hydrated." : "Beautiful clear day, great for sunglasses.";
  if (wind > 30) return "Quite windy out there, be careful.";
  return "Conditions are mild, dress comfortably.";
}

export function WeatherForecaster`;

code = code.replace(getPreparationsPattern, getPreparationsReplacement);


const ttsPattern = /let script = \[.*?script \+= \` Have an absolutely fantastic day ahead!\`;/s;
const generateScript = `
      let script = \`Hello from WeatherNow! Right now in \${locationName}, it's \${Math.round(temperature)} degrees.\`;
      if (language === 'es') script = \`¡Hola desde WeatherNow! En este momento en \${locationName}, hace \${Math.round(temperature)} grados.\`;
      if (language === 'ja') script = \`WeatherNowからのお知らせです！現在の\${locationName}の気温は\${Math.round(temperature)}度です。\`;
      if (language === 'fr') script = \`Bonjour de WeatherNow ! En ce moment à \${locationName}, il fait \${Math.round(temperature)} degrés.\`;

      const prep = getPreparations(currentCode, windSpeed, locationName, temperature, humidity, tempUnit, language);
      if (prep) script += ' ' + prep;
      
      if (language === 'es') script += \` ¡Que tengas un día absolutamente fantástico!\`;
      else if (language === 'ja') script += \` 素晴らしい一日をお過ごしください！\`;
      else if (language === 'fr') script += \` Passez une journée absolument fantastique !\`;
      else script += \` Have an absolutely fantastic day ahead!\`;
`;

// wait, the regex might be tricky. Let's just string replace the `toggleSpeaking` body.
