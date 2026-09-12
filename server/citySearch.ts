type City = {
  id: number; name: string; latitude: number; longitude: number;
  country: string; admin1?: string; timezone: string;
};

const cache = new Map<string, { results: City[]; expires: number }>();
const pending = new Map<string, Promise<City[]>>();
const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function photonCities(data: any, query: string): City[] {
  const prefix = normalize(query);
  const seen = new Set<string>();
  return (Array.isArray(data?.features) ? data.features : []).flatMap((feature: any) => {
    const p = feature.properties || {};
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    if (typeof p.name !== 'string' || !normalize(p.name).split(/[\s-]+/).some((word) => word.startsWith(prefix))
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180
      || !Number.isSafeInteger(p.osm_id)) return [];
    const key = `${normalize(p.name)}:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    // Negative IDs keep OSM results distinct from the existing GeoNames IDs.
    const type = p.osm_type === 'W' ? 1 : p.osm_type === 'R' ? 2 : 0;
    return [{ id: -(p.osm_id * 3 + type), name: p.name, latitude, longitude,
      country: p.country || '', admin1: p.state || '', timezone: 'auto' }];
  }).slice(0, 10);
}

export async function searchWeatherCities(input: string, request: typeof fetch = fetch): Promise<City[]> {
  const query = input.trim();
  if (query.length < 2 || query.length > 100) return [];
  const key = normalize(query);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.results;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const task = (async () => {
    let results: City[];
    if (query.length === 2) {
      // Open-Meteo only supports exact names at two characters, not autocomplete.
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en&layer=city`;
      const response = await request(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`City autocomplete: HTTP ${response.status}`);
      results = photonCities(await response.json(), query);
    } else {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
      const response = await request(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`City search: HTTP ${response.status}`);
      const data = await response.json();
      results = Array.isArray(data.results) ? data.results : [];
    }
    if (cache.size >= 250) cache.delete(cache.keys().next().value!);
    cache.set(key, { results, expires: Date.now() + 15 * 60_000 });
    return results;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
