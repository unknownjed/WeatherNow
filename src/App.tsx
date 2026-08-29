import React, { useEffect, useState, useRef } from 'react';
import { Search, MapPin, Wind, Droplets, Thermometer, AlertTriangle, Calendar, Clock, Settings, CloudRain, Maximize, Minimize, CalendarDays, LogOut, Video, Newspaper, CloudSun, LocateFixed, Download, X } from 'lucide-react';
import { getWeatherData, getHistoricalData, searchLocations, reverseGeocode, Location, getWeatherDescription, AppSettings, defaultSettings } from './lib/api';
import { initAuth, googleSignIn, logout, getAccessToken, CalendarUser } from './lib/auth';
import { getUpcomingEvents, getGoogleCalendarSources, getHolidayCalendarId, CalendarEvent } from './lib/calendar';
import { WeatherIcon } from './components/WeatherIcon';
import { WeatherChart } from './components/WeatherChart';
import { HistoricalChart } from './components/HistoricalChart';
import { FiveDayForecast } from './components/FiveDayForecast';
import { HourlyForecast } from './components/HourlyForecast';
import { WeatherMap } from './components/WeatherMap';
import { NewsFeed } from './components/NewsFeed';
import { useTranslation, getDateLocale } from './lib/i18n';
import { SettingsPanel } from './components/SettingsPanel';
import { WeatherForecaster } from './components/WeatherForecaster';
import { AppLogo } from './components/AppLogo';
import { MusicWidget } from './components/MusicWidget';
import { format } from 'date-fns';

