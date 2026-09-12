import type { CycloneFeed, ForecastFix, LatLon, LiveCyclone } from '../src/lib/cycloneTypes';

const NHC = 'https://www.nhc.noaa.gov/CurrentStorms.json';
const JMA = 'https://www.jma.go.jp/bosai/typhoon/data';
const TTL = 10 * 60_000;
const MAX_AGE = 18 * 60 * 60_000;
type ObjectData = Record<string, any>;

export function isPosition(value: unknown): value is LatLon {
  return Array.isArray(value) && value.length === 2 &&
    value.every(v => typeof v === 'number' && Number.isFinite(v)) &&
    Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180;
}
function iso(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('Missing valid source time');
  return new Date(value).toISOString();
}
function recent(time: string, now: number) {
  const age = now - Date.parse(time);
  return age >= -60 * 60_000 && age <= MAX_AGE;
}

// NHC advisory dates omit month/year. Resolve the day against the issuance
// month, including month/year rollovers, never against the computer's month.
export function advisoryTime(day: number, hour: number, minute: number, issuedAt: string): string | null {
  if (day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const base = new Date(issuedAt);
  for (let offset = -1; offset <= 1; offset++) {
    const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, day, hour, minute));
    const lead = (date.getTime() - base.getTime()) / 3_600_000;
    if (date.getUTCDate() === day && lead > 0 && lead <= 168) return date.toISOString();
  }
  return null;
}

export function parseNhcForecast(html: string, storm: ObjectData): ForecastFix[] {
  const text = (html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)?.[1] || html).replace(/<[^>]*>/g, ' ');
  if (!text.toUpperCase().includes(String(storm.id).toUpperCase())) throw new Error('Advisory storm ID mismatch');
  const issuedAt = iso(storm.forecastAdvisory?.issuance || storm.lastUpdate);
  const fixes: ForecastFix[] = [];
  const pattern = /(?:FORECAST|OUTLOOK) VALID\s+(\d{2})\/(\d{2})(\d{2})Z\s+(\d+(?:\.\d+)?)([NS])\s+(\d+(?:\.\d+)?)([EW])/g;
  for (const m of text.matchAll(pattern)) {
    const validAt = advisoryTime(Number(m[1]), Number(m[2]), Number(m[3]), issuedAt);
    const position: LatLon = [Number(m[4]) * (m[5] === 'S' ? -1 : 1), Number(m[6]) * (m[7] === 'W' ? -1 : 1)];
    if (validAt && isPosition(position)) fixes.push({ position, validAt, leadHours: (Date.parse(validAt) - Date.parse(issuedAt)) / 3_600_000 });
  }
  if (!fixes.length) throw new Error('No supported forecast positions in advisory');
  return fixes.sort((a, b) => Date.parse(a.validAt) - Date.parse(b.validAt));
}

export function parseJmaForecast(target: ObjectData, data: unknown): LiveCyclone {
  if (!Array.isArray(data)) throw new Error('Invalid JMA forecast');
  const title = data.find(row => row.part === 'title');
  const analysis = data.find(row => row.advancedHours === 0 && isPosition(row.center));
  if (!title || !analysis) throw new Error('Missing JMA title/analysis');
  const issuedAt = iso(title.issue?.UTC || target.issue);
  const forecast: ForecastFix[] = data.filter(row => row.advancedHours > 0 && isPosition(row.center)).map(row => ({
    position: row.center,
    validAt: iso(row.validtime?.UTC),
    leadHours: row.advancedHours,
    ...(Number.isFinite(row.probabilityCircle?.radius) && row.probabilityCircle.radius > 0
      ? { probabilityRadiusM: row.probabilityCircle.radius } : {}),
  })).sort((a, b) => Date.parse(a.validAt) - Date.parse(b.validAt));
  const history = [...(analysis.track?.preTyphoon || []), ...(analysis.track?.typhoon || [])].filter(isPosition);
  return {
    id: `jma-${target.tropicalCyclone}`, agency: 'JMA', name: title.name?.en || target.tropicalCyclone,
    category: target.category || 'Cyclone', issuedAt, observedAt: iso(analysis.validtime?.UTC),
    position: analysis.center, history, forecast,
    sourceUrl: 'https://www.jma.go.jp/bosai/typhoon/',
  };
}

