import { apiUrl } from './apiUrl';
import { applyDailyForecast, isPhilippineLocation } from './forecastSource';

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
    let url = apiUrl(`/api/search-places?q=${encodeURIComponent(query.trim())}`);
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

export async function searchLocations(query: string, signal?: AbortSignal): Promise<Location[]> {
  if (query.trim().length < 2) return [];
  try {
    const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(query.trim())}`), { signal });
    if (!res.ok) throw new Error(`City search: HTTP ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error("Failed to search locations", error);
    throw error;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<Location | null> {
  const cacheKey = `weathernow_place_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const toLocation = (data: any): Location => {
    const displayName = typeof data.displayName === 'string' ? data.displayName.split(',')[0].trim() : '';
    return {
      id: Math.round((lat + 90) * 1000000 + (lon + 180) * 1000),
      name: data.city || data.locality || displayName || data.principalSubdivision || "Current Location",
      latitude: lat,
      longitude: lon,
      country: data.countryName || "",
      admin1: data.principalSubdivision,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  };

  try {
    let data: any = null;
    try {
      const res = await fetch(apiUrl(`/api/reverse-geocode?lat=${lat}&lon=${lon}`), { signal: AbortSignal.timeout(7000) });
      if (res.ok) data = await res.json();
    } catch (proxyError) {
      console.warn("Reverse-geocode proxy unavailable; trying direct lookup.", proxyError);
    }

    if (!data?.city && !data?.locality && !data?.displayName) {
      const directUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const direct = await fetch(directUrl, { signal: AbortSignal.timeout(7000) });
      if (direct.ok) data = await direct.json();
    }

    if (data) {
      const resolved = toLocation(data);
      if (resolved.name !== 'Current Location') {
        try { localStorage.setItem(cacheKey, JSON.stringify(resolved)); } catch {}
        return resolved;
      }
    }
    throw new Error('No city name returned for these coordinates');
  } catch (error) {
    console.error("Failed to reverse geocode", error);
    try {
      const cachedPlace = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cachedPlace?.name && cachedPlace.name !== 'Current Location') return { ...cachedPlace, latitude: lat, longitude: lon };
    } catch {}
    return {
      id: Math.round((lat + 90) * 1000000 + (lon + 180) * 1000),
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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getWeatherData(lat: number, lon: number, settings: AppSettings = defaultSettings, country = '') {
  const ph = isPhilippineLocation(country);
  const cacheSignature = `${ph ? 'pagasa-observation-local-model-v3' : 'open-meteo'}|${settings.tempUnit}|${settings.windUnit}|${settings.precipUnit}`;
    // Fetch official observations/outlooks alongside the Open-Meteo hourly base.
    // Merge afterwards so the faster Open-Meteo response cannot bypass routing.
  const pagasaRequest = ph ? fetchWithTimeout(apiUrl(`/api/pagasa-forecast?lat=${lat}&lon=${lon}&country=PH&tempUnit=${settings.tempUnit}&windUnit=${settings.windUnit}`), {}, 12_000)
    .then(async response => response.ok ? response.json() : null).catch(() => null) : Promise.resolve(null);
  const proxyUrl = apiUrl(`/api/weather?lat=${lat}&lon=${lon}&tempUnit=${settings.tempUnit}&windUnit=${settings.windUnit}&precipUnit=${settings.precipUnit}`);
  let directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,weather_code,is_day,wind_speed_10m&hourly=temperature_2m,weather_code,is_day,precipitation,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&models=best_match`;
  if (settings.tempUnit === 'fahrenheit') directUrl += '&temperature_unit=fahrenheit';
  if (settings.windUnit === 'mph') directUrl += '&wind_speed_unit=mph';
  if (settings.precipUnit === 'inch') directUrl += '&precipitation_unit=inch';

  try {
    const requestWeather = async (url: string) => {
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
      return response;
    };
    // Start both requests together so an unavailable local proxy cannot delay startup.
    const res = await Promise.any([requestWeather(proxyUrl), requestWeather(directUrl)]);
    const data = applyDailyForecast(await res.json(), country, await pagasaRequest);
    try {
      localStorage.setItem('weathernow_weather_cache', JSON.stringify({ lat, lon, cacheSignature, savedAt: Date.now(), data }));
    } catch {}
    return data;
  } catch (error) {
    console.error("Failed to fetch weather data", error);
    const pagasa = await pagasaRequest;
    if (ph && (pagasa?.current_source?.available || pagasa?.daily_source?.available)) {
      return applyDailyForecast({ current: null, hourly: null, daily: null }, country, pagasa);
    }
    try {
      const cached = JSON.parse(localStorage.getItem('weathernow_weather_cache') || 'null');
      if (cached?.data && cached.cacheSignature === cacheSignature && Math.abs(cached.lat - lat) < 0.1 && Math.abs(cached.lon - lon) < 0.1 && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000) {
        if (ph && cached.data.current_source?.observedAt && Date.now() - Date.parse(cached.data.current_source.observedAt) > 90 * 60_000) {
          cached.data.current = null;
          cached.data.current_source = { ...cached.data.current_source, available: false, note: 'Cached PAGASA observation is too old to show as current.' };
        }
        return cached.data;
      }
    } catch {}
    return null;
  }
}

export interface AirQualityData {
  current?: {
    time?: string;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    uv_index?: number;
  };
}

export interface MarineData {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    wave_height?: number;
    wave_direction?: number;
    wave_period?: number;
    sea_surface_temperature?: number;
    ocean_current_velocity?: number;
    ocean_current_direction?: number;
  };
  current_units?: Record<string, string>;
}

