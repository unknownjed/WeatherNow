import React, { useState, useEffect } from 'react';
import { Podcast, Square } from 'lucide-react';
import { getWeatherDescription } from '../lib/api';

interface WeatherForecasterProps {
  locationName: string;
  temperature: number;
  description: string;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  high?: number;
  low?: number;
  currentCode?: number;
  tomorrowHigh?: number;
  tomorrowLow?: number;
  tomorrowCode?: number;
  hourlyData?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
  tempUnit?: 'celsius' | 'fahrenheit';
  autoSpeak?: boolean;
  language?: string;
}

// Global state to keep track of speech across tab switching (component unmounts)
let isGloballyPlaying = false;
let hasAutoPlayed = false;
let globalUtterance: SpeechSynthesisUtterance | null = null;
let speechRequestVersion = 0;
const stateListeners = new Set<(playing: boolean) => void>();

const updateGlobalState = (playing: boolean) => {
  isGloballyPlaying = playing;
  stateListeners.forEach(listener => listener(playing));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('weathernow:forecaster-state', { detail: { speaking: playing } }));
  }
};

function getPreparations(code: number | undefined, wind: number, locationName: string, temperature: number, humidity: number, tempUnit: 'celsius' | 'fahrenheit' = 'celsius', language: string = 'en'): string {
  if (code === undefined) return "";
  
  const lowerLocation = locationName.toLowerCase();
  const isTyphoonRegion = lowerLocation.includes('philippines') || lowerLocation.includes('japan') || lowerLocation.includes('taiwan') || lowerLocation.includes('china') || lowerLocation.includes('korea') || lowerLocation.includes('vietnam') || lowerLocation.includes('hong kong');
  const isMonsoonRegion = lowerLocation.includes('india') || lowerLocation.includes('bangladesh') || lowerLocation.includes('thailand') || lowerLocation.includes('myanmar') || lowerLocation.includes('pakistan') || lowerLocation.includes('nepal') || lowerLocation.includes('indonesia') || lowerLocation.includes('malaysia') || lowerLocation.includes('philippines');

  const isHeavyRain = [61, 63, 65, 67, 80, 81, 82, 95, 96, 99].includes(code);
  const isHot = (tempUnit === 'celsius' && temperature >= 30) || (tempUnit === 'fahrenheit' && temperature >= 86);

  if (language === 'it') {
    if (wind >= 74) return "Allarme rosso! Abbiamo rilevato venti estremi, trovate subito riparo!";
    if (isHeavyRain && isMonsoonRegion) return "Attenzione: forti piogge in corso, state attenti alle inondazioni.";
    if (wind >= 40 && isHeavyRain) return "Attenzione: forti venti e forti piogge. Rimanete al chiuso se possibile.";
    if (code >= 51 && code <= 67) return "Sembra che ci sia pioggia, non dimenticate l'ombrello.";
    if (code >= 71 && code <= 86) return "Prevista neve, copritevi bene.";
    if (code >= 95 && code <= 99) return "Previsti temporali, rimanete al chiuso.";
    if (code <= 2) {
      if (isHot && humidity >= 60) return "Cielo sereno, ma il calore elevato e l'umidità lo rendono opprimente.";
      if (isHot) return "Soleggiato, ma fate attenzione ai raggi solari, mantenetevi idratati.";
      return "Cielo sereno, ottimo momento per gli occhiali da sole.";
    }
  }
  if (language === 'pt') {
    if (wind >= 74) return "Alerta vermelho! Detectamos ventos extremos, procure abrigo!";
    if (isHeavyRain && isMonsoonRegion) return "Aviso: chuva forte, cuidado com inundações.";
    if (wind >= 40 && isHeavyRain) return "Aviso: ventos e chuvas fortes. Fique em casa.";
    if (code >= 51 && code <= 67) return "Parece que vai chover, leve um guarda-chuva.";
    if (code >= 71 && code <= 86) return "Previsão de neve, agasalhe-se.";
    if (code >= 95 && code <= 99) return "Previsão de trovoadas, fique em segurança.";
    if (code <= 2) {
      if (isHot && humidity >= 60) return "Céu limpo, mas muito quente e úmido.";
      if (isHot) return "Ensolarado, mantenha-se hidratado e protegido do sol.";
      return "Céu limpo, perfeito para óculos de sol.";
    }
  }
  if (language === 'hi') {
    if (wind >= 74) return "रेड अलर्ट! बहुत तेज़ हवाएँ, तुरंत आश्रय लें!";
    if (isHeavyRain && isMonsoonRegion) return "चेतावनी: भारी बारिश, बाढ़ से सावधान रहें।";
    if (wind >= 40 && isHeavyRain) return "चेतावनी: तेज़ हवाएँ और बारिश। घर के अंदर रहें।";
    if (code >= 51 && code <= 67) return "बारिश हो सकती है, छाता न भूलें।";
    if (code >= 71 && code <= 86) return "बर्फबारी की संभावना है, गर्म कपड़े पहनें।";
    if (code >= 95 && code <= 99) return "गरज के साथ बारिश, सुरक्षित रहें।";
    if (code <= 2) {
      if (isHot && humidity >= 60) return "आसमान साफ है, लेकिन बहुत गर्मी और उमस है।";
      if (isHot) return "धूप है, हाइड्रेटेड रहें।";
      return "आसमान साफ है, धूप का चश्मा लगाएं।";
    }
  }
  if (language === 'zh') {
    if (wind >= 74) return "红色警报！我们检测到极端的风速，请立即寻找避难所并待在室内！";
    if (isHeavyRain && isMonsoonRegion) return "警告：我们正在经历强降雨，请警惕山洪爆发，避免前往积水区域。";
    if (wind >= 40 && isHeavyRain) return "警告：我们观察到强风和暴雨，请尽量呆在室内，避免不必要的外出。";
    if (code >= 51 && code <= 67) return "看样子要下雨了，出门别忘了带伞或雨衣。";
    if (code >= 71 && code <= 86) return "天气预报有雪，请注意保暖。";
    if (code >= 95 && code <= 99) return "预计会有雷暴，建议尽量待在室内。";
    if (code <= 2) {
      if (isHot && humidity >= 60) return "天气晴朗，但高温高湿让人感觉非常闷热，请注意补水防暑。";
      if (isHot) return "天气晴朗，但太阳辐射导致气温飙升，请注意防晒和补水。";
      return "天气晴朗，出门很适合戴太阳镜。";
    }
    if (wind > 30) return "外面风很大，外出请注意安全。";
    return "天气温和，穿着舒适即可。";
  }
  
  if (language === 'de') {
    if (wind >= 74) return "ROTER ALARM! Wir messen extrem hohe Windgeschwindigkeiten. Bitte bleiben Sie drinnen!";
    if (isHeavyRain && isMonsoonRegion) return "Warnung: Wir erleben intensive, schwere Regenfälle. Bitte seien Sie auf der Hut vor Sturzfluten.";
    if (wind >= 40 && isHeavyRain) return "Warnung: Es gibt starken Regen und Sturm. Bitte bleiben Sie drinnen.";
    if (code >= 51 && code <= 67) return "Es scheint zu regnen, vergessen Sie Ihren Regenschirm nicht.";
    if (code >= 71 && code <= 86) return "Schnee ist angesagt, ziehen Sie sich warm an.";
    if (code >= 95 && code <= 99) return "Gewitter werden erwartet, bleiben Sie nach Möglichkeit drinnen.";
    if (code <= 2) {
      if (isHot && humidity >= 60) return "Ein schöner klarer Tag, aber es ist sehr heiß und schwül. Bleiben Sie hydratisiert.";
      if (isHot) return "Ein schöner klarer Tag, aber sehr heiß. Bitte viel trinken und Sonnenschutz verwenden.";
      return "Ein schöner klarer Tag, ideal für eine Sonnenbrille.";
    }
    if (wind > 30) return "Es ist ziemlich windig, seien Sie vorsichtig.";
    return "Die Bedingungen sind mild, ziehen Sie sich bequem an.";
  }

  if (language === 'es') {
    if (wind >= 74) return "¡ALERTA ROJA! Vientos extremos. ¡Busque refugio de inmediato!";
    if (wind >= 40 && isHeavyRain) return "Advertencia: Fuertes vientos y lluvia. Quédese adentro.";
    if (code >= 51 && code <= 67) return "Lluvia pronosticada, no olvide su paraguas.";
    if (code >= 71 && code <= 86) return "Nieve en el pronóstico, abríguese bien.";
    if (code >= 95 && code <= 99) return "Tormentas eléctricas esperadas, manténgase a salvo bajo techo.";
    if (code <= 2) return isHot ? "Día despejado pero muy caluroso. Manténgase hidratado." : "Día despejado, ideal para gafas de sol.";
    if (wind > 30) return "Bastante viento, tenga cuidado al conducir.";
    return "Condiciones templadas, vístase cómodamente.";
  }
  
  if (language === 'ja') {
    if (wind >= 74) return "赤色警報！猛烈な風です。すぐに避難してください！";
    if (wind >= 40 && isHeavyRain) return "警告：強風と大雨です。外出は控えてください。";
    if (code >= 51 && code <= 67) return "雨の予報です。傘を忘れずに。";
    if (code >= 71 && code <= 86) return "雪の予報です。暖かくしてください。";
    if (code >= 95 && code <= 99) return "雷雨が予想されます。屋内に留まってください。";
    if (code <= 2) return isHot ? "晴れますが猛暑です。水分補給をしてください。" : "晴れのいい天気です。";
    if (wind > 30) return "風が強いので気をつけてください。";
    return "穏やかな天気です。";
  }
  
  if (language === 'fr') {
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
  }

  // English Default
  if (wind >= 74) {
    if (isTyphoonRegion) {
      return "RED ALERT! We are detecting extreme wind speeds indicative of a severe Typhoon in your area. Please secure your property, stay indoors away from windows, and listen to local emergency broadcasts immediately!";
    } else {
      return "RED ALERT! We are detecting extreme wind speeds indicative of a Hurricane or severe Cyclone in your area. Please secure your property, stay indoors away from windows, and listen to local emergency broadcasts immediately!";
    }
  } else if (isHeavyRain && isMonsoonRegion) {
    return "Warning: We are experiencing intense, heavy rainfall consistent with active monsoon conditions. Please be on high alert for severe flash flooding and avoid traveling through waterlogged areas.";
  } else if (wind >= 40 && isHeavyRain) {
    return "Warning: We are seeing heavy rain and strong gale-force winds, which could be a severe tropical storm. Please avoid unnecessary travel and stay safe indoors.";
  } else if (code >= 51 && code <= 67) {
    return "It looks like we have some rain, so don't forget your umbrella or raincoat before you head out.";
  } else if (code >= 71 && code <= 86) {
    return "Snow is in the forecast, so make sure to bundle up warmly with a heavy coat, gloves, and a hat.";
  } else if (code >= 95 && code <= 99) {
    return "We have thunderstorms expected, so it is highly recommended to stay indoors if possible and avoid open areas.";
  } else if (code === 0 || code === 1 || code === 2) {
    if (isHot) {
      if (humidity >= 60) {
        return "It is a beautifully clear day, but with these high temperatures and high humidity, the moisture is trapping the heat, making it feel sweltering. Please stay hydrated and try to stay cool indoors.";
      } else {
        return "It is a beautifully clear day, but the direct solar radiation is causing temperatures to soar today. Keep hydrated, apply plenty of sunscreen, and avoid prolonged sun exposure.";
      }
    } else {
      return "It is a beautifully clear day, a great time for sunglasses and perhaps some sunscreen if you'll be outside.";
    }
  } else if (wind > 30) {
    return "It's quite windy out there, so hold onto your hats and be careful driving on open roads.";
  } else {
    return "Conditions are relatively mild, so just dress comfortably for the temperature.";
  }
}

