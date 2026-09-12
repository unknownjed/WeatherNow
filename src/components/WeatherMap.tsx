import React, { Suspense, useState } from 'react';
import { Navigation, CloudRain, Maximize, Minimize, Compass, ShieldAlert } from 'lucide-react';
import { AppSettings } from '../lib/api';
import { getMapUiLabels } from '../lib/uiLabels';

function RouteMapUnavailable({ language = 'en' }: { language?: string }) {
  const ui = getMapUiLabels(language);
  return <div className="flex h-full min-h-[350px] w-full items-center justify-center bg-slate-100 px-6 text-center text-sm font-semibold text-slate-800 dark:bg-slate-950 dark:text-slate-200">{ui.routeMapUnavailable}</div>;
}

const GoogleNavigationMap = React.lazy(() => import('./GoogleNavigationMap')
  .then((module) => ({ default: module.GoogleNavigationMap }))
  .catch((error) => {
    console.error('Route Map failed to load.', error);
    return { default: RouteMapUnavailable };
  }));

const PagasaTyphoonMap = React.lazy(() => import('./PagasaTyphoonMap')
  .then((module) => ({ default: module.PagasaTyphoonMap })));

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
  const ui = getMapUiLabels(settings?.language || 'en');
  const routeLabel = ui.routeMap;
  const trackLabel = ui.weatherTrack;

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
            title={isExpanded ? ui.exitFullscreen : ui.expandMap}
            className="p-1.5 sm:p-2 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-md transition-colors"
          >
            {isExpanded ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        )}
      </div>

      {/* Map Content View */}
      <div className="w-full h-full flex-1 relative">
        {mapMode === 'google-navigation' ? (
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-300">{ui.loadingRouteMap}</div>}>
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
            country={country}
            isExpanded={isExpanded}
            settings={settings}
          />
        )}
      </div>
    </div>
  );
}