async function getCachedEnvironmentalData<T>(key: string, url: string): Promise<T | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached?.data && Date.now() - cached.savedAt < 30 * 60 * 1000) return cached.data as T;
  } catch {}
  try {
    const response = await fetchWithTimeout(url, {}, 9000);
    if (!response.ok) throw new Error(`Environmental API returned ${response.status}`);
    const data = await response.json();
    try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data })); } catch {}
    return data as T;
  } catch (error) {
    console.error('Failed to load environmental data', error);
    try {
      return JSON.parse(localStorage.getItem(key) || 'null')?.data || null;
    } catch {
      return null;
    }
  }
}

export function getAirQualityData(lat: number, lon: number) {
  const key = `weathernow_air_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone,uv_index&timezone=auto`;
  return getCachedEnvironmentalData<AirQualityData>(key, url);
}

export async function getMarineData(lat: number, lon: number) {
  const key = `weathernow_marine_${lat.toFixed(2)}_${lon.toFixed(2)}`;

  const hasUsableMarine = (data: MarineData | null | undefined) => {
    const current = data?.current;
    if (!current) return false;
    return [
      current.wave_height,
      current.wave_period,
      current.sea_surface_temperature,
      current.ocean_current_velocity,
      current.ocean_current_direction,
    ].some(Number.isFinite);
  };

  const load = async (probeLat: number, probeLon: number) => {
    const url =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${probeLat}&longitude=${probeLon}` +
      `&current=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction` +
      `&cell_selection=sea&timezone=auto`;

    try {
      const response = await fetchWithTimeout(url, {}, 9000);
      if (!response.ok) return null;
      const data = await response.json() as MarineData;
      return hasUsableMarine(data) ? data : null;
    } catch {
      return null;
    }
  };

  // First ask Open-Meteo for the selected coordinates.
  const direct = await load(lat, lon);
  if (direct) {
    try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: direct })); } catch {}
    return direct;
  }

  // For inland cities, Open-Meteo can still return no current marine values
  // even with cell_selection=sea. Probe nearby coordinates outward until a
  // real sea grid is found. This keeps marine data aligned with the selected
  // country/city instead of showing nothing.
  const rings = [0.5, 1, 2, 3, 4, 6];
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  for (const radius of rings) {
    const probes = directions.map(([dLat, dLon]) => {
      const probeLat = Math.max(-89.5, Math.min(89.5, lat + dLat * radius));
      const lonScale = Math.max(0.25, Math.cos(lat * Math.PI / 180));
      const probeLonRaw = lon + (dLon * radius) / lonScale;
      const probeLon = ((probeLonRaw + 540) % 360) - 180;
      return load(probeLat, probeLon);
    });

    const results = await Promise.all(probes);
    const found = results.find(hasUsableMarine) || null;
    if (found) {
      try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: found })); } catch {}
      return found;
    }
  }

  // Last fallback: previously cached marine data for this selected location.
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached?.data && hasUsableMarine(cached.data)) return cached.data as MarineData;
  } catch {}

  return null;
}

export async function getHistoricalData(lat: number, lon: number, settings: AppSettings = defaultSettings) {
  // Get data for the past 30 days
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // Archive data typically lags a few days
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);
  
  const format = (d: Date) => d.toISOString().split('T')[0];

  try {
    let res: Response;
    try {
      res = await fetchWithTimeout(apiUrl(`/api/historical?lat=${lat}&lon=${lon}&startDate=${format(startDate)}&endDate=${format(endDate)}&tempUnit=${settings.tempUnit}&precipUnit=${settings.precipUnit}`), {}, 6000);
      if (!res.ok) throw new Error(`Historical proxy returned ${res.status}`);
    } catch {
      let directUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${format(startDate)}&end_date=${format(endDate)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      if (settings.tempUnit === 'fahrenheit') directUrl += '&temperature_unit=fahrenheit';
      if (settings.precipUnit === 'inch') directUrl += '&precipitation_unit=inch';
      res = await fetchWithTimeout(directUrl, {}, 6000);
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

export async function getRoute(startLon: number, startLat: number, endLon: number, endLat: number, mode: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING' = 'DRIVING') {
  try {
    const res = await fetch(apiUrl(`/api/route?startLon=${startLon}&startLat=${startLat}&endLon=${endLon}&endLat=${endLat}&mode=${mode}`));
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
