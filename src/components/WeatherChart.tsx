import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '../lib/i18n';

interface WeatherChartProps {
  data: {
    time: string[];
    temperature_2m: number[];
  };
}

export function WeatherChart({ data, settings }: { data: any; settings: any }) {
  if (!data || !data.time) return null;

  // We'll take the next 24 hours of data
  const now = new Date();
  const currentIndex = data.time.findIndex((t: string) => new Date(t) >= now);
  const startIndex = Math.max(0, currentIndex);
  const endIndex = Math.min(startIndex + 24, data.time.length);

  const chartData = data.time.slice(startIndex, endIndex).map((time: string, index: number) => {
    const actualIndex = startIndex + index;
    return {
      time: format(parseISO(time), settings?.timeFormat === '24h' ? 'HH:mm' : 'ha', { locale: getDateLocale(settings?.language || 'en') }),
      temp: data.temperature_2m[actualIndex],
    };
  });

  return (
    <div className="forecast-temperature-chart w-full h-full relative min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--forecast-chart-label)' }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--forecast-chart-label)' }}
            domain={['auto', 'auto']}
            tickFormatter={(val) => `${Math.round(val)}°`}
          />
          <Tooltip 
            wrapperClassName="weather-chart-tooltip"
            cursor={false}
            contentStyle={{ borderRadius: '8px', border: '1px solid rgba(148,163,184,0.55)', backgroundColor: settings?.theme === 'dark' ? 'rgba(51, 65, 85, 0.92)' : 'rgba(0, 0, 0, 0.55)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
            formatter={(value: number) => [`${value}°${settings?.tempUnit === 'fahrenheit' ? 'F' : 'C'}`, 'Temperature']}
            labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Area 
            type="monotone" 
            dataKey="temp" 
            stroke="#6366f1" 
            strokeWidth={3}
            activeDot={false}
            fillOpacity={1} 
            fill="url(#colorTemp)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
