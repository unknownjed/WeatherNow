import { cities } from './pagasaForecast.ts';
export const PAGASA_AWS_URL = 'https://bagong.pagasa.dost.gov.ph/automated-weather-station';
// Explicit locality-to-station matches verified against PAGASA's AWS table.
// These city centres select a representative locality station, NOT a claimed
// nearest AWS/GPS reading. Other localities remain unavailable, not fabricated.
const cityStations: Record<string, string> = {
  '133900000': '98', '12812000': '5012', '41014000': '5117',
  '72217000': '5138', '112402000': '5147', '175316000': '5124',
  '50506000': '5128', '83747000': '5131', '101321000': '5061', '97332000': '5151',
};
interface Station { id: string; name: string; temperature: number | null; humidity: number | null; windKmh: number | null; observedAt: string }
const clean = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export function parsePagasaStations(html: string): Station[] {
  const stations: Station[] = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => clean(m[1]));
    if (cells.length !== 10 || !/^\d+$/.test(cells[0])) continue;
    const number = (text: string, min: number, max: number) => {
      const match = text.match(/^(-?\d+(?:\.\d+)?)/);
      const n = match ? Number(match[1]) : NaN;
      return Number.isFinite(n) && n >= min && n <= max ? n : null;
    };
    // The official table's clock is Philippine local time, independent of the
    // server timezone (Render commonly runs in UTC).
    const time = cells[9].match(/^([A-Za-z]+ \d{1,2}, \d{4}),\s*(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (!time) continue;
    const day = new Date(`${time[1]} 00:00:00 GMT+0800`);
    if (!Number.isFinite(day.getTime()) || Number(time[2]) < 1 || Number(time[2]) > 12 || Number(time[3]) > 59) continue;
    const hours = Number(time[2]) % 12 + (time[4].toLowerCase() === 'pm' ? 12 : 0);
    stations.push({ id: cells[0], name: cells[1], temperature: number(cells[2], -20, 60), humidity: number(cells[3], 0, 100),
      windKmh: number(cells[4], 0, 400), observedAt: new Date(day.getTime() + (hours * 60 + Number(time[3])) * 60_000).toISOString() });
  }
  if (!stations.length) throw new Error('PAGASA station table unavailable.');
  return stations;
}

export function selectPagasaCurrent(stations: Station[], lat: number, lon: number, tempUnit: string, windUnit: string, now = Date.now()) {
  const distances = Object.entries(cities).map(([id, [y, x]]) => {
    const rad = Math.PI / 180;
    const a = Math.sin((y-lat)*rad/2)**2 + Math.cos(lat*rad)*Math.cos(y*rad)*Math.sin((x-lon)*rad/2)**2;
    return { id, km: 12742 * Math.asin(Math.min(1, Math.sqrt(a))) };
  }).sort((a,b) => a.km-b.km);
  const city = distances[0];
  const station = city && city.km <= 35 ? stations.find(s => s.id === cityStations[city.id]) : undefined;
  const source = { provider: 'PAGASA', available: false, url: PAGASA_AWS_URL, station: station?.name, observedAt: station?.observedAt,
    note: 'No verified, recent PAGASA station reading is connected for this locality.' };
  if (!station) return { current: null, current_source: source };
  const age = now - Date.parse(station.observedAt);
  if (age > 90 * 60_000 || age < -10 * 60_000) return { current: null, current_source: { ...source, note: 'PAGASA station reading is stale or has an invalid timestamp.' } };
  if (station.temperature === null || station.humidity === null || station.windKmh === null) return { current: null, current_source: { ...source, note: 'PAGASA station has missing measurements.' } };
  return { current: { time: station.observedAt, temperature_2m: tempUnit === 'fahrenheit' ? station.temperature * 9/5 + 32 : station.temperature,
    relative_humidity_2m: station.humidity, wind_speed_10m: Math.round((windUnit === 'mph' ? station.windKmh / 1.609344 : station.windKmh) * 10)/10,
    apparent_temperature: null, weather_code: null },
    current_source: { ...source, available: true, note: 'Representative locality station, not a measurement at your GPS point. Sky condition and feels-like temperature are not supplied.' },
  };
}
let cached: { at: number; stations: Station[] } | undefined;
let pending: Promise<void> | undefined;
export async function getPagasaCurrent(lat: number, lon: number, tempUnit: string, windUnit: string) {
  if (!cached || Date.now() - cached.at > 5 * 60_000) {
    pending ??= (async () => {
      const response = await fetch(PAGASA_AWS_URL, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'WeatherNow/1.0' } });
      if (!response.ok) throw new Error('PAGASA stations unavailable.');
      cached = { at: Date.now(), stations: parsePagasaStations(await response.text()) };
    })().finally(() => { pending = undefined; });
    await pending;
  }
  return selectPagasaCurrent(cached!.stations, lat, lon, tempUnit, windUnit);
}
