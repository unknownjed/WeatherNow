import React, { useEffect, useState } from 'react';
import { Waves, Wind, Sun, Activity } from 'lucide-react';
import { AirQualityData, getAirQualityData, getMarineData, MarineData, AppSettings } from '../lib/api';
import { useTranslation } from '../lib/i18n';

interface Props {
  lat: number;
  lon: number;
  settings: Pick<AppSettings, 'tempUnit' | 'windUnit' | 'language'>;
  onMarineData?: (data: MarineData | null) => void;
}

const value = (number: number | undefined, suffix = '') => Number.isFinite(number) ? `${Math.round(number as number)}${suffix}` : '—';
const metricValue = (number: number | undefined, unit = '') => <><span>{value(number)}</span>{unit && <span className="metric-unit text-xs">{unit}</span>}</>;

function aqiLabel(aqi?: number) {
  if (!Number.isFinite(aqi)) return 'aqiUnavailable';
  if ((aqi as number) <= 50) return 'aqiGood';
  if ((aqi as number) <= 100) return 'aqiModerate';
  if ((aqi as number) <= 150) return 'aqiSensitive';
  if ((aqi as number) <= 200) return 'aqiUnhealthy';
  if ((aqi as number) <= 300) return 'aqiVeryUnhealthy';
  return 'aqiHazardous';
}

// Standard UV categories use the same rounded index shown in the tile.
function uvLabel(index?: number) {
  if (index === undefined) return 'aqiUnavailable';
  if (index <= 2) return 'uvLow';
  if (index <= 5) return 'uvModerate';
  if (index <= 7) return 'uvHigh';
  if (index <= 10) return 'uvVeryHigh';
  return 'uvExtreme';
}

