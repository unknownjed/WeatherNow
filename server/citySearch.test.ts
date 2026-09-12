import test from 'node:test';
import assert from 'node:assert/strict';
import { photonCities, searchWeatherCities } from './citySearch.ts';

const feature = (name: string, id = 1) => ({ properties: { name, osm_id: id, country: 'Philippines', osm_type: 'N' }, geometry: { coordinates: [120.98, 14.6] } });

test('two-letter prefixes match cities, excluding unrelated or invalid results', () => {
  const results = photonCities({ features: [feature('Manila'), feature('Makati', 2), feature('Cebu', 3), feature('Manila'), { properties: { name: 'Madrid' } }] }, ' MA ');
  assert.deepEqual(results.map(c => c.name), ['Manila', 'Makati']);
  assert.equal(results[0].latitude, 14.6);
  assert.equal(results[0].longitude, 120.98);
  assert.ok(results.every(c => c.id < 0));
});

test('prefix matching handles accents and city-name words', () => {
  assert.equal(photonCities({ features: [feature('São Paulo')] }, 'sa').length, 1);
  assert.equal(photonCities({ features: [feature('New York')] }, 'yo').length, 1);
});

test('short or excessively long queries never contact a provider', async () => {
  const fail = (() => { throw new Error('unexpected network request'); }) as typeof fetch;
  for (const q of ['', ' ', 'a', 'x'.repeat(101)]) assert.deepEqual(await searchWeatherCities(q, fail), []);
});

test('two-letter searches use autocomplete, deduplicate in-flight requests, and cache', async () => {
  let calls = 0;
  const request = (async (url: any) => {
    calls++;
    assert.match(String(url), /photon\.komoot\.io/);
    assert.match(String(url), /layer=city/);
    return new Response(JSON.stringify({ features: [feature('Quezon City')] }));
  }) as typeof fetch;
  const [first, second] = await Promise.all([searchWeatherCities('qu', request), searchWeatherCities(' QU ', request)]);
  assert.equal(first[0].name, 'Quezon City');
  assert.deepEqual(first, second);
  assert.deepEqual(await searchWeatherCities('qu', request), first);
  assert.equal(calls, 1);
});

test('longer queries retain Open-Meteo and failures can be retried', async () => {
  await assert.rejects(searchWeatherCities('Zürich', (async () => new Response('', { status: 503 })) as typeof fetch));
  const results = await searchWeatherCities('Zürich', (async (url: any) => {
    assert.match(String(url), /geocoding-api\.open-meteo\.com/);
    assert.match(String(url), /Z%C3%BCrich/);
    return new Response(JSON.stringify({ results: [{ id: 123, name: 'Zurich', timezone: 'Europe/Zurich' }] }));
  }) as typeof fetch);
  assert.equal(results[0].timezone, 'Europe/Zurich');
});
