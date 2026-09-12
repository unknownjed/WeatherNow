import test from 'node:test';
import assert from 'node:assert/strict';
import { advisoryTime, parseNhcForecast, parseJmaForecast, isPosition, getCyclones } from './cyclones.ts';

test('NHC dates cross month and year boundaries using issuance time', () => {
  assert.equal(advisoryTime(1, 0, 0, '2026-08-30T03:00:00Z'), '2026-09-01T00:00:00.000Z');
  assert.equal(advisoryTime(1, 6, 0, '2026-12-31T18:00:00Z'), '2027-01-01T06:00:00.000Z');
  assert.equal(advisoryTime(31, 12, 0, '2026-04-29T03:00:00Z'), null);
  assert.equal(advisoryTime(1, 25, 0, '2026-08-30T03:00:00Z'), null);
});
test('NHC parses forecast and outlook, respects hemispheres, ignores radii', () => {
  const storm = { id: 'ep112026', lastUpdate: '2026-08-30T03:00:00Z' };
  const text = '<pre>EP112026\nFORECAST VALID 30/1200Z 17.3N 121.6W\n50 KT... 60NE 50SE\nOUTLOOK VALID 01/0000Z 18.0S 126.5E</pre>';
  const points = parseNhcForecast(text, storm);
  assert.deepEqual(points.map(p => p.position), [[17.3, -121.6], [-18, 126.5]]);
  assert.equal(points[1].validAt, '2026-09-01T00:00:00.000Z');
  assert.equal(points[0].leadHours, 9);
  assert.throws(() => parseNhcForecast(text, { ...storm, id: 'ep122026' }), /mismatch/);
  assert.throws(() => parseNhcForecast('EP112026 NO FORECAST AVAILABLE', storm), /No supported/);
});
test('JMA keeps lat/lon order, actual valid time and radius in metres', () => {
  const storm = parseJmaForecast({ tropicalCyclone: 'TC2625', category: 'TS' }, [
    { part: 'title', name: { en: 'Etau' }, issue: { UTC: '2026-08-30T04:05:00Z' } },
    { advancedHours: 0, center: [30.9, 164.6], validtime: { UTC: '2026-08-30T03:00:00Z' }, track: { typhoon: [[30.9, 164.7], [30.9, 164.6]] } },
    { advancedHours: 24, center: [30.8, 166.6], validtime: { UTC: '2026-08-31T03:00:00Z' }, probabilityCircle: { radius: 120380 } },
  ]);
  assert.deepEqual(storm.position, [30.9, 164.6]);
  assert.equal(storm.forecast[0].probabilityRadiusM, 120380);
  assert.equal(storm.forecast[0].validAt, '2026-08-31T03:00:00.000Z');
  assert.equal(storm.history.length, 2);
  assert.throws(() => parseJmaForecast({}, []), /Missing/);
});
test('invalid or reversed geographic coordinates are rejected', () => {
  assert.equal(isPosition([164.6, 30.9]), false);
  assert.equal(isPosition([null, null]), false);
  assert.equal(isPosition([NaN, 121]), false);
  assert.equal(isPosition([-12, -179]), true);
});
test('outages are not an all-clear, and concurrent requests share one fetch', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('unavailable', { status: 503 }); };
  try {
    const [a, b] = await Promise.all([getCyclones(), getCyclones()]);
    assert.equal(calls, 2);
    assert.equal(a, b);
    assert.equal(a.storms.length, 0);
    assert.equal(a.sources.find(s => s.agency === 'JMA')?.state, 'unavailable');
    assert.match(a.sources.find(s => s.agency === 'NHC')?.message || '', /not an all-clear/);
  } finally { globalThis.fetch = original; }
});