export function EnvironmentalPanels({ lat, lon, settings, onMarineData }: Props) {
  const t = useTranslation(settings.language);
  const [air, setAir] = useState<AirQualityData | null>(null);
  const [marine, setMarine] = useState<MarineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([getAirQualityData(lat, lon), getMarineData(lat, lon)]).then(([nextAir, nextMarine]) => {
      if (!active) return;

      setAir(nextAir);

      // getMarineData() already asks Open-Meteo for cell_selection=sea.
      // Keep the returned nearest sea grid instead of discarding it when the
      // selected city is more than 150 km inland. This allows countries/cities
      // such as Brazil, Mexico and France to still show the nearest available
      // marine conditions.
      setMarine(nextMarine);
      onMarineData?.(nextMarine);

      setLoading(false);
    });

    return () => { active = false; };
  }, [lat, lon, onMarineData]);

  const airNow = air?.current;
  const uvIndex = Number.isFinite(airNow?.uv_index) && (airNow?.uv_index as number) >= 0 ? Math.round(airNow!.uv_index) : undefined;
  const marineNow = marine?.current;
  const waveHeight = Number.isFinite(marineNow?.wave_height) ? marineNow?.wave_height : undefined;
  const seaTemperature = Number.isFinite(marineNow?.sea_surface_temperature) ? (settings.tempUnit === 'fahrenheit' ? (marineNow?.sea_surface_temperature as number) * 9 / 5 + 32 : marineNow?.sea_surface_temperature) : undefined;
  const currentVelocity = Number.isFinite(marineNow?.ocean_current_velocity) ? (settings.windUnit === 'mph' ? (marineNow?.ocean_current_velocity as number) * 0.621371 : marineNow?.ocean_current_velocity) : undefined;
  const hasMarine = Boolean(marineNow && Object.entries(marineNow).some(([key, item]) => key !== 'time' && Number.isFinite(item)));

  return (
    <div className="environmental-panels grid grid-cols-1 gap-4 break-words" dir={settings.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-2 shadow-inner dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 px-2 pt-1 flex items-center gap-2 text-[10px] lg:text-xs font-bold uppercase tracking-widest text-sky-800 dark:text-slate-400"><Activity size={15} className="text-emerald-500" />{t('airQualityUv')}</h3>
        {loading ? <p className="text-xs text-sky-700 dark:text-slate-400">{t('environmentalLoading')}</p> : (
          <div className="grid grid-cols-2 auto-rows-fr gap-2 text-xs">
            <div className="rounded-lg bg-white p-1 dark:bg-slate-800"><span data-weather-accent="environment-label" className="env-metric-label block text-[10px] uppercase text-blue-600 dark:text-slate-400">{t('usAqi')}</span><div className="flex items-baseline gap-2"><strong className="text-lg">{value(airNow?.us_aqi)}</strong><span className="min-w-0 text-[10px] font-bold text-slate-500">{t(aqiLabel(airNow?.us_aqi))}</span></div></div>
            <div className="rounded-lg bg-white p-1 dark:bg-slate-800"><span data-weather-accent="environment-label" className="env-metric-label flex items-center gap-1 text-[10px] uppercase text-blue-600 dark:text-slate-400"><Sun size={11} />{t('uvIndex')}</span><div className="flex items-baseline gap-2"><strong className="air-metric-value text-lg">{value(uvIndex)}</strong><span className="min-w-0 text-[10px] font-bold text-slate-500">{t(uvLabel(uvIndex))}</span></div></div>
            <div className="rounded-lg bg-white p-1 dark:bg-slate-800"><span data-weather-accent="environment-label" className="env-metric-label block text-[10px] uppercase text-blue-600 dark:text-slate-400">PM2.5</span><strong className="air-metric-value text-lg">{metricValue(airNow?.pm2_5, ' μg/m³')}</strong></div>
            <div className="rounded-lg bg-white p-1 dark:bg-slate-800"><span data-weather-accent="environment-label" className="env-metric-label block text-[10px] uppercase text-blue-600 dark:text-slate-400">PM10</span><strong className="air-metric-value text-lg">{metricValue(airNow?.pm10, ' μg/m³')}</strong></div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-2 shadow-inner dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 px-2 pt-1 flex items-center gap-2 text-[10px] lg:text-xs font-bold uppercase tracking-widest text-sky-800 dark:text-slate-400"><Waves size={15} className="text-blue-500" />{t('marineConditions')}</h3>
        {loading ? <p className="text-xs text-sky-700 dark:text-slate-400">{t('marineLoading')}</p> : hasMarine ? (
          <div className="grid grid-cols-2 auto-rows-fr gap-2 text-xs">
            <div className="rounded-lg bg-white p-1 dark:bg-slate-800"><span data-weather-accent="environment-label" className="env-metric-label block text-[10px] uppercase text-blue-600 dark:text-slate-400">{t('waveHeight')}</span><strong className="marine-metric-value text-lg">{metricValue(waveHeight, ' m')}</strong></div>
            <div className="rounded-lg bg-white p-1 dark:bg-slate-800"><span data-weather-accent="environment-label" className="env-metric-label block text-[10px] uppercase text-blue-600 dark:text-slate-400">{t('wavePeriod')}</span><strong className="marine-metric-value text-lg">{metricValue(marineNow?.wave_period, ' s')}</strong></div>
            <div className="rounded-lg bg-white p-1 dark:bg-slate-800"><span data-weather-accent="environment-label" className="env-metric-label block text-[10px] uppercase text-blue-600 dark:text-slate-400">{t('seaTemperature')}</span><strong className="marine-metric-value text-lg">{metricValue(seaTemperature, settings.tempUnit === 'fahrenheit' ? '°F' : '°C')}</strong></div>
            <div className="rounded-lg bg-white p-1 dark:bg-slate-800"><span data-weather-accent="environment-label" className="env-metric-label flex items-center gap-1 text-[10px] uppercase text-blue-600 dark:text-slate-400"><Wind size={11} />{t('oceanCurrent')}</span><strong className="marine-metric-value text-lg">{metricValue(currentVelocity, settings.windUnit === 'mph' ? ' mph' : ' km/h')}</strong></div>
          </div>
        ) : <p className="text-xs text-sky-700 dark:text-slate-400">{t('marineUnavailable')}</p>}
        <p className="mt-2 text-[11px] text-slate-500">{t('marineGuidance')}</p>
      </div>
    </div>
  );
}
