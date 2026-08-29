import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { getDateLocale, useTranslation } from '../lib/i18n';
import { WeatherIcon } from './WeatherIcon';

export function HourlyForecast({ data, settings, current }: { data: any; settings: any; current?: { temperature_2m: number; weather_code: number; is_day?: number } }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (!data || !data.time) return null;

  const t = useTranslation(settings?.language || 'en');
  const now = new Date();
  const currentIndex = data.time.findIndex((t: string) => new Date(t) > now);
  const startIndex = Math.max(0, currentIndex);
  const endIndex = Math.min(startIndex + 23, data.time.length);

  const forecastHours = data.time.slice(startIndex, endIndex).map((t: string, i: number) => {
    const actualIndex = startIndex + i;
    const isDay = data.is_day ? data.is_day[actualIndex] : (new Date(t).getHours() >= 6 && new Date(t).getHours() < 19 ? 1 : 0);
    return {
      date: new Date(t),
      temp: data.temperature_2m[actualIndex],
      code: data.weather_code[actualIndex],
      precip: data.precipitation_probability[actualIndex],
      isDay
    };
  });
  const hours = current ? [{ date: now, temp: current.temperature_2m, code: current.weather_code, precip: 0, isDay: current.is_day ?? 1 }, ...forecastHours] : forecastHours;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDown(true);
    if (scrollRef.current) {
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeft(scrollRef.current.scrollLeft);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
  };

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={() => setIsDown(false)}
      onMouseUp={() => setIsDown(false)}
      onMouseMove={handleMouseMove}
      className={`flex gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden h-full items-center overscroll-y-none touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDown ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {hours.map((hour: any, i: number) => (
        <div key={i} className="forecast-period-tile flex flex-col items-center justify-between min-w-[60px] sm:min-w-[72px] bg-white dark:bg-slate-950/40 rounded-lg p-2 sm:p-3 border border-sky-200 dark:border-slate-800 h-full flex-shrink-0 select-none overflow-hidden">
          <div className="text-[10px] sm:text-xs font-bold text-sky-800 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
            {i === 0 ? t('currently') : format(hour.date, settings?.timeFormat === '24h' ? 'HH:mm' : 'ha', { locale: getDateLocale(settings?.language || 'en') })}
          </div>
          <div className="my-1 sm:my-2 flex-1 flex items-center justify-center min-h-[36px] w-full">
            <WeatherIcon code={hour.code} isDay={hour.isDay} className="w-8 h-8 sm:w-9 sm:h-9 pointer-events-none" />
          </div>
          <span className="text-sm sm:text-base font-medium text-sky-950 dark:text-slate-200 font-mono leading-none">{Math.round(hour.temp)}°</span>
          <span className={`text-[9px] sm:text-[10px] font-mono leading-none ${hour.precip > 0 ? 'text-blue-400' : 'text-transparent'}`}>{hour.precip || 0}%</span>
        </div>
      ))}
    </div>
  );
}