export default function App() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [location, setLocation] = useState<Location>(() => {
    try {
      const savedLocation = localStorage.getItem('weathernow_last_location');
      if (savedLocation) return JSON.parse(savedLocation) as Location;
    } catch (error) {
      console.warn('Could not restore the last WeatherNow location:', error);
    }
    return {
      id: 5128581,
      name: "New York",
      latitude: 40.71427,
      longitude: -74.00597,
      country: "United States",
      admin1: "New York",
      timezone: "America/New_York"
    };
  });

  const [weather, setWeather] = useState<any>(null);
  const [historical, setHistorical] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).__weatherNowInstallPrompt ?? null);
  const [isInstalled, setIsInstalled] = useState(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const installIsAvailable = Boolean((window as any).__weatherNowInstallPrompt);
    return Boolean(isStandalone || (!installIsAvailable && localStorage.getItem('weathernow_app_installed') === 'true'));
  });
  const [installDismissed, setInstallDismissed] = useState(() => {
    return localStorage.getItem('weathernow_install_dismissed') === 'true';
  });

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        (window as any).__weatherNowInstallPrompt = null;
        setDeferredPrompt(null);

        if (choice?.outcome === 'accepted') {
          localStorage.setItem('weathernow_app_installed', 'true');
          setIsInstalled(true);
        } else {
          localStorage.removeItem('weathernow_app_installed');
          setIsInstalled(false);
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
      return;
    }

    if (isInstalled) {
      window.alert('App Installed\n\nWeatherNow is already installed on this device.');
      return;
    }

    if (window.self !== window.top) {
      window.open(window.location.origin, '_blank');
      return;
    }

    window.alert('Install App is not available yet. Reload WeatherNow in Microsoft Edge and try again.');
  };
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const capturedPrompt = (window as any).__weatherNowInstallPrompt ?? null;

    if (isStandalone) {
      localStorage.setItem('weathernow_app_installed', 'true');
      setIsInstalled(true);
    } else if (capturedPrompt) {
      localStorage.removeItem('weathernow_app_installed');
      setIsInstalled(false);
      setDeferredPrompt(capturedPrompt);
    }

    const handler = (e: any) => {
      e.preventDefault();
      (window as any).__weatherNowInstallPrompt = e;
      localStorage.removeItem('weathernow_app_installed');
      setIsInstalled(false);
      setDeferredPrompt(e);
    };
    const readyHandler = () => {
      const prompt = (window as any).__weatherNowInstallPrompt ?? null;
      if (prompt) {
        localStorage.removeItem('weathernow_app_installed');
        setIsInstalled(false);
        setDeferredPrompt(prompt);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('weathernow-install-ready', readyHandler);

    const appInstalledHandler = () => {
      localStorage.setItem('weathernow_app_installed', 'true');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('weathernow-install-ready', readyHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);


  // Auth and Calendar State
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CalendarUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarSources, setCalendarSources] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'news' | 'settings'>('dashboard');

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('weathernow_settings');
      const savedSettings = saved ? JSON.parse(saved) : {};
      const dedicatedLocations = localStorage.getItem('weathernow_saved_locations');
      const parsedLocations = dedicatedLocations ? JSON.parse(dedicatedLocations) : savedSettings.savedLocations;
      return {
        ...defaultSettings,
        ...savedSettings,
        savedLocations: Array.isArray(parsedLocations) ? parsedLocations : [],
      };
    } catch (error) {
      console.warn('Could not restore WeatherNow settings:', error);
      return { ...defaultSettings, savedLocations: [] };
    }
  });

  const t = useTranslation(settings.language);

  useEffect(() => {
    const updateConnectivity = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnectivity);
    window.addEventListener('offline', updateConnectivity);
    return () => {
      window.removeEventListener('online', updateConnectivity);
      window.removeEventListener('offline', updateConnectivity);
    };
  }, []);

  useEffect(() => {
    const siteTitle = settings.appName?.trim() || 'WeatherNow';
    document.title = `${siteTitle} - Live Weather & Forecast`;
  }, [settings.appName]);

  // Single-window instance manager: focus existing window if another tab or shortcut launches
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('weathernow_single_instance');
      
      // Announce this instance or respond to new opens
      channel.onmessage = (event) => {
        if (event.data === 'NEW_INSTANCE_OPENED') {
          // Bring existing window/tab into focus
          window.focus();
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'FOCUS_WINDOW' });
          }
        }
      };

      // Notify other instances on open
      channel.postMessage('NEW_INSTANCE_OPENED');

      return () => {
        channel.close();
      };
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('weathernow_settings', JSON.stringify(settings));
    localStorage.setItem('weathernow_saved_locations', JSON.stringify(settings.savedLocations || []));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('weathernow_last_location', JSON.stringify(location));
  }, [location]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setNeedsAuth(false);
        setUser(currentUser);
        setToken(currentToken);
        getUpcomingEvents(currentToken).then(setCalendarEvents);
        getGoogleCalendarSources(currentToken, currentUser.email).then(setCalendarSources);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setToken(null);
        setCalendarEvents([]);
        setCalendarSources([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!navigator.onLine) {
      setLoginError('Google Calendar cannot be connected while offline. Reconnect this device to the internet and try again.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        const events = await getUpcomingEvents(result.accessToken);
        setCalendarEvents(events);
        setCalendarSources(await getGoogleCalendarSources(result.accessToken, result.user.email));
      }
    } catch (err) {
      console.error('Login failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown sign-in error';
      setLoginError(`Google Calendar sign-in failed: ${message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setCalendarEvents([]);
    setCalendarSources([]);
    setNeedsAuth(true);
  };

  // Helper to compute dynamic background theme for the Current Weather tile
  const getWeatherTileTheme = (code?: number, isDay: number = 1) => {
    if (code === undefined) {
      return {
        card: "bg-sky-50 dark:bg-slate-900 border-sky-200 dark:border-slate-800",
        pill: "bg-sky-200/50 dark:bg-slate-800/50 border-sky-300/50 dark:border-slate-700/50"
      };
    }
    const isNight = Number(isDay) === 0;

    if (isNight && (code === 0 || code === 1)) {
      return {
        card: "bg-gradient-to-br from-indigo-950/85 via-slate-900/90 to-blue-950/80 border-indigo-500/30 dark:border-indigo-500/40",
        pill: "bg-slate-900/60 dark:bg-slate-900/70 border-indigo-500/30 dark:border-indigo-500/40"
      };
    }

    if (code === 0 || code === 1) { // Clear / Sunny
      return {
        card: "bg-gradient-to-br from-amber-200/70 via-sky-100/75 to-blue-100/70 dark:from-amber-950/45 dark:via-slate-900 dark:to-sky-950/60 border-amber-300/60 dark:border-amber-500/30",
        pill: "bg-white/60 dark:bg-slate-900/65 border-amber-300/40 dark:border-slate-700/60"
      };
    }

    if (code === 2) { // Partly Cloudy
      return {
        card: "bg-gradient-to-br from-sky-200/70 via-blue-100/70 to-slate-100/80 dark:from-sky-950/55 dark:via-slate-900 dark:to-slate-800/65 border-sky-300/60 dark:border-sky-700/40",
        pill: "bg-white/60 dark:bg-slate-900/65 border-sky-300/40 dark:border-slate-700/60"
      };
    }

    if (code === 3) { // Overcast
      return {
        card: "bg-gradient-to-br from-slate-200/80 via-slate-100/85 to-blue-100/70 dark:from-slate-800/85 dark:via-slate-900 dark:to-slate-800/70 border-slate-300/70 dark:border-slate-700/50",
        pill: "bg-white/60 dark:bg-slate-900/65 border-slate-300/50 dark:border-slate-700/60"
      };
    }

    if (code === 45 || code === 48) { // Fog
      return {
        card: "bg-gradient-to-br from-slate-200/80 via-sky-100/80 to-slate-200/70 dark:from-slate-850 dark:via-slate-900 dark:to-slate-800/70 border-slate-300/70 dark:border-slate-700/50",
        pill: "bg-white/60 dark:bg-slate-900/65 border-slate-300/50 dark:border-slate-700/60"
      };
    }

    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) { // Rain
      return {
        card: "bg-gradient-to-br from-cyan-200/70 via-blue-100/75 to-slate-200/80 dark:from-cyan-950/60 dark:via-slate-900 dark:to-blue-950/70 border-cyan-300/60 dark:border-cyan-700/40",
        pill: "bg-white/60 dark:bg-slate-900/65 border-cyan-300/40 dark:border-slate-700/60"
      };
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) { // Snow
      return {
        card: "bg-gradient-to-br from-blue-100/85 via-indigo-50/80 to-slate-100/85 dark:from-slate-900 dark:via-indigo-950/50 dark:to-sky-950/60 border-blue-200/70 dark:border-blue-800/40",
        pill: "bg-white/60 dark:bg-slate-900/65 border-blue-200/50 dark:border-slate-700/60"
      };
    }

    if ([95, 96, 99].includes(code)) { // Thunderstorm
      return {
        card: "bg-gradient-to-br from-purple-200/80 via-slate-200/80 to-indigo-200/80 dark:from-purple-950/70 dark:via-slate-900 dark:to-indigo-950/70 border-purple-300/60 dark:border-purple-700/50",
        pill: "bg-white/60 dark:bg-slate-900/65 border-purple-300/40 dark:border-slate-700/60"
      };
    }

    return {
      card: "bg-gradient-to-br from-sky-100/75 via-slate-100/70 to-blue-100/70 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/60 border-sky-200/70 dark:border-slate-800",
      pill: "bg-white/60 dark:bg-slate-900/65 border-sky-300/40 dark:border-slate-700/60"
    };
  };

  // Load weather whenever coordinates or relevant weather units change
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [weatherData, historicalData] = await Promise.all([
          getWeatherData(location.latitude, location.longitude, settings),
          getHistoricalData(location.latitude, location.longitude, settings)
        ]);
        if (!isCancelled) {
          if (weatherData) setWeather(weatherData);
          if (historicalData) setHistorical(historicalData);
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("Error loading weather data:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setIsInitializing(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [location.latitude, location.longitude, settings.tempUnit, settings.windUnit, settings.precipUnit, settings.language]);

  useEffect(() => {
    const handleSearch = async () => {
      if (query.length > 2) {
        const results = await searchLocations(query);
        setSearchResults(results);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    };

    const debounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSyncLocation = () => {
    if (settings.startupLocation === 'saved' && settings.savedLocations && settings.savedLocations.length > 0) {
      setLocation(settings.savedLocations[0]);
      return;
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const offlineGpsLocation: Location = {
            id: Math.round((lat + 90) * 1000000 + (lon + 180) * 1000),
            name: 'Current Location',
            latitude: lat,
            longitude: lon,
            country: navigator.onLine ? 'Locating…' : 'Offline GPS',
            admin1: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto',
          };

          // GPS is available without internet. Apply and persist it immediately;
          // reverse geocoding is only an optional online enhancement.
          setLocation(offlineGpsLocation);
          if (navigator.onLine) {
            const loc = await reverseGeocode(lat, lon);
            if (loc) setLocation(loc);
          }
        },
        (error) => {
          console.log("Geolocation info:", error.message);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    }
  };

  useEffect(() => {
    handleSyncLocation();
  }, []);

  const handleSelectLocation = (loc: Location) => {
    setLocation(loc);
    setQuery('');
    setShowResults(false);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full bg-sky-100 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        {isInitializing && <p className="text-sky-800 dark:text-slate-400 text-sm animate-pulse">{t('locating')}</p>}
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="h-screen w-full bg-sky-100 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <CloudRain size={48} className="text-blue-600 dark:text-blue-400" />
        <h1 className="text-xl font-bold text-sky-950 dark:text-slate-100">Weather data is temporarily unavailable</h1>
        <p className="max-w-md text-sm text-sky-800 dark:text-slate-400">WeatherNow could not reach either the local weather proxy or the direct weather service. Check the internet connection and try again.</p>
        <button onClick={() => window.location.reload()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">Try again</button>
      </div>
    );
  }

  const current = weather.current;
  const weatherDesc = getWeatherDescription(current.weather_code, settings.language);
  const weatherTheme = getWeatherTileTheme(current?.weather_code, current?.is_day);
  
  // Determine if there's severe weather (either current or in the next 1 hour)
  const isCurrentlySevere = weatherDesc.severe;
  const severeForecastIndex = weather.hourly.time.findIndex((t: string, i: number) => {
    const forecastTime = new Date(t);
    const now = new Date();
    // Only check forecasts that are in the future but within the next 1 hour (3600000 ms)
    if (forecastTime < now || forecastTime > new Date(now.getTime() + 3600000)) return false;
    return getWeatherDescription(weather.hourly.weather_code[i], settings.language).severe;
  });
  const upcomingSevere = severeForecastIndex !== -1;
  const hasAlert = (isCurrentlySevere || upcomingSevere) && settings.severeAlerts !== false;
  const alertDesc = isCurrentlySevere 
    ? `Severe weather warning: ${weatherDesc.text}` 
    : (upcomingSevere ? `Upcoming severe weather: ${getWeatherDescription(weather.hourly.weather_code[severeForecastIndex], settings.language).text}` : null);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-sky-100 dark:bg-slate-950 text-sky-950 dark:text-slate-200 overflow-hidden font-sans select-none">
      <header className="h-14 flex-none bg-sky-50 dark:bg-slate-900 border-b border-sky-200 dark:border-slate-800 flex items-center justify-between px-2 sm:px-6 z-[9999] relative overflow-visible">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left">
            <AppLogo size={32} />
            <h1 className="font-bold text-lg tracking-tight hidden xl:block truncate max-w-[220px]">
              {settings.appName?.trim() || 'WeatherNow'}
            </h1>
          </button>
          <div className="hidden sm:block h-4 w-px bg-slate-700 mx-0"></div>
          <div className="hidden md:flex min-w-0 items-center gap-1 lg:gap-1.5 font-medium">
            <span className="truncate max-w-[85px] lg:max-w-[120px] xl:max-w-[200px] text-[10px] lg:text-xs xl:text-sm">{location.name}, {location.country}</span>
            <span className="xl:hidden flex-none text-[9px] bg-sky-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sky-800 dark:text-slate-400 border border-sky-300 dark:border-slate-700 font-mono whitespace-nowrap">
              {location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°
            </span>
            <span className="hidden xl:block text-[10px] bg-sky-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sky-800 dark:text-slate-400 border border-sky-300 dark:border-slate-700 font-mono whitespace-nowrap">
              {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-4 lg:gap-6 min-w-0">
          <div className="relative w-24 sm:w-40 md:w-44 lg:w-52 xl:w-72 flex items-center gap-2 flex-shrink z-[10000] max-sm:absolute max-sm:left-11 max-sm:right-[172px] max-sm:w-auto" ref={searchRef}>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-800 dark:text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search cities..." 
                className="w-full pl-8 pr-3 py-1.5 !bg-white dark:!bg-slate-950 border border-sky-200 dark:border-slate-800 rounded-lg text-xs text-sky-950 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white focus:shadow-none dark:focus:border-indigo-500 dark:focus:ring-1 dark:focus:ring-indigo-500 transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if(query.length > 2) setShowResults(true) }}
              />
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="header-city-results absolute top-full right-0 mt-2 w-72 max-sm:left-0 max-sm:right-auto max-sm:w-[calc(100vw-1rem)] sm:w-80 md:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-sky-300 dark:border-slate-700 overflow-y-auto overflow-x-hidden z-[10001] max-h-80 divide-y divide-sky-100 dark:divide-slate-800">
                {searchResults.map((res) => (
                  <button 
                    key={res.id} 
                    className="w-full text-left px-3.5 py-2.5 hover:bg-sky-100 dark:hover:bg-slate-800 flex flex-col transition-colors cursor-pointer group"
                    onClick={() => handleSelectLocation(res)}
                  >
                    <span className="font-semibold text-sky-950 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{res.name}</span>
                    <span className="text-[11px] text-sky-700 dark:text-slate-400">{res.admin1 ? `${res.admin1}, ` : ''}{res.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            <div className="relative">
              <button
                id="header-install-app-btn"
                onClick={handleInstallClick}
                className={`install-app-button flex items-center gap-1.5 px-1.5 sm:px-2.5 py-1 text-xs font-semibold text-white rounded-md transition-all shadow-sm flex-shrink-0 ${isInstalled ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/25' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25'}`}
                title={isInstalled ? 'WeatherNow is already installed' : 'Install WeatherNow on Microsoft Edge or Desktop'}
              >
                <Download size={13} />
                <span className="hidden sm:inline">{isInstalled ? 'App Installed' : 'Install App'}</span>
                <span className="sm:hidden">{isInstalled ? 'Installed' : 'Install'}</span>
              </button>
            </div>
            {user && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-950 px-2 py-1 rounded-lg border border-sky-200 dark:border-slate-800 flex-shrink-0">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-5 h-5 rounded-full" />
                <button onClick={handleLogout} className="text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200 cursor-pointer hidden sm:block" title="Sign out">
                  <LogOut size={14} />
                </button>
              </div>
            )}
            {loading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-500 flex-shrink-0 mx-1"></div>}
            <div className="text-right ml-1 sm:ml-2 flex-shrink-0">
              <div className="block text-[7px] sm:text-[10px] lg:text-xs text-sky-800 dark:text-slate-400 uppercase tracking-widest font-bold whitespace-nowrap">{format(new Date(), 'dd MMM yyyy', { locale: getDateLocale(settings.language) })}</div>
              <div className="text-[9px] sm:text-xs lg:text-sm font-mono text-indigo-600 dark:text-indigo-300 whitespace-nowrap">{format(new Date(), settings.timeFormat === '24h' ? 'HH:mm' : 'hh:mm a')}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden min-h-0">
        <aside className="desktop-sidebar-nav hidden md:flex w-14 flex-none bg-sky-50 dark:bg-slate-900 border-r border-sky-200 dark:border-slate-800 flex-col items-center py-6 gap-6 z-10">
          <div onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300'}`}><CloudSun size={20} /></div>
          <div onClick={() => setActiveTab('news')} className={`p-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'news' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300'}`}><Newspaper size={20} /></div>
          <div onClick={() => setActiveTab('calendar')} className={`p-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'calendar' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300'}`}><Calendar size={20} /></div>
          <div onClick={() => setActiveTab('settings')} className={`mt-auto p-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'settings' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300'}`}><Settings size={20} /></div>
        </aside>
        
        <>
          <section style={{ display: activeTab === 'dashboard' ? undefined : 'none' }} className="flex-1 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto">
            {/* Microsoft Edge & Desktop App Install Banner */}
            {!isInstalled && !installDismissed && (
              <div className="col-span-1 lg:col-span-12 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-md shadow-indigo-500/5 relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 flex-shrink-0">
                      <Download size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-sky-950 dark:text-slate-100">Install WeatherNow on Microsoft Edge</h3>
                        <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">Edge App</span>
                      </div>
                      <p className="text-xs text-sky-800 dark:text-slate-400 mt-0.5">
                        Install directly to your Windows/Mac taskbar for one-click access, instant offline forecast caching & desktop alerts.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <button
                      id="banner-install-app-btn"
                      onClick={handleInstallClick}
                      className="install-app-button px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      Install App
                    </button>
                    <button
                      onClick={() => {
                        setInstallDismissed(true);
                        localStorage.setItem('weathernow_install_dismissed', 'true');
                      }}
                      className="p-2 text-sky-700 dark:text-slate-400 hover:text-sky-900 dark:hover:text-slate-200 rounded-lg hover:bg-sky-200/50 dark:hover:bg-slate-800/50 transition-colors"
                      title="Dismiss"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {hasAlert && (
              <div className="col-span-1 lg:col-span-12 bg-red-600 dark:bg-red-950/30 border border-red-700 dark:border-red-500/30 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-white dark:text-red-400 text-xs uppercase tracking-widest font-bold">
                  <AlertTriangle size={14} />
                  WEATHER ALERT
                </div>
                <p className="text-white dark:text-red-300 text-sm">{alertDesc}</p>
              </div>
            )}

            {/* LEFT COLUMN: Map & Current Weather */}
            <div className="col-span-1 lg:col-span-7 flex flex-col gap-4 lg:h-full">
              {/* Current Weather Module */}
              <div 
                className={`current-weather-tile ${weatherTheme.card} border rounded-xl p-5 flex flex-col justify-between relative overflow-visible shadow-sm min-h-[290px] flex-none cursor-pointer`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest && !target.closest('button')) {
                    document.getElementById('weather-forecaster-btn')?.click();
                  }
                }}
              >
                {/* Animated Background Decorative Weather Scene Icon */}
                {current && (
                  <div className="absolute -top-4 -right-4 sm:top-1 sm:right-1 opacity-25 dark:opacity-20 pointer-events-none">
                    <WeatherIcon code={current.weather_code} isDay={current.is_day} className="w-48 h-48 sm:w-56 sm:h-56 -mr-4 -mt-4" />
                  </div>
                )}

                {current ? (
                  <>
                    <div className="z-10">
                      <div className="text-sky-800 dark:text-slate-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-1 flex items-center justify-between">
                        <span>{t('currently')}</span>
                        <div className="flex items-center gap-2">
                          <span className="max-w-[180px] truncate text-indigo-600 dark:text-indigo-400 font-semibold" title={location.name}>{location.name}</span>
                          <WeatherForecaster 
                            language={settings.language}
                            locationName={location.name}
                            temperature={current.temperature_2m}
                            description={weatherDesc.text}
                            feelsLike={current.apparent_temperature}
                            humidity={current.relative_humidity_2m}
                            windSpeed={current.wind_speed_10m}
                            high={weather.daily?.temperature_2m_max?.[0]}
                            low={weather.daily?.temperature_2m_min?.[0]}
                            currentCode={current.weather_code}
                            tomorrowHigh={weather.daily?.temperature_2m_max?.[1]}
                            tomorrowLow={weather.daily?.temperature_2m_min?.[1]}
                            tomorrowCode={weather.daily?.weather_code?.[1]}
                            hourlyData={weather.hourly}
                            tempUnit={settings.tempUnit}
                            autoSpeak={settings.autoSpeak}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-7xl sm:text-8xl font-thin tracking-tighter text-sky-950 dark:text-white">
                          {Math.round(current.temperature_2m)}<span className="text-4xl font-light text-indigo-600 dark:text-indigo-400">°</span>
                        </div>
                        <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-2xl backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-sm flex items-center justify-center">
                          <WeatherIcon code={current.weather_code} isDay={current.is_day} className="w-20 h-20 sm:w-24 sm:h-24" />
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl font-semibold text-sky-950 dark:text-slate-100 mt-2 tracking-wide">{weatherDesc.text}</div>
                    </div>
                    
                    <div className="flex gap-3 mt-6 z-10">
                      <div className={`current-weather-detail-tile flex-1 ${weatherTheme.pill} backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col gap-1 shadow-sm`}>
                        <div className="text-xs text-sky-800 dark:text-slate-400 uppercase font-bold tracking-wider">{t('humidity')}</div>
                        <div className="text-base sm:text-lg font-semibold font-mono text-sky-950 dark:text-slate-200">{current.relative_humidity_2m}%</div>
                      </div>
                      <div className={`current-weather-detail-tile flex-1 ${weatherTheme.pill} backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col gap-1 shadow-sm`}>
                        <div className="text-xs text-sky-800 dark:text-slate-400 uppercase font-bold tracking-wider">{t('wind')}</div>
                        <div className="text-base sm:text-lg font-semibold font-mono text-sky-950 dark:text-slate-200">{current.wind_speed_10m} <span className="text-xs">{settings.windUnit === 'mph' ? t('mph') : t('kmh')}</span></div>
                      </div>
                      <div className={`current-weather-detail-tile flex-1 ${weatherTheme.pill} backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col gap-1 shadow-sm`}>
                        <div className="text-xs text-sky-800 dark:text-slate-400 uppercase font-bold tracking-wider">{t('feelsLike')}</div>
                        <div className="text-base sm:text-lg font-semibold font-mono text-sky-950 dark:text-slate-200">{Math.round(current.apparent_temperature)}°</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-sky-800 dark:text-slate-400">
                    <AlertTriangle size={32} className="mb-2 opacity-50" />
                    <p className="text-sm text-center">{t('failedToLoadWeather')}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-sky-200 dark:bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-sky-900 dark:text-slate-300 transition-colors">{t('retry')}</button>
                  </div>
                )}
              </div>

              {/* Map Module (PAGASA Typhoon Tracker & Google Navigation) */}
              {isMapFullscreen && (
                <div className="fixed inset-0 bg-sky-100/80 dark:bg-slate-950/80 backdrop-blur-sm z-[20000]" onClick={() => setIsMapFullscreen(false)} />
              )}
              <div className={`bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-1 sm:p-2 flex flex-col shadow-inner transition-all duration-300 flex-1 ${isMapFullscreen ? 'fixed inset-2 sm:inset-6 z-[20001] min-h-0' : 'relative overflow-hidden min-h-[420px]'}`}>
                <div className={`flex-1 relative rounded-lg overflow-hidden border border-sky-200 dark:border-slate-800 w-full h-full ${isMapFullscreen ? 'min-h-0' : 'min-h-[380px]'}`}>
                  <WeatherMap lat={location.latitude} lon={location.longitude} name={location.name} country={location.country} isExpanded={isMapFullscreen} onToggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)} settings={settings} />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 24h Hourly, 24h Chart, 5-day */}
            <div className="col-span-1 lg:col-span-5 flex flex-col gap-4 lg:h-full">
              
              {/* 24h Hourly Forecast */}
              <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-5 flex flex-col shadow-inner flex-none h-[180px]">
                <div className="flex items-center justify-between mb-4 flex-none">
                  <h3 className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-sky-800 dark:text-slate-400 flex items-center gap-2">
                    <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
                    {t('hourlyForecast')}
                  </h3>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  {weather?.hourly ? <HourlyForecast data={weather.hourly} current={weather.current} settings={settings} /> : <div className="absolute inset-0 flex items-center justify-center text-sky-800 dark:text-slate-400 text-sm">{t('dataUnavailable')}</div>}
                </div>
              </div>

              {/* 24h Forecast Module */}
              <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-5 flex flex-col shadow-inner overflow-hidden flex-1 min-h-[200px]">
                <div className="flex items-center justify-between mb-4 flex-none">
                  <h3 className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-sky-800 dark:text-slate-400 flex items-center gap-2">
                    <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
                    {t('hourTempTrend')}
                  </h3>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  {weather?.hourly ? <WeatherChart data={weather.hourly} settings={settings} /> : <div className="absolute inset-0 flex items-center justify-center text-sky-800 dark:text-slate-400 text-sm">{t('dataUnavailable')}</div>}
                </div>
              </div>

              {/* 5-Day Forecast Module */}
              <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden flex-none min-h-[160px] md:min-h-[180px]">
                <div className="flex items-center justify-between mb-4 flex-none">
                  <h3 className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-sky-800 dark:text-slate-400 flex items-center gap-2">
                    <Calendar size={12} className="text-indigo-600 dark:text-indigo-400" />
                    {t('fiveDayForecast')}
                  </h3>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  {weather?.daily ? <FiveDayForecast data={weather.daily} settings={settings} /> : <div className="absolute inset-0 flex items-center justify-center text-sky-800 dark:text-slate-400 text-sm">{t('dataUnavailable')}</div>}
                </div>
              </div>

              <MusicWidget language={settings.language} />

            </div>
          </section>
        {activeTab === 'calendar' ? (
          <section className="flex-1 relative bg-sky-100 dark:bg-slate-950 overflow-hidden">
            {user && isOnline ? (
              <iframe
                src={`https://calendar.google.com/calendar/embed?wkst=1&bgcolor=%230f172a&mode=MONTH${Array.from(new Set([...(calendarSources.length ? calendarSources : [user.email]), getHolidayCalendarId(location.country)]).values()).filter(Boolean).map(source => `&src=${encodeURIComponent(source as string)}`).join('')}`}
                style={{ borderWidth: 0 }}
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                title="Google Calendar"
              ></iframe>
            ) : user && !isOnline ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <CalendarDays size={48} className="text-sky-700 dark:text-slate-600 mb-4" />
                <h2 className="text-xl font-bold text-sky-950 dark:text-slate-200 mb-2">Google Calendar is offline</h2>
                <p className="text-sky-800 dark:text-slate-400 max-w-md">Reconnect to the internet to refresh and display your Google Calendar.</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <CalendarDays size={48} className="text-slate-700 mb-4" />
                <h2 className="text-xl font-bold text-sky-950 dark:text-slate-200 mb-2">{t('connectCalendar')}</h2>
                <p className="text-sky-800 dark:text-slate-400 max-w-md mb-6">{t('connectCalendarTab')}</p>
                <button disabled={isLoggingIn} onClick={handleLogin} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-wait text-white font-medium py-2 px-6 rounded-lg transition-colors">
                  {isLoggingIn ? 'Connecting…' : 'Connect Google Calendar'}
                </button>
                {loginError && (
                  <div role="alert" className="mt-4 max-w-xl rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                    {loginError}
                  </div>
                )}
              </div>
            )}
          </section>
        ) : activeTab === 'news' ? (
          <NewsFeed locationName={location.name} country={location.country} language={settings.language} />
        ) : activeTab === 'settings' ? (
          <SettingsPanel 
            deferredPrompt={deferredPrompt}
            setDeferredPrompt={setDeferredPrompt}
            isInstalled={isInstalled}
            setIsInstalled={setIsInstalled}
            settings={settings} 
            setSettings={setSettings} 
            user={user} 
            onLogin={handleLogin} 
            onLogout={handleLogout} 
            currentLocation={location} 
          />
        ) : null}
        </>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav md:hidden flex-none bg-sky-50 dark:bg-slate-900 border-t border-sky-200 dark:border-slate-800 flex justify-around items-center h-16 z-20 pb-safe">
        <button style={settings.theme === 'dark' ? { color: '#fff' } : undefined} onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-sky-800 dark:text-slate-400 hover:text-sky-800 dark:text-slate-400'}`}>
          <CloudSun size={20} />
          <span className="text-[10px] font-medium tracking-wider uppercase">{t('dashboard')}</span>
        </button>
        <button style={settings.theme === 'dark' ? { color: '#fff' } : undefined} onClick={() => setActiveTab('news')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'news' ? 'text-indigo-600 dark:text-indigo-400' : 'text-sky-800 dark:text-slate-400 hover:text-sky-800 dark:text-slate-400'}`}>
          <Newspaper size={20} />
          <span className="text-[10px] font-medium tracking-wider uppercase">{t('news')}</span>
        </button>
        <button style={settings.theme === 'dark' ? { color: '#fff' } : undefined} onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'calendar' ? 'text-indigo-600 dark:text-indigo-400' : 'text-sky-800 dark:text-slate-400 hover:text-sky-800 dark:text-slate-400'}`}>
          <Calendar size={20} />
          <span className="text-[10px] font-medium tracking-wider uppercase">{t('calendar')}</span>
        </button>
        <button style={settings.theme === 'dark' ? { color: '#fff' } : undefined} onClick={() => setActiveTab('settings')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-sky-800 dark:text-slate-400 hover:text-sky-800 dark:text-slate-400'}`}>
          <Settings size={20} />
          <span className="text-[10px] font-medium tracking-wider uppercase">{t('settings')}</span>
        </button>
      </nav>
      
      <footer className="hidden md:flex h-8 flex-none bg-sky-50 dark:bg-slate-900 border-t border-sky-200 dark:border-slate-800 items-center justify-between px-6 z-20">
        <div className="flex gap-6 text-[9px] text-sky-800 dark:text-slate-400 uppercase tracking-widest font-bold">
          <span>{t('station')}: REK-09-ALPHA</span>
          <span>{t('uptime')}: 99.98%</span>
          <span>{t('source')}: Open-Meteo</span>
        </div>
        <div className="text-[9px] text-indigo-600 dark:text-indigo-400/80 uppercase font-bold tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          SYSTEM ONLINE
        </div>
      </footer>
    </div>
  );
}
