export const PAGASA_FORECAST_URL = 'https://bagong.pagasa.dost.gov.ph/weather/weather-outlook-selected-philippine-cities';
// Approximate city centres for selecting a published city outlook, NOT weather
// station coordinates or an interpolated forecast for arbitrary GPS positions.
export const cities: Record<string, [number, number]> = {
  '64501000': [10.667, 122.95], '141102000': [16.403, 120.597],
  '104305000': [8.483, 124.65], '603000000': [10.72, 122.563],
  '175300000': [11.05, 114.283], '12812000': [18.198, 120.593],
  '50506000': [13.139, 123.744], '41014000': [13.941, 121.163],
  '72217000': [10.316, 123.885], '112402000': [7.191, 125.455],
  '133900000': [14.604, 120.982], '175316000': [9.74, 118.735],
  '3540100': [14.83, 120.283], '83747000': [11.243, 125.004],
  '42119000': [14.116, 120.963], '21529000': [17.613, 121.727],
  '101321000': [7.906, 125.095], '97332000': [6.922, 122.08],
};
interface Day { date: string; min: number; max: number; description: string; rainChance: number | null }
export interface CityOutlook { id: string; name: string; latitude: number; longitude: number; days: Day[] }
const clean = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];

export function parsePagasaCityOutlooks(html: string): CityOutlook[] {
  const headings = [...html.matchAll(/<a\b[^>]*href=["']#acc-(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const output: CityOutlook[] = [];
  headings.forEach((heading, index) => {
    const position = cities[heading[1]];
    if (!position) return;
    const section = html.slice(heading.index, headings[index + 1]?.index ?? html.length);
    const days: Day[] = [];
    for (const row of section.matchAll(/<tr\b[^>]*class=["'][^"']*\bmobile-view-tr\b[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)) {
      const date = clean(row[1]).match(/\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\b/);
      const min = row[1].match(/class=["']min["'][^>]*>\s*(-?\d+(?:\.\d+)?)/i);
      const max = row[1].match(/class=["']max["'][^>]*>\s*(-?\d+(?:\.\d+)?)/i);
      const description = row[1].match(/<img\b[^>]*title=["']([^"']*)["']/i)?.[1];
      const month = date ? months.indexOf(date[1].toLowerCase()) : -1;
      if (!date || month < 0 || !min || !max || !description) continue;
      const iso = `${date[3]}-${String(month + 1).padStart(2, '0')}-${date[2].padStart(2, '0')}`;
      const dateValue = new Date(`${iso}T00:00:00Z`);
      if (!Number.isFinite(dateValue.getTime()) || dateValue.toISOString().slice(0, 10) !== iso) continue;
      const low = Number(min[1]), high = Number(max[1]);
      if (low > high || low < -20 || high > 60) continue;
      const chance = clean(row[1]).match(/Chance of rain:\s*(\d+)\s*%/i);
      days.push({ date: iso, min: low, max: high, description: clean(description),
        rainChance: chance && Number(chance[1]) <= 100 ? Number(chance[1]) : null });
    }
    if (days.length) output.push({ id: heading[1], name: clean(heading[2]), latitude: position[0], longitude: position[1], days });
  });
  if (!output.length) throw new Error('PAGASA city forecast format unavailable.');
  return output;
}

const distanceKm = (lat: number, lon: number, city: CityOutlook) => {
  const rad = Math.PI / 180;
  const a = Math.sin((city.latitude - lat) * rad / 2) ** 2
    + Math.cos(lat * rad) * Math.cos(city.latitude * rad) * Math.sin((city.longitude - lon) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
};

// Weather-code mapping is for the existing icon only. Preserve the original
// PAGASA description; do not infer hourly rain, wind or rainfall amounts.
function iconCode(description: string, rainChance: number | null) {
  // PAGASA descriptions describe the whole day, not continuous conditions.
  // Avoid turning a low-probability shower/thunderstorm mention into an
  // all-day rain icon. The original description and probability are retained.
  const chance = Number.isFinite(rainChance) ? Number(rainChance) : null;
  const partly = /partly cloudy/i.test(description);
  const cloudy = /cloudy/i.test(description);
  if (/thunderstorm/i.test(description)) {
    if (chance !== null && chance < 50) return partly ? 2 : 3;
    if (chance !== null && chance < 70) return 80;
    return 95;
  }
  if (/rain|monsoon/i.test(description)) {
    if (chance !== null && chance < 40) return partly ? 2 : (cloudy ? 3 : 2);
    return 61;
  }
  if (partly) return 2;
  if (cloudy) return 3;
  if (/sunny|clear/i.test(description)) return 0;
  return 3;
}

export function selectPagasaForecast(outlooks: CityOutlook[], lat: number, lon: number, unit = 'celsius', now = new Date()) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Invalid location.');
  const today = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  const city = [...outlooks].sort((a, b) => distanceKm(lat, lon, a) - distanceKm(lat, lon, b))[0];
  if (!city) throw new Error('No PAGASA city outlook available.');
  const days = city.days.filter(day => day.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  if (days.length !== 5 || days.some((day, index) => day.date !== new Date(Date.parse(`${today}T00:00:00Z`) + index * 86400_000).toISOString().slice(0, 10))) {
    throw new Error('PAGASA has not supplied a complete current five-day outlook for the nearest city.');
  }
  const temp = (c: number) => unit === 'fahrenheit' ? c * 9 / 5 + 32 : c;
  return {
    daily: { time: days.map(d => d.date), temperature_2m_max: days.map(d => temp(d.max)), temperature_2m_min: days.map(d => temp(d.min)),
      weather_code: days.map(d => iconCode(d.description, d.rainChance)), weather_description: days.map(d => d.description),
      precipitation_probability_max: days.map(d => d.rainChance) },
    daily_source: { provider: 'PAGASA', cityId: city.id, city: city.name, distanceKm: Math.round(distanceKm(lat, lon, city)),
      url: PAGASA_FORECAST_URL, available: true, firstDate: days[0].date,
      note: 'Nearest published city outlook, not a forecast interpolated to your GPS position.' },
  };
}

let cached: { time: number; outlooks: CityOutlook[] } | undefined;
let pending: Promise<CityOutlook[]> | undefined;
export async function getPagasaForecast(lat: number, lon: number, unit: string) {
  if (!cached || Date.now() - cached.time > 15 * 60_000) {
    pending ??= (async () => {
      const response = await fetch(PAGASA_FORECAST_URL, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'WeatherNow/1.0' } });
      if (!response.ok) throw new Error('PAGASA forecast service unavailable.');
      const outlooks = parsePagasaCityOutlooks(await response.text());
      cached = { time: Date.now(), outlooks };
      return outlooks;
    })().finally(() => { pending = undefined; });
    await pending;
  }
  return { ...selectPagasaForecast(cached!.outlooks, lat, lon, unit), retrievedAt: new Date(cached!.time).toISOString() };
}
