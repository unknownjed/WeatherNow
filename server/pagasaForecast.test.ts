import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePagasaCityOutlooks, selectPagasaForecast } from './pagasaForecast.ts';
import { parsePagasaStations, selectPagasaCurrent } from './pagasaCurrent.ts';
import { applyDailyForecast, isPhilippineLocation } from '../src/lib/forecastSource.ts';
const now = new Date('2026-08-30T05:00:00Z');
const row = (date: string) => `<tr class="mobile-view-tr"><td>${date}</td><td><img title="Occasional rains"><span class="min">25°C</span><span class="max">28°C</span>Chance of rain: 100%</td></tr>`;
const days = ['August 30, 2026', 'August 31, 2026', 'September 01, 2026', 'September 02, 2026', 'September 03, 2026'].map(row).join('');
const html = `<a href="#acc-133900000">Metro Manila</a>${days}<a href="#acc-112402000">Metro Davao</a>${days}`;
test('parse official city fields, correct city selection and Celsius/Fahrenheit', () => {
  const cities = parsePagasaCityOutlooks(html);
  const forecast = selectPagasaForecast(cities,14.6,121,'celsius',now);
  assert.equal(forecast.daily_source.city,'Metro Manila');
  assert.deepEqual(forecast.daily.temperature_2m_max,[28,28,28,28,28]);
  assert.deepEqual(forecast.daily.weather_description,Array(5).fill('Occasional rains'));
  assert.equal(selectPagasaForecast(cities,7.19,125.45,'fahrenheit',now).daily.temperature_2m_max[0],82.4);
});
test('stale city forecasts and broken formats fail rather than masquerading as current', () => {
  assert.throws(()=>parsePagasaCityOutlooks('<html>Error</html>'));
  assert.throws(()=>selectPagasaForecast(parsePagasaCityOutlooks(html),14.6,121,'celsius',new Date('2026-09-03')),/five-day outlook/);
});
test('an incomplete or gapped PAGASA five-day outlook is rejected for fallback', () => {
  const outlooks = parsePagasaCityOutlooks(html);
  for (const dates of [outlooks[0].days.slice(0, 4), outlooks[0].days.filter((_, i) => i !== 2)]) {
    assert.throws(() => selectPagasaForecast([{ ...outlooks[0], days: dates }], 14.6, 121, 'celsius', now), /five-day outlook/);
  }
});
const stationHtml = (time='August 30, 2026, 12:50 pm', temp='26 °C') => `<tr><td>98</td><td>Science Garden, Quezon City</td><td>${temp}</td><td>88 %</td><td>3.6 km/hr</td><td>WSW</td><td>0 mm/hr</td><td>1003.8</td><td>51.4</td><td>${time}</td></tr>`;
test('station time is explicitly Philippine time, readings are not daily highs', () => {
  const stations = parsePagasaStations(stationHtml());
  const result = selectPagasaCurrent(stations,14.6,121,'celsius','kmh',now.getTime());
  assert.equal(result.current?.time,'2026-08-30T04:50:00.000Z');
  assert.equal(result.current?.temperature_2m,26);
  assert.equal(result.current?.apparent_temperature,null);
  assert.equal(result.current?.weather_code,null);
  assert.equal(selectPagasaCurrent(stations,14.6,121,'fahrenheit','mph',now.getTime()).current?.temperature_2m,78.8);
});
test('old, future, missing and unsupported-locality station readings are unavailable', () => {
  for (const time of ['August 29, 2026, 12:50 pm','August 31, 2026, 12:50 pm']) {
    assert.equal(selectPagasaCurrent(parsePagasaStations(stationHtml(time)),14.6,121,'celsius','kmh',now.getTime()).current,null);
  }
  assert.equal(selectPagasaCurrent(parsePagasaStations(stationHtml(undefined,'-- °C')),14.6,121,'celsius','kmh',now.getTime()).current,null);
  assert.equal(selectPagasaCurrent(parsePagasaStations(stationHtml()),10.6,122.95,'celsius','kmh',now.getTime()).current,null);
});
test('PH provider routing preserves hourly data; other countries stay completely unchanged', () => {
  const base = {current:{temperature_2m:30},hourly:{temperature_2m:[29]},daily:{temperature_2m_max:[31]}};
  const daily = selectPagasaForecast(parsePagasaCityOutlooks(html),14.6,121,'celsius',now);
  const current = selectPagasaCurrent(parsePagasaStations(stationHtml()),14.6,121,'celsius','kmh',now.getTime());
  const result = applyDailyForecast(base,'Philippines',{...daily,...current});
  assert.equal(result.hourly,base.hourly); assert.equal(result.hourly_current,base.current);
  assert.equal(result.current.temperature_2m,26); assert.equal(result.daily.temperature_2m_max[0],28);
  for(const country of ['United States','Taiwan','Malaysia','']) assert.equal(applyDailyForecast(base,country,{...daily,...current}),base);
  assert(isPhilippineLocation('PH') && isPhilippineLocation(' Philippines '));
});
test('PH daily outage and unavailable current use labeled Open-Meteo fallback', () => {
  const base = {current:{temperature_2m:30},hourly:{},daily:{temperature_2m_max:[31]}};
  const result = applyDailyForecast(base,'PH',null);
  assert.equal(result.daily,base.daily); assert.equal(result.daily_source.provider,'Open-Meteo');
  assert.equal(result.daily_source.fallback,true); assert.equal(result.current,base.current);
  assert.equal(result.current_source.provider,'Open-Meteo'); assert.equal(result.current_source.fallback,true);
});
