import React, { Suspense, useState } from 'react';
import { Navigation, CloudRain, Maximize, Minimize, Compass, ShieldAlert } from 'lucide-react';
import { PagasaTyphoonMap } from './PagasaTyphoonMap';
import { AppSettings } from '../lib/api';

function RouteMapUnavailable() {
  return <div className="flex h-full min-h-[350px] w-full items-center justify-center bg-slate-100 px-6 text-center text-sm font-semibold text-slate-800 dark:bg-slate-950 dark:text-slate-200">Route Map could not start on this device. Refresh the dashboard to try again.</div>;
}

const GoogleNavigationMap = React.lazy(() => import('./GoogleNavigationMap')
  .then((module) => ({ default: module.GoogleNavigationMap }))
  .catch((error) => {
    console.error('Route Map failed to load.', error);
    return { default: RouteMapUnavailable };
  }));

interface WeatherMapProps {
  lat: number;
  lon: number;
  name: string;
  country?: string;
  isExpanded?: boolean;
  onToggleFullscreen?: () => void;
  settings?: AppSettings;
}

export function WeatherMap({ lat, lon, name, country, isExpanded, onToggleFullscreen, settings }: WeatherMapProps) {
  const [mapMode, setMapMode] = useState<'google-navigation' | 'pagasa'>('pagasa');
  const modeLabels: Record<string, [string, string]> = { en: ['Route Map', 'Weather Track'], es: ['Mapa de rutas', 'Seguimiento meteorológico'], fr: ['Carte des itinéraires', 'Suivi météo'], de: ['Routenkarte', 'Wetterverfolgung'], it: ['Mappa percorsi', 'Monitoraggio meteo'], pt: ['Mapa de rotas', 'Rastreamento meteorológico'], ja: ['ルートマップ', '気象トラック'], ko: ['경로 지도', '날씨 추적'], zh: ['路线地图', '天气追踪'], hi: ['मार्ग मानचित्र', 'मौसम ट्रैक'], ru: ['Карта маршрутов', 'Отслеживание погоды'], ar: ['خريطة المسار', 'تتبع الطقس'] };
  const [routeLabel, trackLabel] = modeLabels[settings?.language || 'en'] || modeLabels.en;

  return (
    <div className="weather-map relative w-full h-full min-h-[350px] flex flex-col bg-slate-950 rounded-lg overflow-hidden border border-sky-300/40 dark:border-slate-800 shadow-inner">
      {/* View Switcher & Fullscreen Button Header Bar */}
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-[1200] flex items-center gap-1.5 pointer-events-auto">
        
        {/* Mode Selector Tabs */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.25)] flex items-center gap-1">
          <button
            onClick={() => setMapMode('google-navigation')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              mapMode === 'google-navigation'
                ? 'bg-[#1a73e8] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Navigation size={13} className={mapMode === 'google-navigation' ? 'text-white' : 'text-[#1a73e8]'} />
            <span className="hidden xs:inline sm:inline">{routeLabel}</span>
            <span className="inline xs:hidden sm:hidden">{routeLabel}</span>
          </button>

          <button
            onClick={() => setMapMode('pagasa')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              mapMode === 'pagasa'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert size={13} className={mapMode === 'pagasa' ? 'text-white' : 'text-rose-500'} />
            <span className="hidden xs:inline sm:inline">{trackLabel}</span>
            <span className="inline xs:hidden sm:hidden">{trackLabel}</span>
          </button>
        </div>

        {/* Fullscreen Expansion Button */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title={isExpanded ? 'Exit Fullscreen' : 'Expand Map'}
            className="p-1.5 sm:p-2 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-md transition-colors"
          >
            {isExpanded ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        )}
      </div>

      {/* Map Content View */}
      <div className="w-full h-full flex-1 relative">
        {mapMode === 'google-navigation' ? (
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-300">Loading Route Map…</div>}>
            <GoogleNavigationMap
              currentLocation={{ lat, lng: lon, name, country }}
              isExpanded={isExpanded}
              settings={settings}
            />
          </Suspense>
        ) : (
          <PagasaTyphoonMap
            lat={lat}
            lon={lon}
            name={name}
            isExpanded={isExpanded}
            settings={settings}
          />
        )}
      </div>
    </div>
  );
}