// Fixed agency domains only; never proxy arbitrary client-supplied URLs.
async function request(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['www.nhc.noaa.gov', 'www.jma.go.jp'].includes(parsed.hostname)) throw new Error('Unsupported agency URL');
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Agency returned HTTP ${response.status}`);
  return response;
}

async function loadNhc(now: number) {
  const data = await (await request(NHC)).json();
  if (!Array.isArray(data.activeStorms)) throw new Error('Invalid NHC storm list');
  let skipped = 0;
  const storms = await Promise.all(data.activeStorms.slice(0, 20).map(async (raw: ObjectData): Promise<LiveCyclone | null> => {
    const position: LatLon = [raw.latitudeNumeric, raw.longitudeNumeric];
    if (!isPosition(position) || !raw.id || !recent(raw.lastUpdate, now)) { skipped++; return null; }
    const storm: LiveCyclone = {
      id: `nhc-${raw.id}`, agency: 'NHC', name: raw.name || raw.id, category: raw.classification || 'Cyclone',
      issuedAt: iso(raw.lastUpdate), observedAt: iso(raw.lastUpdate), position, history: [], forecast: [],
      sourceUrl: 'https://www.nhc.noaa.gov/',
    };
    try {
      const url = new URL(raw.forecastAdvisory?.url);
      if (url.hostname !== 'www.nhc.noaa.gov' || !url.pathname.startsWith('/text/')) throw new Error('Unsupported NHC advisory URL');
      storm.forecast = parseNhcForecast(await (await request(url.href)).text(), raw);
      storm.sourceUrl = url.href;
    } catch {
      storm.warning = 'Forecast unavailable; showing reported position only.';
    }
    return storm;
  }));
  return { storms, skipped };
}

async function loadJma(now: number) {
  const targets = await (await request(`${JMA}/targetTc.json`)).json();
  if (!Array.isArray(targets)) throw new Error('Invalid JMA storm list');
  let failed = 0;
  const storms = await Promise.all(targets.slice(0, 20).map(async (target: ObjectData) => {
    try {
      if (!/^TC\d{4}$/.test(target.tropicalCyclone) || !recent(target.issue, now)) { failed++; return null; }
      const raw = await (await request(`${JMA}/${target.tropicalCyclone}/forecast.json`)).json();
      const storm = parseJmaForecast(target, raw);
      if (!recent(storm.issuedAt, now)) { failed++; return null; }
      return storm;
    } catch { failed++; return null; }
  }));
  return { storms, failed };
}

let cache: { time: number; data: CycloneFeed } | undefined;
let pending: Promise<CycloneFeed> | undefined;
export async function getCyclones(): Promise<CycloneFeed> {
  if (cache && Date.now() - cache.time < TTL) return cache.data;
  if (pending) return pending;
  pending = (async () => {
    const now = Date.now();
    const [nhc, jma] = await Promise.allSettled([loadNhc(now), loadJma(now)]);
    const storms: LiveCyclone[] = [];
    const sources: CycloneFeed['sources'] = [];
    if (nhc.status === 'fulfilled') {
      storms.push(...nhc.value.storms.filter((s): s is LiveCyclone => s !== null));
      const partial = nhc.value.skipped > 0 || nhc.value.storms.some(s => s?.warning);
      sources.push({ agency: 'NHC', state: partial ? 'partial' : 'ok', ...(partial ? { message: 'Some advisories unavailable, invalid or older than 18 hours.' } : {}) });
    } else sources.push({ agency: 'NHC', state: 'unavailable', message: 'Feed unavailable; not an all-clear.' });
    if (jma.status === 'fulfilled') {
      storms.push(...jma.value.storms.filter((s): s is LiveCyclone => s !== null));
      sources.push({ agency: 'JMA', state: jma.value.failed ? 'partial' : 'ok', ...(jma.value.failed ? { message: 'Some advisories unavailable, invalid or older than 18 hours.' } : {}) });
    } else sources.push({ agency: 'JMA', state: 'unavailable', message: 'Feed unavailable; not an all-clear.' });
    sources.push({ agency: 'JTWC', state: 'unavailable', message: 'Direct access returned HTTP 403 during setup. JMA supplies western Pacific tracks; JTWC is not connected.' });
    const data: CycloneFeed = { fetchedAt: new Date(now).toISOString(), storms, sources };
    cache = { time: now, data };
    return data;
  })();
  try { return await pending; } finally { pending = undefined; }
}
