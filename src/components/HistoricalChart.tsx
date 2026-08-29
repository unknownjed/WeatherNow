import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '../lib/i18n';

interface HistoricalChartProps {
  settings?: any;
  data: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export function HistoricalChart({ data, settings }: HistoricalChartProps) {
  if (!data || !data.time) return null;

  const chartData = data.time.map((time, index) => ({
    date: format(parseISO(time), 'MMM d', { locale: getDateLocale(settings?.language || 'en') }),
    max: data.temperature_2m_max[index],
    min: data.temperature_2m_min[index],
  }));

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickFormatter={(val) => `${Math.round(val)}°`}
          />
          <Tooltip 
            cursor={{ fill: '#1e293b' }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
            formatter={(value: number, name: string) => [`${value}°C`, name === 'max' ? 'High' : 'Low']}
            labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          <Bar dataKey="max" name="Max Temp" fill="#f87171" radius={[4, 4, 0, 0]} barSize={8} />
          <Bar dataKey="min" name="Min Temp" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
