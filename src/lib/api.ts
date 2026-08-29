export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone: string;
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  displayName: string;
  subtitle: string;
  lat: number;
  lng: number;
  type: string;
  category: 'restaurant' | 'gas' | 'hotel' | 'grocery' | 'pharmacy' | 'airport' | 'attraction' | 'education' | 'transit' | 'place';
  address: string;
  country?: string;
}

export async function searchPlaces(query: string, userLat?: number, userLon?: number): Promise<PlaceSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    let url = `/api/search-places?q=${encodeURIComponent(query.trim())}`;
    if (userLat !== undefined && userLon !== undefined) {
      url += `&lat=${userLat}&lon=${userLon}`;
    }
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("Failed to search places", error);
    return [];
  }
}

export async function searchLocations(query: string): Promise<Location[]> {
  if (!query) return [];
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("Failed to search locations", error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<Location | null> {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: Math.floor(Math.random() * 1000000),
      name: data.city || data.locality || data.principalSubdivision || "Current Location",
      latitude: lat,
      longitude: lon,
      country: data.countryName || "",
      admin1: data.principalSubdivision,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  } catch (error) {
    console.error("Failed to reverse geocode", error);
    return {
      id: Date.now(),
      name: "Current Location",
      latitude: lat,
      longitude: lon,
      country: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

export interface AppSettings {
  appName?: string;
  tempUnit: 'celsius' | 'fahrenheit';
  windUnit: 'kmh' | 'mph';
  precipUnit: 'mm' | 'inch';
  timeFormat: '12h' | '24h';
  startupLocation: 'device' | 'saved';
  savedLocations: Location[];
  severeAlerts: boolean;
  theme: 'dark' | 'light' | 'system';
  mapDefaultLayer: 'precipitation';
  calendarNotifications: boolean;
  language: string;
  calendarAlerts: boolean | 'temperature' | 'wind';
  autoSpeak: boolean;
}

export const defaultSettings: AppSettings = {
  appName: 'WeatherNow',
  tempUnit: 'celsius',
  windUnit: 'kmh',
  precipUnit: 'mm',
  timeFormat: '12h',
  startupLocation: 'device',
  savedLocations: [],
  severeAlerts: true,
  theme: 'dark',
  mapDefaultLayer: 'precipitation',
  calendarNotifications: true,
  language: 'en',
  calendarAlerts: true,
  autoSpeak: false
};

export async function getWeatherData(lat: number, lon: number, settings: AppSettings = defaultSettings) {
  const proxyUrl = `/api/weather?lat=${lat}&lon=${lon}&tempUnit=${settings.tempUnit}&windUnit=${settings.windUnit}&precipUnit=${settings.precipUnit}`;
  let directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  if (settings.tempUnit === 'fahrenheit') directUrl += '&temperature_unit=fahrenheit';
  if (settings.windUnit === 'mph') directUrl += '&wind_speed_unit=mph';
  if (settings.precipUnit === 'inch') directUrl += '&precipitation_unit=inch';

  try {
    let res = await fetch(proxyUrl);
    if (!res.ok) {
      console.warn("Weather proxy returned non-ok status; using direct fallback:", res.status);
      res = await fetch(directUrl);
    }
    if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
    const data = await res.json();
    try {
      localStorage.setItem('weathernow_weather_cache', JSON.stringify({ lat, lon, savedAt: Date.now(), data }));
    } catch {}
    return data;
  } catch (error) {
    console.error("Failed to fetch weather data", error);
    try {
      const cached = JSON.parse(localStorage.getItem('weathernow_weather_cache') || 'null');
      if (cached?.data && Math.abs(cached.lat - lat) < 0.1 && Math.abs(cached.lon - lon) < 0.1 && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000) {
        return cached.data;
      }
    } catch {}
    return null;
  }
}

export async function getHistoricalData(lat: number, lon: number, settings: AppSettings = defaultSettings) {
  // Get data for the past 30 days
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // Archive data typically lags a few days
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);
  
  const format = (d: Date) => d.toISOString().split('T')[0];

  try {
    let res = await fetch(`/api/historical?lat=${lat}&lon=${lon}&startDate=${format(startDate)}&endDate=${format(endDate)}&tempUnit=${settings.tempUnit}&precipUnit=${settings.precipUnit}`);
    if (!res.ok) {
      let directUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${format(startDate)}&end_date=${format(endDate)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      if (settings.tempUnit === 'fahrenheit') directUrl += '&temperature_unit=fahrenheit';
      if (settings.precipUnit === 'inch') directUrl += '&precipitation_unit=inch';
      res = await fetch(directUrl);
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) {
      console.warn("Archive API returned error payload:", data.reason);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch historical data", error);
    return null;
  }
}

export async function getRoute(startLon: number, startLat: number, endLon: number, endLat: number) {
  try {
    const res = await fetch(`/api/route?startLon=${startLon}&startLat=${startLat}&endLon=${endLon}&endLat=${endLat}`);
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch route", error);
    return null;
  }
}

// Map WMO Weather codes to descriptions
export function getWeatherDescription(code: number, lang: string = 'en'): { text: string; severe: boolean } {
  const isZh = lang === 'zh';
  const isEs = lang === 'es';
  const isFr = lang === 'fr';
  const isDe = lang === 'de';
  const isJa = lang === 'ja';
  const isKo = lang === 'ko';
  const isRu = lang === 'ru';
  const isAr = lang === 'ar';

  const translate = (en: string, zh: string, es: string, fr: string, de: string, ja: string, ko: string, ru: string, ar: string) => {
    if (isZh) return zh;
    if (isEs) return es;
    if (isFr) return fr;
    if (isDe) return de;
    if (isJa) return ja;
    if (isKo) return ko;
    if (isRu) return ru;
    if (isAr) return ar;
    return en;
  };

  const codes: Record<number, { text: string; severe: boolean }> = {
    0: { text: translate("Sunny", "晴", "Soleado", "Ensoleillé", "Sonnig", "快晴", "맑음", "Ясно", "مشمس"), severe: false },
    1: { text: translate("Mostly Sunny", "大部晴朗", "Mayormente soleado", "Généralement ensoleillé", "Meist sonnig", "晴れ", "대체로 맑음", "В основном ясно", "غالبا مشمس"), severe: false },
    2: { text: translate("Partly cloudy", "多云", "Parcialmente nublado", "Partiellement nuageux", "Teilweise bewölkt", "所により曇り", "구름 조금", "Переменная облачность", "غائم جزئيا"), severe: false },
    3: { text: translate("Cloudy", "阴天", "Nublado", "Nuageux", "Bewölkt", "曇り", "흐림", "Облачно", "غائم"), severe: false },
    45: { text: translate("Fog", "雾", "Niebla", "Brouillard", "Nebel", "霧", "안개", "Туман", "ضباب"), severe: false },
    48: { text: translate("Depositing rime fog", "雾凇", "Niebla escarchada", "Brouillard givrant", "Raureifnebel", "着氷性の霧", "상고대 안개", "Изморозь", "ضباب جليدي"), severe: false },
    51: { text: translate("Light rain", "毛毛雨", "Llovizna ligera", "Bruine légère", "Leichter Nieselregen", "小雨", "약한 이슬비", "Легкая морось", "رذاذ خفيف"), severe: false },
    53: { text: translate("Moderate rain", "中等毛毛雨", "Llovizna moderada", "Bruine modérée", "Mäßiger Nieselregen", "霧雨", "보통 이슬비", "Умеренная морось", "رذاذ معتدل"), severe: false },
    55: { text: translate("Heavy rain", "密集毛毛雨", "Llovizna densa", "Bruine dense", "Dichter Nieselregen", "強い霧雨", "강한 이슬비", "Густая морось", "رذاذ كثيف"), severe: false },
    56: { text: translate("Light freezing rain", "轻微冻毛毛雨", "Llovizna helada ligera", "Bruine verglaçante légère", "Leichter gefrierender Nieselregen", "弱い着氷性の霧雨", "약한 어는 이슬비", "Легкая замерзающая морось", "رذاذ متجمد خفيف"), severe: false },
    57: { text: translate("Heavy freezing rain", "密集冻毛毛雨", "Llovizna helada densa", "Bruine verglaçante dense", "Dichter gefrierender Nieselregen", "強い着氷性の霧雨", "강한 어는 이슬비", "Густая замерзающая морось", "رذاذ متجمد كثيف"), severe: true },
    61: { text: translate("Slight rain", "小雨", "Lluvia ligera", "Pluie légère", "Leichter Regen", "小雨", "약한 비", "Небольшой дождь", "أمطار خفيفة"), severe: false },
    63: { text: translate("Moderate rain", "中雨", "Lluvia moderada", "Pluie modérée", "Mäßiger Regen", "中程度の雨", "보통 비", "Умеренный дождь", "أمطار متوسطة"), severe: false },
    65: { text: translate("Heavy rain", "大雨", "Fuerte lluvia", "Forte pluie", "Starker Regen", "大雨", "강한 비", "Сильный дождь", "أمطار غزيرة"), severe: true },
    66: { text: translate("Light freezing rain", "轻微冻雨", "Lluvia helada ligera", "Pluie verglaçante légère", "Leichter gefrierender Regen", "弱い着氷性の雨", "약한 어는 비", "Легкий ледяной дождь", "مطر متجمد خفيف"), severe: false },
    67: { text: translate("Heavy freezing rain", "大冻雨", "Fuerte lluvia helada", "Forte pluie verglaçante", "Starker gefrierender Regen", "強い着氷性の雨", "강한 어는 비", "Сильный ледяной дождь", "مطر متجمد غزير"), severe: true },
    71: { text: translate("Slight snow fall", "小雪", "Nevada ligera", "Légères chutes de neige", "Leichter Schneefall", "小雪", "약한 눈", "Небольшой снег", "تساقط ثلوج خفيف"), severe: false },
    73: { text: translate("Moderate snow fall", "中雪", "Nevada moderada", "Chutes de neige modérées", "Mäßiger Schneefall", "雪", "보통 눈", "Умеренный снег", "تساقط ثلوج معتدل"), severe: false },
    75: { text: translate("Heavy snow fall", "大雪", "Fuerte nevada", "Fortes chutes de neige", "Starker Schneefall", "大雪", "강한 눈", "Сильный снег", "تساقط ثلوج كثيف"), severe: true },
    77: { text: translate("Snow grains", "米雪", "Granos de nieve", "Grains de neige", "Schneekörner", "霧雪", "싸락눈", "Снежные зерна", "حبات الثلج"), severe: false },
    80: { text: translate("Slight rain showers", "阵雨", "Chubascos ligeros", "Averses de pluie légères", "Leichte Regenschauer", "にわか雨", "약한 소나기", "Небольшие ливни", "زخات مطر خفيفة"), severe: false },
    81: { text: translate("Moderate rain showers", "中等阵雨", "Chubascos moderados", "Averses de pluie modérées", "Mäßige Regenschauer", "中程度のにわか雨", "보통 소나기", "Умеренные ливни", "زخات مطر معتدلة"), severe: false },
    82: { text: translate("Violent rain showers", "暴阵雨", "Chubascos violentos", "Averses de pluie violentes", "Heftige Regenschauer", "激しいにわか雨", "강한 소나기", "Сильные ливни", "زخات مطر عنيفة"), severe: true },
    85: { text: translate("Slight snow showers", "阵雪", "Chubascos de nieve ligeros", "Légères averses de neige", "Leichte Schneeschauer", "弱い雪", "약한 눈 소나기", "Небольшие снежные ливни", "زخات ثلج خفيفة"), severe: false },
    86: { text: translate("Heavy snow showers", "暴阵雪", "Fuertes chubascos de nieve", "Fortes averses de neige", "Starke Schneeschauer", "強い雪", "강한 눈 소나기", "Сильные снежные ливни", "زخات ثلج كثيفة"), severe: true },
    95: { text: translate("Thunderstorm", "雷暴", "Tormenta", "Orage", "Gewitter", "雷雨", "뇌우", "Гроза", "عاصفة رعدية"), severe: true },
    96: { text: translate("Thunderstorm with slight hail", "雷暴伴有小冰雹", "Tormenta con granizo ligero", "Orage avec grêle légère", "Gewitter mit leichtem Hagel", "雷雨と小さな雹", "약한 우박을 동반한 뇌우", "Гроза с небольшим градом", "عاصفة رعدية مع برد خفيف"), severe: true },
    99: { text: translate("Thunderstorm with heavy hail", "雷暴伴有大冰雹", "Tormenta con granizo fuerte", "Orage avec forte grêle", "Gewitter mit starkem Hagel", "雷雨と大きな雹", "강한 우박을 동반한 뇌우", "Гроза с крупным градом", "عاصفة رعدية مع برد كثيف"), severe: true },
  };

  return codes[code] || { text: translate("Unknown", "未知", "Desconocido", "Inconnu", "Unbekannt", "不明", "알 수 없음", "Неизвестно", "غير معروف"), severe: false };
}