export function WeatherForecaster({ locationName, temperature, description, feelsLike, humidity, windSpeed, high, low, currentCode, tomorrowHigh, tomorrowLow, tomorrowCode, hourlyData, tempUnit = 'celsius', autoSpeak = false, language = 'en' }: WeatherForecasterProps) {
  const [isPlaying, setIsPlaying] = useState(isGloballyPlaying);
  const [showHint, setShowHint] = useState(true);
  const [speechAPI, setSpeechAPI] = useState<SpeechSynthesis | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const synthesis = window.speechSynthesis;
      setSpeechAPI(synthesis);
      const refreshVoices = () => setAvailableVoices(synthesis.getVoices());
      refreshVoices();
      synthesis.addEventListener('voiceschanged', refreshVoices);

      // Several Android/iOS engines populate voices only after an initial read.
      window.setTimeout(refreshVoices, 250);
      window.setTimeout(refreshVoices, 1000);

      // Sync with global state
      setIsPlaying(isGloballyPlaying);
      const listener = (playing: boolean) => setIsPlaying(playing);
      stateListeners.add(listener);

      return () => {
        synthesis.removeEventListener('voiceschanged', refreshVoices);
        stateListeners.delete(listener);
      };
    }

    // Sync with global state
    setIsPlaying(isGloballyPlaying);
    const listener = (playing: boolean) => setIsPlaying(playing);
    stateListeners.add(listener);
    
    return () => {
      stateListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const stopSpeakingForMusic = () => {
      speechRequestVersion += 1;
      globalUtterance = null;
      window.speechSynthesis?.cancel();
      updateGlobalState(false);
    };
    window.addEventListener('weathernow:music-state', stopSpeakingForMusic);
    return () => window.removeEventListener('weathernow:music-state', stopSpeakingForMusic);
  }, []);

  useEffect(() => {
    if (speechAPI && locationName && !hasAutoPlayed) {
      if (autoSpeak) {
        hasAutoPlayed = true;
        // Slight delay to ensure smooth loading and voices availability
        setTimeout(() => {
          if (!isGloballyPlaying) {
            toggleSpeaking();
          }
        }, 1000);
      } else {
        hasAutoPlayed = true; // Mark as played so it doesn't trigger if setting toggled later
      }
    }
  }, [speechAPI, locationName, autoSpeak]);

  const toggleSpeaking = () => {
    if (!speechAPI) return;

    if (isGloballyPlaying) {
      speechAPI.cancel();
      updateGlobalState(false);
    } else {
      const requestVersion = ++speechRequestVersion;
      
      let script = `Hey there! Welcome to your WeatherNow update for ${locationName}! Right now, we are looking at ${description.toLowerCase()} conditions, with a current temperature of ${Math.round(temperature)} degrees! Factoring in the wind and humidity, it actually feels like ${Math.round(feelsLike)} degrees.`;
      
      if (language === 'zh') script = `你好！欢迎收听 ${locationName} 的 WeatherNow 天气播报！目前天气是 ${description}，当前气温为 ${Math.round(temperature)} 度！综合风速和湿度，体感温度约为 ${Math.round(feelsLike)} 度。`;
      if (language === 'it') script = `Ciao! Benvenuti all'aggiornamento WeatherNow per ${locationName}! In questo momento ci sono condizioni di ${description.toLowerCase()}, con una temperatura di ${Math.round(temperature)} gradi! Considerando vento e umidità, la temperatura percepita è di ${Math.round(feelsLike)} gradi.`;
      if (language === 'pt') script = `Olá! Bem-vindo à sua atualização WeatherNow para ${locationName}! No momento, temos condições de ${description.toLowerCase()}, com temperatura atual de ${Math.round(temperature)} graus! Considerando o vento e a umidade, a sensação térmica é de ${Math.round(feelsLike)} graus.`;
      if (language === 'hi') script = `नमस्ते! ${locationName} के लिए WeatherNow अपडेट में आपका स्वागत है! अभी ${description.toLowerCase()} है, और तापमान ${Math.round(temperature)} डिग्री है! हवा और उमस को देखते हुए, यह ${Math.round(feelsLike)} डिग्री जैसा महसूस होता है।`;
      if (language === 'de') script = `Hallo! Willkommen bei Ihrem WeatherNow-Update für ${locationName}! Im Moment haben wir ${description.toLowerCase()} bei einer aktuellen Temperatur von ${Math.round(temperature)} Grad! Unter Berücksichtigung von Wind und Luftfeuchtigkeit fühlt es sich an wie ${Math.round(feelsLike)} Grad.`;
      if (language === 'es') script = `¡Hola! ¡Bienvenido a tu actualización de WeatherNow para ${locationName}! En este momento, tenemos ${description.toLowerCase()}, con una temperatura actual de ${Math.round(temperature)} grados. Considerando el viento y la humedad, la sensación térmica es de ${Math.round(feelsLike)} grados.`;
      if (language === 'ja') script = `こんにちは！${locationName}のWeatherNowアップデートへようこそ！現在の天気は${description}で、気温は${Math.round(temperature)}度です。風と湿度を考慮すると、体感温度は${Math.round(feelsLike)}度になります。`;
      if (language === 'fr') script = `Bonjour ! Bienvenue dans votre mise à jour WeatherNow pour ${locationName} ! En ce moment, nous avons des conditions de ${description.toLowerCase()}, avec une température actuelle de ${Math.round(temperature)} degrés ! En tenant compte du vent et de l'humidité, le ressenti est de ${Math.round(feelsLike)} degrés.`;
      if (language === 'ko') script = `안녕하세요! ${locationName}의 WeatherNow 업데이트에 오신 것을 환영합니다! 현재 날씨는 ${description}이고, 기온은 ${Math.round(temperature)}도입니다! 바람과 습도를 고려하면 체감 온도는 ${Math.round(feelsLike)}도입니다.`;
      if (language === 'ru') script = `Привет! Добро пожаловать в прогноз WeatherNow для ${locationName}! Сейчас у нас ${description.toLowerCase()}, текущая температура ${Math.round(temperature)} градусов! С учетом ветра и влажности ощущается как ${Math.round(feelsLike)} градусов.`;
      if (language === 'ar') script = `مرحباً! مرحباً بك في تحديث WeatherNow لـ ${locationName}! في الوقت الحالي، لدينا ظروف ${description.toLowerCase()}، مع درجة حرارة حالية تبلغ ${Math.round(temperature)} درجة! بالنظر إلى الرياح والرطوبة، يبدو الأمر وكأنه ${Math.round(feelsLike)} درجة.`;

      if (language === 'zh') {
         script += ` 相对湿度为 ${humidity}%，风速为 ${Math.round(windSpeed)}。`;
         if (high !== undefined && low !== undefined) script += ` 预计今天剩余时间最高气温 ${Math.round(high)} 度，最低气温 ${Math.round(low)} 度。`;
      } else if (language === 'de') {
         script += ` Die Luftfeuchtigkeit liegt bei ${humidity} Prozent und wir haben Windgeschwindigkeiten von ${Math.round(windSpeed)}.`;
         if (high !== undefined && low !== undefined) script += ` Für den Rest des Tages erwarten wir Höchstwerte von ${Math.round(high)} und Tiefstwerte von ${Math.round(low)}.`;
      } else if (language === 'es') {
         script += ` La humedad es del ${humidity} por ciento, y tenemos velocidades del viento de ${Math.round(windSpeed)}.`;
         if (high !== undefined && low !== undefined) script += ` Para el resto de hoy, pronosticamos una máxima de ${Math.round(high)} y una mínima de ${Math.round(low)}.`;
      } else if (language === 'it') {
         script += ` L'umidità è al ${humidity} percento e abbiamo venti a ${Math.round(windSpeed)}.`;
         if (high !== undefined && low !== undefined) script += ` Per il resto della giornata, prevediamo massime di ${Math.round(high)} e minime di ${Math.round(low)}.`;
      } else if (language === 'pt') {
         script += ` A umidade é de ${humidity} por cento e temos ventos de ${Math.round(windSpeed)}.`;
         if (high !== undefined && low !== undefined) script += ` Para o resto de hoje, prevemos máxima de ${Math.round(high)} e mínima de ${Math.round(low)}.`;
      } else if (language === 'hi') {
         script += ` आर्द्रता ${humidity} प्रतिशत है, और हवा की गति ${Math.round(windSpeed)} है।`;
         if (high !== undefined && low !== undefined) script += ` आज के लिए अधिकतम ${Math.round(high)} और न्यूनतम ${Math.round(low)} रहने का अनुमान है।`;
      } else if (language === 'ja') {
         script += ` 湿度は${humidity}％で、風速は${Math.round(windSpeed)}です。`;
         if (high !== undefined && low !== undefined) script += ` 今日の残りの時間は、最高気温${Math.round(high)}度、最低気温${Math.round(low)}度と予想されています。`;
      } else if (language === 'fr') {
         script += ` L'humidité est de ${humidity} pour cent, et nous avons des vents de ${Math.round(windSpeed)}.`;
         if (high !== undefined && low !== undefined) script += ` Pour le reste de la journée, nous prévoyons un maximum de ${Math.round(high)} et un minimum de ${Math.round(low)}.`;
      } else if (language === 'ko') {
         script += ` 습도는 ${humidity}%이고, 풍속은 ${Math.round(windSpeed)}입니다.`;
         if (high !== undefined && low !== undefined) script += ` 오늘 남은 시간 동안 최고 기온은 ${Math.round(high)}도, 최저 기온은 ${Math.round(low)}도로 예상됩니다.`;
      } else if (language === 'ru') {
         script += ` Влажность составляет ${humidity} процентов, скорость ветра ${Math.round(windSpeed)}.`;
         if (high !== undefined && low !== undefined) script += ` На оставшуюся часть дня ожидается максимум ${Math.round(high)} и минимум ${Math.round(low)}.`;
      } else if (language === 'ar') {
         script += ` تبلغ نسبة الرطوبة ${humidity} بالمائة، وسرعة الرياح ${Math.round(windSpeed)}.`;
         if (high !== undefined && low !== undefined) script += ` بالنسبة لبقية اليوم، نتوقع أن تصل درجة الحرارة العظمى إلى ${Math.round(high)} والصغرى إلى ${Math.round(low)}.`;
      } else {
        script += ` The relative humidity is sitting at ${humidity} percent, and we've got wind speeds of ${Math.round(windSpeed)}.`;
        if (high !== undefined && low !== undefined) {
          script += ` For the rest of today, we're forecasting a high of ${Math.round(high)} degrees and a low of ${Math.round(low)}.`;
        }
      }

      const prep = getPreparations(currentCode, windSpeed, locationName, temperature, humidity, tempUnit, language);
      if (prep) {
        script += ' ' + prep;
      }

      if (tomorrowHigh !== undefined && tomorrowLow !== undefined && tomorrowCode !== undefined && tomorrowCode !== null) {
        const tomorrowDesc = (language === 'es') ? 'similares' : (language === 'fr') ? 'similaires' : (language === 'zh') ? '相似的' : (language === 'ja') ? '同様の' : (language === 'de') ? 'ähnliche' : (language === 'ko') ? '비슷한' : (language === 'ru') ? 'похожие' : (language === 'ar') ? 'مماثلة' : 'similar';
        if (language === 'es') script += ` Para mañana, se esperan condiciones ${tomorrowDesc}, con una máxima de ${Math.round(tomorrowHigh)} y una mínima de ${Math.round(tomorrowLow)}.`;
        else if (language === 'fr') script += ` En ce qui concerne demain, attendez-vous à des conditions ${tomorrowDesc}, avec un maximum de ${Math.round(tomorrowHigh)} et un minimum de ${Math.round(tomorrowLow)}.`;
        else if (language === 'ja') script += ` 明日は、最高気温${Math.round(tomorrowHigh)}度、最低気温${Math.round(tomorrowLow)}度で、${tomorrowDesc}天気が続く見込みです。`;
        else if (language === 'zh') script += ` 展望明天，预计天气${tomorrowDesc}，最高气温 ${Math.round(tomorrowHigh)} 度，最低气温 ${Math.round(tomorrowLow)} 度。`;
        else if (language === 'de') script += ` Mit Blick auf morgen erwarten wir ${tomorrowDesc} Bedingungen, mit Höchstwerten von ${Math.round(tomorrowHigh)} und Tiefstwerten von ${Math.round(tomorrowLow)}.`;
        else if (language === 'ko') script += ` 내일은 최고 기온 ${Math.round(tomorrowHigh)}도, 최저 기온 ${Math.round(tomorrowLow)}도의 ${tomorrowDesc} 날씨가 예상됩니다.`;
        else if (language === 'ru') script += ` Завтра ожидаются ${tomorrowDesc} условия, с максимумом ${Math.round(tomorrowHigh)} и минимумом ${Math.round(tomorrowLow)}.`;
        else if (language === 'ar') script += ` بالنظر إلى الغد، توقع ظروفاً ${tomorrowDesc}، مع بلوغ درجة الحرارة العظمى ${Math.round(tomorrowHigh)} والصغرى ${Math.round(tomorrowLow)}.`;
        else if (language === 'it') script += ` Guardando a domani, aspettatevi ${tomorrowDesc}, con una massima di ${Math.round(tomorrowHigh)} e una minima di ${Math.round(tomorrowLow)}.`;
        else if (language === 'pt') script += ` Para amanhã, espere condições de ${tomorrowDesc}, com máxima de ${Math.round(tomorrowHigh)} e mínima de ${Math.round(tomorrowLow)}.`;
        else if (language === 'hi') script += ` कल के लिए, ${tomorrowDesc} की उम्मीद है, अधिकतम ${Math.round(tomorrowHigh)} और न्यूनतम ${Math.round(tomorrowLow)} के साथ।`;
        else script += ` Looking ahead to tomorrow, expect ${tomorrowDesc} conditions, with a high of ${Math.round(tomorrowHigh)} and a low of ${Math.round(tomorrowLow)}.`;
      }
      
      if (language === 'zh') script += ` 祝您度过美好的一天！`;
      else if (language === 'de') script += ` Haben Sie einen absolut fantastischen Tag!`;
      else if (language === 'es') script += ` ¡Que tengas un día absolutamente fantástico!`;
      else if (language === 'ja') script += ` 素晴らしい一日をお過ごしください！`;
      else if (language === 'fr') script += ` Passez une journée absolument fantastique !`;
      else if (language === 'ko') script += ` 정말 환상적인 하루 보내세요!`;
      else if (language === 'ru') script += ` Желаем вам абсолютно фантастического дня!`;
      else if (language === 'ar') script += ` أتمنى لك يومًا رائعًا للغاية!`;
      else if (language === 'it') script += ` Ti auguro una giornata assolutamente fantastica!`;
      else if (language === 'pt') script += ` Tenha um dia absolutamente fantástico!`;
      else if (language === 'hi') script += ` आपका दिन बहुत शानदार हो!`;
      else script += ` Have an absolutely fantastic day ahead!`;

      globalUtterance = new SpeechSynthesisUtterance(script);
      globalUtterance.rate = 1.15;
      globalUtterance.pitch = 1.25;
      globalUtterance.volume = 1.0;

      // Start immediately and only use a recognized female voice for the selected language.
      const voices = availableVoices.length > 0 ? availableVoices : speechAPI.getVoices();
      const langMap: Record<string, string> = {
        en: 'en-US', es: 'es-ES', fr: 'fr-FR', ja: 'ja-JP', zh: 'zh-CN',
        de: 'de-DE', ko: 'ko-KR', ru: 'ru-RU', ar: 'ar-SA', it: 'it-IT',
        pt: 'pt-BR', hi: 'hi-IN'
      };
      const utteranceLang = langMap[language] || 'en-US';
      globalUtterance.lang = utteranceLang;

      const normalizedLang = utteranceLang.toLowerCase().split('-')[0];
      const femaleVoicePriority: Record<string, string[]> = {
        en: ['zira', 'jenny', 'aria', 'ava', 'emma', 'samantha', 'victoria', 'hazel', 'susan', 'female'],
        es: ['elvira', 'dalia', 'helena', 'laura', 'paulina', 'sabina', 'female'],
        fr: ['denise', 'hortense', 'amelie', 'julie', 'female'],
        de: ['katja', 'hedda', 'vicki', 'female'],
        it: ['elsa', 'isabella', 'female'],
        pt: ['francisca', 'luciana', 'maria', 'female'],
        ja: ['haruka', 'ayumi', 'sayaka', 'nanami', 'female'],
        zh: ['xiaoxiao', 'xiaoyi', 'huihui', 'yaoyao', 'female'],
        ko: ['heami', 'sunhi', 'yuna', 'female'],
        ru: ['svetlana', 'irina', 'female'],
        ar: ['salma', 'hoda', 'female'],
        hi: ['swara', 'kalpana', 'heera', 'female']
      };
      const priorities = femaleVoicePriority[normalizedLang] || femaleVoicePriority.en;
      let preferredVoice: SpeechSynthesisVoice | undefined;

      // Respect the explicit preference order instead of whichever voice the browser lists first.
      for (const preferredName of priorities) {
        preferredVoice = voices.find(voice => {
          const voiceLang = voice.lang.replace('_', '-').toLowerCase();
          return voiceLang.startsWith(normalizedLang) && voice.name.toLowerCase().includes(preferredName);
        });
        if (preferredVoice) break;
      }
      // Some browser voices do not expose gender in their names. If a named female
      // voice is unavailable, keep the requested language working with the best
      // matching voice. If the voice list is still loading, Edge chooses from `lang`.
      if (!preferredVoice) {
        preferredVoice = voices.find(voice =>
          voice.lang.replace('_', '-').toLowerCase().startsWith(normalizedLang)
        );
      }
      if (preferredVoice) globalUtterance.voice = preferredVoice;

      globalUtterance.onstart = () => updateGlobalState(true);
      globalUtterance.onend = () => updateGlobalState(false);
      let retriedWithNativeVoice = false;
      globalUtterance.onerror = (event) => {
        if (!retriedWithNativeVoice && event.error !== 'canceled' && event.error !== 'interrupted') {
          retriedWithNativeVoice = true;
          const nativeRetry = new SpeechSynthesisUtterance(script);
          nativeRetry.lang = utteranceLang;
          nativeRetry.rate = 1.05;
          nativeRetry.pitch = 1.1;
          nativeRetry.volume = 1.0;
          nativeRetry.onstart = () => updateGlobalState(true);
          nativeRetry.onend = () => updateGlobalState(false);
          nativeRetry.onerror = () => updateGlobalState(false);
          globalUtterance = nativeRetry;
          window.setTimeout(() => {
            if (requestVersion === speechRequestVersion) speechAPI.speak(nativeRetry);
          }, 75);
          return;
        }
        updateGlobalState(false);
      };

      // Mobile Safari/Chrome can discard a new utterance when cancel() is called
      // immediately before speak(). Cancel only when a real stale queue exists.
      if (speechAPI.speaking || speechAPI.pending) speechAPI.cancel();
      if (speechAPI.paused) speechAPI.resume();
      speechAPI.speak(globalUtterance);
      updateGlobalState(true);
    }
  };

  const handleTouch = () => {
    setShowHint(false);
    toggleSpeaking();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(false), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex items-center justify-center group">
      <button id="weather-forecaster-btn" 
        onClick={handleTouch}
        className={`z-20 p-1.5 sm:p-2 rounded-full backdrop-blur transition-all duration-300 shadow-md ${isPlaying ? 'bg-indigo-600 text-white animate-pulse' : 'bg-sky-200/80 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 hover:bg-sky-300 dark:hover:bg-slate-700 border border-sky-300/50 dark:border-slate-700/50'}`}
        title="Click to forecast weather"
        aria-label="Click to forecast weather"
      >
        {isPlaying ? <Square size={16} className="fill-current" /> : <Podcast size={16} />}
      </button>
      <span className={`forecaster-tooltip pointer-events-none absolute right-0 top-full z-[100] mt-2 w-max max-w-[180px] rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium !text-white shadow-lg transition-opacity ${showHint ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}>
        Click to forecast weather
      </span>
    </div>
  );
}
