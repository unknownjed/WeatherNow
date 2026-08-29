import React from 'react';
import { format } from 'date-fns';
import { getDateLocale, useTranslation } from '../lib/i18n';
import { WeatherIcon } from './WeatherIcon';

export function FiveDayForecast({ data, settings }: { data: any; settings: any }) {
  const t = useTranslation(settings?.language || 'en');
  if (!data || !data.time) return null;

  // Take the next 5 days
  const days = data.time.slice(0, 5).map((t: string, i: number) => ({
    date: new Date(t),
    maxTemp: data.temperature_2m_max[i],
    minTemp: data.temperature_2m_min[i],
    code: data.weather_code[i]
  }));

  return (
    <div className="grid grid-cols-5 h-full gap-2 pt-2 items-stretch w-full">
      {days.map((day: any, i: number) => (
        <div key={i} className="forecast-period-tile flex flex-col items-center justify-between bg-white dark:bg-slate-950/40 rounded-lg p-2 sm:p-3 border border-sky-200 dark:border-slate-800 hover:border-indigo-500/30 transition-colors w-full h-full">
          <div className="text-[10px] sm:text-xs font-bold text-sky-800 dark:text-slate-400 uppercase tracking-wider">
            {i === 0 ? t('today') : format(day.date, 'EEE', { locale: getDateLocale(settings?.language || 'en') })}
          </div>
          <div className="flex-1 flex items-center justify-center my-1 w-full min-h-[32px]">
            <WeatherIcon code={day.code} className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>
          <div className="flex flex-col items-center justify-end">
            <span className="text-sm sm:text-base font-medium text-sky-950 dark:text-slate-200 font-mono leading-none">{Math.round(day.maxTemp)}°</span>
          </div>
        </div>
      ))}
    </div>
  );
}
