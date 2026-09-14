import React, { useEffect, useState, useRef } from 'react';
import { Search, MapPin, Wind, Droplets, Thermometer, AlertTriangle, Calendar, Clock, Settings, CloudRain, Maximize, Minimize, CalendarDays, LogOut, Video, Newspaper, CloudSun, LocateFixed, Download, X, Music2 } from 'lucide-react';
import { getWeatherData, getHistoricalData, searchLocations, reverseGeocode, Location, getWeatherDescription, AppSettings, defaultSettings } from './lib/api';
import { getUiLabels, getMapUiLabels, translatePagasaOutlookText } from './lib/uiLabels';
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
import { EnvironmentalPanels } from './components/EnvironmentalPanels';
import { WeatherJournal } from './components/WeatherJournal';
import { format } from 'date-fns';
import { listEvents } from './lib/googleCalendarApi';
import GoogleCalendarPanel from './components/GoogleCalendarPanel';
import { InstallAppDialog } from './components/InstallAppDialog';
import type { CalendarAgendaItem } from './lib/calendarAgenda';
import { createOverlayBack } from './lib/overlayBack';
import { isPhilippineLocation } from './lib/forecastSource';

const isStandaloneWindow = () => Boolean(
  window.matchMedia('(display-mode: standalone)').matches
  || (window.navigator as any).standalone
  || window.matchMedia('(display-mode: fullscreen)').matches
  || window.matchMedia('(display-mode: minimal-ui)').matches
);

const MUSIC_NAV_LABELS: Record<string, string> = {
  en: 'Music', es: 'Música', fr: 'Musique', de: 'Musik', it: 'Musica', pt: 'Música',
  ja: '音楽', ko: '음악', zh: '音乐', hi: 'संगीत', ru: 'Музыка', ar: 'الموسيقى',
};

async function detectInstalledApp(): Promise<boolean> {
  if (isStandaloneWindow()) return true;
  const getInstalledRelatedApps = (navigator as any).getInstalledRelatedApps;
  if (typeof getInstalledRelatedApps !== 'function') return false;
  try {
    const apps = await getInstalledRelatedApps.call(navigator);
    return Array.isArray(apps) && apps.some((app: any) => app?.platform === 'webapp' || app?.url === window.location.origin);
  } catch {
    return false;
  }
}

export default function App() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const [citySearchError, setCitySearchError] = useState(false);
  const citySearchCache = useRef(new Map<string, Location[]>());
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [musicOverlayOpen, setMusicOverlayOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicSessionActive, setMusicSessionActive] = useState(false);
  const [forecasterSpeaking, setForecasterSpeaking] = useState(false);
  const musicOverlayBack = useRef<ReturnType<typeof createOverlayBack> | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'news' | 'settings'>('dashboard');
  const [isHeaderLogoutConfirmOpen, setIsHeaderLogoutConfirmOpen] = useState(false);
  useEffect(() => {
    const onMusicState = (event: Event) => {
      const detail = (event as CustomEvent<{
        playing?: boolean;
        paused?: boolean;
        stopped?: boolean;
        source?: string;
      }>).detail ?? {};

      const playing = Boolean(detail.playing);
      setMusicPlaying(playing);

      if (detail.stopped) {
        setMusicSessionActive(false);
      } else if (playing || detail.paused || detail.source) {
        setMusicSessionActive(true);
      }
    };
    const onForecasterState = (event: Event) => setForecasterSpeaking(Boolean((event as CustomEvent<{ speaking?: boolean }>).detail?.speaking));
    window.addEventListener('weathernow:music-state', onMusicState);
    window.addEventListener('weathernow:forecaster-state', onForecasterState);
    return () => {
      window.removeEventListener('weathernow:music-state', onMusicState);
      window.removeEventListener('weathernow:forecaster-state', onForecasterState);
    };
  }, []);
  useEffect(() => {
    const manager = createOverlayBack(window);
    musicOverlayBack.current = manager;
    return () => { manager.dispose(); musicOverlayBack.current = null; };
  }, []);

  const isMusicBackEnabled = () => window.matchMedia('(max-width: 1199px)').matches;
  const closeMusicOverlay = () => {
    if (!musicOverlayOpen) return;
    if (isMusicBackEnabled()) musicOverlayBack.current?.closeTop();
    else setMusicOverlayOpen(false);
  };
  const toggleMusicOverlay = () => {
    if (musicOverlayOpen) {
      closeMusicOverlay();
      return;
    }
    if (isMusicBackEnabled()) {
      if (musicOverlayBack.current?.open(() => setMusicOverlayOpen(false))) setMusicOverlayOpen(true);
      return;
    }
    setMusicOverlayOpen(true);
  };

  useEffect(() => {
    if (activeTab !== 'dashboard') closeMusicOverlay();
  }, [activeTab]);
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

  const [weather, setWeather] = useState<any>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('weathernow_weather_cache') || 'null');
      const matchesLocation = cached?.data
        && Math.abs(cached.lat - location.latitude) < 0.1
        && Math.abs(cached.lon - location.longitude) < 0.1;
      if (matchesLocation && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000) return cached.data;
    } catch {}
    return null;
  });
  const [historical, setHistorical] = useState<any>(null);
  const [marineConditions, setMarineConditions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(() => !weather);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).__weatherNowInstallPrompt ?? null);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    const isStandalone = isStandaloneWindow();
    const installIsAvailable = Boolean((window as any).__weatherNowInstallPrompt);
    return Boolean(isStandalone || (!installIsAvailable && localStorage.getItem('weathernow_app_installed') === 'true'));
  });
  const [installDismissed, setInstallDismissed] = useState(() => {
    return localStorage.getItem('weathernow_install_dismissed') === 'true';
  });

  const handleInstallClick = () => {
    setInstallDialogOpen(true);
  };
  useEffect(() => {
    const isStandalone = isStandaloneWindow();
    const capturedPrompt = (window as any).__weatherNowInstallPrompt ?? null;

    detectInstalledApp().then((installed) => {
      if (!installed) {
        // A browser that cannot detect installed apps has no negative evidence.
        return;
      }
      localStorage.setItem('weathernow_app_installed', 'true');
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__weatherNowInstallPrompt = null;
    });

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
      if (isStandaloneWindow()) return;
      (window as any).__weatherNowInstallPrompt = e;
      localStorage.removeItem('weathernow_app_installed');
      setIsInstalled(false);
      setDeferredPrompt(e);
    };
    const readyHandler = () => {
      if (isStandaloneWindow()) return;
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
      setInstallDialogOpen(true);
      localStorage.setItem('weathernow_app_installed', 'true');
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__weatherNowInstallPrompt = null;
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    const refreshInstallState = () => {
      void detectInstalledApp().then((installed) => {
        if (!installed) {
          return;
        }
        localStorage.setItem('weathernow_app_installed', 'true');
        setIsInstalled(true);
        setDeferredPrompt(null);
        (window as any).__weatherNowInstallPrompt = null;
      });
    };
    const storageHandler = (event: StorageEvent) => {
      if (event.key === 'weathernow_app_installed' && event.newValue === 'true') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        (window as any).__weatherNowInstallPrompt = null;
      }
    };
    window.addEventListener('pageshow', refreshInstallState);
    window.addEventListener('focus', refreshInstallState);
    document.addEventListener('visibilitychange', refreshInstallState);
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('weathernow-install-ready', readyHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
      window.removeEventListener('pageshow', refreshInstallState);
      window.removeEventListener('focus', refreshInstallState);
      document.removeEventListener('visibilitychange', refreshInstallState);
      window.removeEventListener('storage', storageHandler);
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
  const [journalDates, setJournalDates] = useState<Record<string, number>>({});
  const [calendarAgenda, setCalendarAgenda] = useState<CalendarAgendaItem[]>([]);
  const [calendarAgendaOpen, setCalendarAgendaOpen] = useState(false);
  const [dismissedAgendaDate, setDismissedAgendaDate] = useState<string | null>(null);
  const calendarAgendaBack = useRef<ReturnType<typeof createOverlayBack> | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  useEffect(() => {
    const manager = createOverlayBack(window);
    calendarAgendaBack.current = manager;
    return () => { manager.dispose(); calendarAgendaBack.current = null; };
  }, []);
  const closeCalendarAgenda = () => {
    if (calendarAgendaOpen) calendarAgendaBack.current?.closeTop();
  };
  useEffect(() => {
    if (activeTab !== 'calendar' || !user || calendarAgenda.length === 0) {
      if (calendarAgendaOpen) calendarAgendaBack.current?.closeTop();
      return;
    }
    if (dismissedAgendaDate === calendarDate) return;
    if (!calendarAgendaOpen && calendarAgendaBack.current?.open(() => { setCalendarAgendaOpen(false); setDismissedAgendaDate(calendarDate); })) {
      setCalendarAgendaOpen(true);
    }
  }, [activeTab, user, calendarAgenda, calendarDate, calendarAgendaOpen, dismissedAgendaDate]);
  const [events, setEvents] = useState<any[]>([]); 
  const chooseDate = async (date: string) => {
    // A deliberate day click should always allow that day's agenda popup to open again,
    // even when the user previously closed it for the same date.
    setDismissedAgendaDate(null);
    setCalendarDate(date);
    setSelectedDate(date);

    if (token) {
      try {
        const loadedEvents = await listEvents(token, date);
        setCalendarEvents(loadedEvents);
      } catch (error) {
        console.error('Failed to load selected date:', error);
      }
    }
  };
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
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
  const ui = getUiLabels(settings.language);

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

  // Browser tabs and installed app windows run independently. Opening either
  // must not force another WeatherNow window into focus.

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
        if (currentToken) {
          getUpcomingEvents(currentToken).then(setCalendarEvents).catch(console.error);
          getGoogleCalendarSources(currentToken, currentUser.email).then(setCalendarSources).catch(console.error);
        }
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

  // When a remembered Google session's short-lived access token expires,
  // renew it on the user's next normal interaction. Google Identity Services
  // still controls whether a consent/account prompt is required.
  useEffect(() => {
    if (!user || token || isLoggingIn || !navigator.onLine) return;
    let attempted = false;
    const renew = () => {
      if (attempted) return;
      attempted = true;
      void handleLogin();
    };
    window.addEventListener('pointerdown', renew, { capture: true, once: true });
    window.addEventListener('keydown', renew, { capture: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', renew, true);
      window.removeEventListener('keydown', renew, true);
    };
  }, [user, token, isLoggingIn]);

  const handleLogout = async () => {
    setIsHeaderLogoutConfirmOpen(false);
    setActiveTab('dashboard');
    setCalendarAgendaOpen(false);
    setCalendarAgenda([]);
    setCalendarEvents([]);
    setCalendarSources([]);
    setLoginError(null);
    setToken(null);
    setUser(null);
    setNeedsAuth(true);

    try {
      await logout();
    } catch (error) {
      console.warn('Google sign-out cleanup failed; WeatherNow remains signed out locally.', error);
    }
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
    const startupFailSafe = window.setTimeout(() => {
      if (!isCancelled) {
        console.warn('WeatherNow startup timed out; releasing the loading screen.');
        setLoading(false);
        setIsInitializing(false);
      }
    }, 10000);

    async function loadData() {
      setLoading(true);
      const historicalRequest = getHistoricalData(location.latitude, location.longitude, settings)
        .then(data => { if (!isCancelled && data) setHistorical(data); })
        .catch(error => console.warn('Historical weather will load later:', error));
      try {
        const weatherData = await getWeatherData(location.latitude, location.longitude, settings, location.country);
        if (!isCancelled) {
          if (weatherData) setWeather(weatherData);
        }
      } catch (err) {
        console.error("Error loading weather data:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setIsInitializing(false);
        }
      }
      void historicalRequest;
    }

    loadData();
    const weatherRefresh = window.setInterval(loadData, 10 * 60_000);

    return () => {
      isCancelled = true;
      window.clearTimeout(startupFailSafe);
      window.clearInterval(weatherRefresh);
    };
  }, [location.latitude, location.longitude, location.country, settings.tempUnit, settings.windUnit, settings.precipUnit, settings.language]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setCitySearchLoading(false);
      setCitySearchError(false);
      setShowResults(false);
      return;
    }
    const cached = citySearchCache.current.get(term.toLocaleLowerCase());
    if (cached) {
      setSearchResults(cached);
      setCitySearchLoading(false);
      setCitySearchError(false);
      return;
    }
    const controller = new AbortController();
    setCitySearchLoading(true);
    setCitySearchError(false);
    // Start at two characters, with no artificial delay. Old responses must
    // never overwrite a newer query or reopen a dismissed suggestion panel.
    void searchLocations(term, controller.signal).then((results) => {
      if (controller.signal.aborted) return;
      if (citySearchCache.current.size >= 100) {
        citySearchCache.current.delete(citySearchCache.current.keys().next().value!);
      }
      citySearchCache.current.set(term.toLocaleLowerCase(), results);
      setSearchResults(results);
    }).catch(() => {
      if (!controller.signal.aborted) setCitySearchError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setCitySearchLoading(false);
    });
    return () => controller.abort();
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
            country: navigator.onLine ? 'Locating...' : 'Offline GPS',
            admin1: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto',
          };

          // Apply GPS immediately, then resolve the coordinates to a city. The
          // browser's navigator.onLine flag can be stale in installed PWAs, so
          // do not use it to decide whether the reverse-geocode request runs.
          setLocation(offlineGpsLocation);
          const loc = await reverseGeocode(lat, lon);
          if (loc && (loc.name !== 'Current Location' || loc.country)) setLocation(loc);
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

  useEffect(() => {
    let disposed = false;

    const handleMapCurrentLocation = async (event: Event) => {
      const detail = (event as CustomEvent<{
        latitude?: number;
        longitude?: number;
      }>).detail;

      const lat = Number(detail?.latitude);
      const lon = Number(detail?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      // Update the dashboard coordinates immediately. The existing weather
      // effect listens to location latitude/longitude, so Current Weather,
      // hourly, 5-day, air quality and marine all refresh from the same point.
      const gpsLocation: Location = {
        id: Math.round((lat + 90) * 1000000 + (lon + 180) * 1000),
        name: 'Current Location',
        latitude: lat,
        longitude: lon,
        country: '',
        admin1: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto',
      };

      setLocation(gpsLocation);
      setQuery('');
      setShowResults(false);

      // Resolve the visible city/country after the coordinate change.
      // Do not wait for this before refreshing the forecasts.
      try {
        const resolved = await reverseGeocode(lat, lon);
        if (!disposed && resolved) {
          setLocation({
            ...resolved,
            latitude: lat,
            longitude: lon,
          });
        }
      } catch {
        // Coordinates are already applied, so forecasts still remain correct.
      }
    };

    window.addEventListener('weathernow:use-current-location', handleMapCurrentLocation);
    return () => {
      disposed = true;
      window.removeEventListener('weathernow:use-current-location', handleMapCurrentLocation);
    };
  }, []);

  useEffect(() => {
    if (!weather?.current || settings.severeAlerts === false || !('Notification' in window)) return;

    const showForecastNotification = async () => {
      if (!document.hidden || Notification.permission !== 'granted') return;
      const current = weather.current;
      let forecast: string | null = null;
      let source = 'Open-Meteo';

      if (isPhilippineLocation(location.country)) {
        const pagasaRef = weather.pagasa_daily_reference;
        const description = String(pagasaRef?.daily?.weather_description?.[0] || '');
        const severe = /thunderstorm|heavy|intense|monsoon rain|gusty wind|flood|landslide/i.test(description);
        if (!pagasaRef?.source?.available || !severe) return;
        forecast = translatePagasaAlertDescription(description);
        source = 'PAGASA';
      } else {
        const currentDescription = getWeatherDescription(current.weather_code, settings.language);
        const now = Date.now();
        const severeIndex = weather.hourly?.time?.findIndex((time: string, index: number) => {
          const forecastTime = new Date(time).getTime();
          return forecastTime >= now && forecastTime <= now + 60 * 60 * 1000 && getWeatherDescription(weather.hourly.weather_code[index], settings.language).severe;
        }) ?? -1;
        if (!currentDescription.severe && severeIndex < 0) return;
        forecast = currentDescription.severe ? currentDescription.text : getWeatherDescription(weather.hourly.weather_code[severeIndex], settings.language).text;
      }

      const notificationUi = getUiLabels(settings.language);
      const body = `${forecast} • ${Math.round(current.temperature_2m)}°${settings.tempUnit === 'fahrenheit' ? 'F' : 'C'} • ${location.name} • ${notificationUi.source}: ${source}`;
      const options: NotificationOptions = {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `weathernow-severe-alert-${location.id}`,
      };
      const registration = await navigator.serviceWorker?.ready.catch(() => null);
      const notificationTitle = `WeatherNow ${notificationUi.weatherAlert}`;
      if (registration) await registration.showNotification(notificationTitle, options);
      else new Notification(notificationTitle, options);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) void showForecastNotification();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = window.setInterval(() => void showForecastNotification(), 60 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [weather, settings.severeAlerts, settings.language, settings.tempUnit, location.id, location.name, location.country]);

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
  // PAGASA AWS observations provide temperature/humidity/wind but no sky
  // condition. Use Open-Meteo's actual *current* condition in that case. The
  // old fallback used hourly.weather_code[0], which is midnight and could make
  // a sunny morning appear rainy until much later in the day.
  const fallbackCurrent = weather.hourly_current ?? weather.current;
  const displayWeatherCode = Number.isFinite(current?.weather_code)
    ? current.weather_code
    : Number.isFinite(fallbackCurrent?.weather_code)
      ? fallbackCurrent.weather_code
      : weather.hourly?.weather_code?.find((_: number, i: number) => new Date(weather.hourly.time?.[i] ?? 0) >= new Date());
  const displayIsDay = Number.isFinite(current?.is_day)
    ? current.is_day
    : Number.isFinite(fallbackCurrent?.is_day) ? fallbackCurrent.is_day : undefined;
  const weatherDesc = getWeatherDescription(Number.isFinite(displayWeatherCode) ? displayWeatherCode : 0, settings.language);
  const weatherTheme = getWeatherTileTheme(displayWeatherCode, displayIsDay);
  
  // Philippine alerts are derived from PAGASA data only. Do not relabel a
  // model-generated Open-Meteo condition as an official PAGASA source.
  const isPhilippines = isPhilippineLocation(location.country);
  const pagasaAlertRef = weather.pagasa_daily_reference;
  const pagasaAlertDescription = String(pagasaAlertRef?.daily?.weather_description?.[0] || '');
  const pagasaAlertDate = pagasaAlertRef?.daily?.time?.[0] || null;
  const pagasaAlertSevere = Boolean(pagasaAlertRef?.source?.available) && /thunderstorm|heavy|intense|monsoon rain|gusty wind|flood|landslide/i.test(pagasaAlertDescription);

  const isCurrentlySevere = !isPhilippines && weatherDesc.severe;
  const severeForecastIndex = !isPhilippines ? (weather.hourly?.time?.findIndex((t: string, i: number) => {
    const forecastTime = new Date(t);
    const now = new Date();
    if (forecastTime < now || forecastTime > new Date(now.getTime() + 3600000)) return false;
    return getWeatherDescription(weather.hourly.weather_code[i], settings.language).severe;
  }) ?? -1) : -1;
  const upcomingSevere = severeForecastIndex !== -1;
  const hasAlert = settings.severeAlerts !== false && (isPhilippines ? pagasaAlertSevere : (isCurrentlySevere || upcomingSevere));
  const alertUi = getUiLabels(settings.language);
  const alertMapUi = getMapUiLabels(settings.language);

  const translatePagasaAlertDescription = (description: string) => translatePagasaOutlookText(description, settings.language);

  const alertDesc = isPhilippines
    ? (pagasaAlertSevere ? `${alertMapUi.pagasaOutlook}: ${translatePagasaAlertDescription(pagasaAlertDescription)}` : null)
    : (isCurrentlySevere
      ? `${alertMapUi.severeWeatherWarning}: ${weatherDesc.text}`
      : (upcomingSevere ? `${alertMapUi.upcomingSevereWeather}: ${getWeatherDescription(weather.hourly.weather_code[severeForecastIndex], settings.language).text}` : null));
  const alertEffectiveTime = !isPhilippines && upcomingSevere && severeForecastIndex >= 0
    ? weather.hourly?.time?.[severeForecastIndex]
    : null;
  const alertSource = isPhilippines ? 'PAGASA' : (weather?.hourly_source?.provider || weather?.daily_source?.provider || 'Open-Meteo');
  const formatAlertEffective = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const alertLocale = settings.language === 'zh' ? 'zh-CN' : settings.language === 'pt' ? 'pt-BR' : settings.language;
    return date.toLocaleString(alertLocale, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: settings.timeFormat !== '24h',
    });
  };
  const formatPagasaAlertDate = (value: string) => {
    const date = new Date(`${value}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) return value;
    const alertLocale = settings.language === 'zh' ? 'zh-CN' : settings.language === 'pt' ? 'pt-BR' : settings.language;
    return date.toLocaleDateString(alertLocale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };
  const alertEffectiveLabel = alertEffectiveTime ? formatAlertEffective(alertEffectiveTime) : null;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-sky-100 dark:bg-slate-950 text-sky-950 dark:text-slate-200 overflow-hidden font-sans select-none">
      {installDialogOpen && <InstallAppDialog installed={isInstalled || isStandaloneWindow()} prompt={deferredPrompt} language={settings.language}
        onDismiss={() => setInstallDialogOpen(false)} onPromptUsed={() => {
          setDeferredPrompt(null);
          (window as any).__weatherNowInstallPrompt = null;
        }} />}
      <header className="dashboard-header h-16 flex-none bg-sky-50 dark:bg-slate-900 border-b border-sky-200 dark:border-slate-800 flex items-center justify-between px-2.5 sm:px-6 z-[9999] relative overflow-visible">
        <div className="header-brand flex items-center gap-2 sm:gap-4 min-w-0">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left">
            <AppLogo size={36} />
            <h1 className="font-bold text-xl tracking-tight hidden xl:block truncate max-w-[240px]">
              {settings.appName?.trim() || 'WeatherNow'}
            </h1>
          </button>
          <div className="hidden sm:block h-4 w-px bg-slate-700 mx-0"></div>
          <div className="hidden md:flex min-w-0 items-center gap-1 lg:gap-1.5 font-medium">
            <span className="truncate max-w-[95px] lg:max-w-[140px] xl:max-w-[220px] text-[11px] lg:text-sm xl:text-base">{location.name}, {location.country}</span>
            <span className="xl:hidden flex-none text-[9px] bg-sky-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sky-800 dark:text-slate-400 border border-sky-300 dark:border-slate-700 font-mono whitespace-nowrap">
              {location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°
            </span>
            <span className="hidden xl:block text-[10px] bg-sky-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sky-800 dark:text-slate-400 border border-sky-300 dark:border-slate-700 font-mono whitespace-nowrap">
              {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
            </span>
          </div>
        </div>
        
        <div className="header-controls flex items-center gap-1 sm:gap-4 lg:gap-6 min-w-0">
          <div className="header-search relative w-24 sm:w-40 md:w-44 lg:w-52 xl:w-72 flex items-center gap-2 flex-shrink z-[10000]" ref={searchRef}>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-800 dark:text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder={alertUi.searchCities} 
                className="w-full pl-9 pr-3 py-2 !bg-white dark:!bg-slate-950 border border-sky-200 dark:border-slate-800 rounded-lg text-sm text-sky-950 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white focus:shadow-none dark:focus:border-indigo-500 dark:focus:ring-1 dark:focus:ring-indigo-500 transition-all"
                value={query}
                onChange={(e) => {
                  const value = e.target.value;
                  const term = value.trim().toLocaleLowerCase();
                  setQuery(value);
                  setSearchResults(citySearchCache.current.get(term) || []);
                  setCitySearchError(false);
                  setCitySearchLoading(term.length >= 2 && !citySearchCache.current.has(term));
                  setShowResults(term.length >= 2);
                }}
                onFocus={() => { if(query.trim().length >= 2) setShowResults(true) }}
              />
            </div>
            {showResults && query.trim().length >= 2 && (
              <div className="header-city-results absolute top-full right-0 mt-2 w-72 max-sm:left-0 max-sm:right-auto max-sm:w-[calc(100vw-1rem)] sm:w-80 md:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-sky-300 dark:border-slate-700 overflow-y-auto overflow-x-hidden z-[10001] max-h-80 divide-y divide-sky-100 dark:divide-slate-800">
                {searchResults.length === 0 && (
                  <p role="status" className="px-3.5 py-2.5 text-sm text-black dark:text-slate-200">
                    {citySearchLoading ? alertUi.searchingCities : citySearchError ? alertUi.citySearchUnavailable : alertUi.noMatchingCities}
                  </p>
                )}
                {searchResults.map((res) => (
                  <button 
                    key={`${res.id}:${res.latitude}:${res.longitude}`} 
                    className="w-full text-left px-3.5 py-2.5 hover:bg-sky-100 dark:hover:bg-slate-800 flex flex-col transition-colors cursor-pointer group"
                    onClick={() => handleSelectLocation(res)}
                  >
                    <span className="font-semibold text-sky-950 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{res.name}</span>
                    <span className="text-[11px] text-sky-700 dark:text-slate-400">{res.admin1 ? `${res.admin1}, ` : ''}{res.country}</span>
                  </button>
                ))}
                {query.trim().length === 2 && searchResults.length > 0 && (
                  <div className="px-3.5 py-1 text-[10px] text-slate-600 dark:text-slate-400">
                    © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · Photon
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="header-actions flex items-center gap-1 sm:gap-3 flex-shrink-0">
            <div className="header-install relative">
              <button
                id="header-install-app-btn"
                onClick={handleInstallClick}
                className={`install-app-button flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm font-semibold text-white rounded-md transition-all shadow-sm flex-shrink-0 ${isInstalled ? '!bg-emerald-600 !text-white hover:!bg-emerald-500 hover:shadow-emerald-500/25' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25'}`}
                title={isInstalled ? t('alreadyInstalled') : t('installDescription')}
                aria-label={isInstalled ? t('appInstalled') : t('installApp')}
              >
                <Download size={15} />
                <span className="truncate max-sm:max-w-20">{isInstalled ? t('appInstalled') : t('installApp')}</span>
              </button>
            </div>
            {user && (
              <div className="header-account flex items-center gap-2 bg-white dark:bg-slate-950 px-2 py-1 rounded-lg border border-sky-200 dark:border-slate-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHeaderLogoutConfirmOpen(true)}
                  className="rounded-full cursor-pointer"
                  title={ui.signOut}
                  aria-label={ui.openSignOut}
                >
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-6 h-6 rounded-full" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsHeaderLogoutConfirmOpen(true)}
                  className="text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200 cursor-pointer hidden sm:block"
                  title={ui.signOut}
                  aria-label={ui.openSignOut}
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
            {loading && <div className="header-loading animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-500 flex-shrink-0 mx-1"></div>}
            <div className="header-clock text-right ml-1 sm:ml-2 flex-shrink-0">
              <div className="block text-[9px] sm:text-xs md:text-[13px] lg:text-sm text-sky-800 dark:text-slate-400 uppercase tracking-widest font-bold whitespace-nowrap">{format(new Date(), 'dd MMM yyyy', { locale: getDateLocale(settings.language) })}</div>
              <div className="text-[10px] sm:text-sm lg:text-base font-mono text-indigo-600 dark:text-indigo-300 whitespace-nowrap">{format(new Date(), settings.timeFormat === '24h' ? 'HH:mm' : 'hh:mm a')}</div>
            </div>
          </div>
        </div>
      </header>

      {isHeaderLogoutConfirmOpen && (
        <div
          className="settings-panel fixed inset-0 z-[120000] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="header-logout-title"
          onClick={() => setIsHeaderLogoutConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-sky-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="header-logout-title" className="text-base font-bold text-slate-950 dark:text-white">
              {ui.signOutGoogleCalendarTitle}
            </h3>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {ui.signOutCalendarMessage}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                data-settings-disclosure
                onClick={() => setIsHeaderLogoutConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 !shadow-none hover:!shadow-none focus:!shadow-none active:!shadow-none hover:bg-sky-100 hover:border-sky-400 hover:text-sky-950 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                style={{ boxShadow: 'none' }}
              >
                {ui.cancel}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border !border-blue-700 !bg-blue-600 px-4 py-2 text-sm font-bold !text-white shadow-sm transition-all hover:!bg-blue-500 hover:!shadow-[inset_0_0_0_2px_rgba(37,99,235,1),inset_0_0_10px_rgba(59,130,246,0.98),inset_0_0_18px_rgba(96,165,250,0.78)] dark:border-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
              >
                {ui.signOut}
              </button>
            </div>
          </div>
        </div>
      )}

      <main onClickCapture={(event) => { if (!(event.target as HTMLElement).closest('.music-player-overlay, .music-nav-icon')) closeMusicOverlay(); }} className="flex-1 flex overflow-hidden min-h-0">
        <aside onClickCapture={(event) => { if (!(event.target as HTMLElement).closest('.music-nav-icon')) closeMusicOverlay(); }} className="desktop-sidebar-nav hidden md:flex w-14 flex-none bg-sky-50 dark:bg-slate-900 border-r border-sky-200 dark:border-slate-800 flex-col items-center py-6 gap-6 z-10">
          <div onClick={() => setActiveTab('dashboard')} className={`dashboard-nav-icon p-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300'} ${forecasterSpeaking ? 'dashboard-nav-forecaster-speaking' : ''}`}><CloudSun size={20} /></div>
          <div onClick={() => setActiveTab('news')} className={`p-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'news' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300'}`}><Newspaper size={20} /></div>
          <div role="button" aria-label="Calendar" tabIndex={0} onClick={() => setActiveTab('calendar')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setActiveTab('calendar'); }} className={`p-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'calendar' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300'}`}><Calendar size={20} /></div>
          <div role="button" aria-label={MUSIC_NAV_LABELS[settings.language] || MUSIC_NAV_LABELS.en} tabIndex={0} onClick={() => toggleMusicOverlay()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') toggleMusicOverlay(); }} className={`music-nav-icon p-2 rounded-lg cursor-pointer text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300 ${(musicPlaying || musicSessionActive) ? 'music-nav-playing' : ''}`}><Music2 size={20} /></div>
          <div onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'settings' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'text-sky-800 dark:text-slate-400 hover:text-sky-900 dark:text-slate-300'}`}><Settings size={20} /></div>
        </aside>
        
        <>
          <section onClickCapture={(event) => { if (!(event.target as HTMLElement).closest('.music-player-overlay')) closeMusicOverlay(); }} style={{ display: activeTab === 'dashboard' ? undefined : 'none' }} className="desktop-dashboard-view flex-1 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto">
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
              <div className="weather-alert-tile col-span-1 lg:col-span-12 bg-red-50 dark:bg-red-950/30 border border-red-500/70 dark:border-red-500/30 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-xs uppercase tracking-widest font-bold">
                  <AlertTriangle size={14} />
                  {alertUi.weatherAlert}
                </div>
                <p className="text-red-800 dark:text-red-300 text-sm">{alertDesc}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-red-700 dark:text-red-300/90">
                  {isPhilippines && pagasaAlertDate ? (
                    <span>{alertUi.effective}: {formatPagasaAlertDate(pagasaAlertDate)} ({alertUi.pagasaDailyNoOnset})</span>
                  ) : alertEffectiveLabel ? (
                    <span>{alertUi.effective}: {alertEffectiveLabel}</span>
                  ) : isCurrentlySevere ? (
                    <span>{alertUi.effective}: {alertUi.nowInEffect}</span>
                  ) : null}
                  <span>{alertUi.source}: {alertSource}</span>
                </div>
              </div>
            )}

            {/* LEFT COLUMN: Map & Current Weather */}
            <div className="col-span-1 lg:col-span-7 flex flex-col gap-4 lg:h-full">
              {/* Current Weather Module */}
              <div 
                className={`current-weather-tile ${weatherTheme.card} border rounded-xl p-5 flex flex-col justify-between relative overflow-hidden lg:overflow-visible shadow-sm min-h-[290px] flex-none cursor-pointer`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest && !target.closest('button')) {
                    document.getElementById('weather-forecaster-btn')?.click();
                  }
                }}
              >
                {/* Animated Background Decorative Weather Scene Icon */}
                {current && Number.isFinite(displayWeatherCode) && (
                  <div className="absolute -top-4 -right-4 sm:top-1 sm:right-1 opacity-25 dark:opacity-20 pointer-events-none">
                    <WeatherIcon code={displayWeatherCode as number} isDay={displayIsDay} className="w-48 h-48 sm:w-56 sm:h-56 -mr-4 -mt-4" />
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
                            currentCode={current.weather_code ?? undefined}
                            observationStation={weather.current_source?.station}
                            windUnit={settings.windUnit}
                            tomorrowHigh={weather.daily?.temperature_2m_max?.[1]}
                            tomorrowLow={weather.daily?.temperature_2m_min?.[1]}
                            tomorrowCode={weather.daily?.weather_code?.[1]}
                            hourlyData={weather.hourly}
                            tempUnit={settings.tempUnit}
                            autoSpeak={settings.autoSpeak}
                            marineConditions={marineConditions?.current}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-7xl sm:text-8xl font-thin tracking-tighter text-sky-950 dark:text-white">
                          {Math.round(current.temperature_2m)}<span className="text-4xl font-light current-weather-degree text-indigo-600 dark:text-indigo-400 lg:ml-1">°<span className="current-weather-unit">{settings.tempUnit === 'fahrenheit' ? 'F' : 'C'}</span></span>
                        </div>
                        {Number.isFinite(displayWeatherCode) && <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-2xl backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-sm flex items-center justify-center">
                          <WeatherIcon code={displayWeatherCode as number} isDay={displayIsDay} className="w-20 h-20 sm:w-24 sm:h-24" />
                        </div>}
                      </div>
                      <div className="text-lg sm:text-xl font-semibold text-sky-950 dark:text-slate-100 mt-2 tracking-wide">{weatherDesc.text}</div>
                    </div>
                    
                    <div className="flex gap-3 mt-6 z-10">
                      <div className={`current-weather-detail-tile flex-1 ${weatherTheme.pill} backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col gap-1 shadow-sm`}>
                        <div className="text-xs text-blue-600 dark:text-slate-400 uppercase font-bold tracking-wider">{t('humidity')}</div>
                        <div className="text-base sm:text-lg font-semibold font-mono text-sky-950 dark:text-slate-200">{current.relative_humidity_2m}%</div>
                      </div>
                      <div className={`current-weather-detail-tile flex-1 ${weatherTheme.pill} backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col gap-1 shadow-sm`}>
                        <div className="text-xs text-blue-600 dark:text-slate-400 uppercase font-bold tracking-wider">{t('wind')}</div>
                        <div className="text-base sm:text-lg font-semibold font-mono text-sky-950 dark:text-slate-200">{current.wind_speed_10m} <span>{settings.windUnit === 'mph' ? t('mph') : t('kmh')}</span></div>
                      </div>
                      <div className={`current-weather-detail-tile flex-1 ${weatherTheme.pill} backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col gap-1 shadow-sm`}>
                        <div className="text-xs text-blue-600 dark:text-slate-400 uppercase font-bold tracking-wider">{t('feelsLike')}</div>
                        <div className="text-base sm:text-lg font-semibold font-mono text-sky-950 dark:text-slate-200">{Number.isFinite(current.apparent_temperature) ? `${Math.round(current.apparent_temperature)}°${settings.tempUnit === 'fahrenheit' ? 'F' : 'C'}` : '—'}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-sky-800 dark:text-slate-400">
                    <AlertTriangle size={32} className="mb-2 opacity-50" />
                    <p className="text-sm text-center">{weather.current_source?.provider === 'PAGASA' ? weather.current_source.note || 'PAGASA current observation unavailable' : t('failedToLoadWeather')}</p>
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
            <div className="col-span-1 lg:col-span-5 relative flex flex-col gap-4 lg:h-full">
              
              {/* 24h Hourly Forecast */}
              <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-5 flex flex-col shadow-inner flex-none h-[200px] min-h-[200px]">
                <div className="flex items-center justify-between mb-4 flex-none">
                  <h3 className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-sky-800 dark:text-slate-400 flex items-center gap-2">
                    <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
                    {t('hourlyForecast')}
                  </h3>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  {weather?.hourly ? <HourlyForecast data={weather.hourly} current={weather.hourly_current ?? weather.current} settings={settings} /> : <div className="absolute inset-0 flex items-center justify-center text-sky-800 dark:text-slate-400 text-sm">{t('dataUnavailable')}</div>}
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
                  {weather?.daily ? <FiveDayForecast data={weather.daily} settings={settings} /> : <div className="absolute inset-0 flex items-center justify-center text-sky-800 dark:text-slate-400 text-sm">{weather?.daily_source?.provider === 'PAGASA' ? 'PAGASA daily forecast unavailable' : t('dataUnavailable')}</div>}
                </div>
                {weather?.daily_source?.provider === 'PAGASA' && <p className="mt-2 text-[10px] text-slate-700 dark:text-slate-300">
                  {weather.daily_source.available ? <>PAGASA · nearest published city: {weather.daily_source.city} ({weather.daily_source.distanceKm} km away)</> : 'PAGASA unavailable — no substitute daily forecast shown.'}
                  {' · '}<a href="https://bagong.pagasa.dost.gov.ph/weather/weather-outlook-selected-philippine-cities" target="_blank" rel="noopener noreferrer" className="underline">Official outlook</a>
                </p>}
                {weather?.daily_source?.fallback && <p className="mt-2 text-[10px] text-slate-700 dark:text-slate-300">{weather.daily_source.note}</p>}
              </div>

              <EnvironmentalPanels
                lat={location.latitude}
                lon={location.longitude}
                settings={settings}
                onMarineData={setMarineConditions}
              />

            </div>
          </section>
        {activeTab === 'calendar' ? (
          <section className="flex-1 relative min-h-0 bg-sky-100 dark:bg-slate-950 overflow-y-auto p-3 sm:p-4 xl:overflow-hidden">
            <div className="grid min-h-0 grid-cols-1 items-start gap-4 xl:h-full xl:grid-cols-12 xl:items-stretch">
              <div className="flex min-h-0 flex-col gap-3 xl:col-span-6 xl:h-full">
              <div className="calendar-month-tile flex w-full min-h-0 flex-none flex-col overflow-hidden rounded-xl border border-sky-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:flex-1">
                <div className="min-h-0 flex-1">
            {user ? (
              <div className="flex h-full min-h-0 flex-col">
                {(!token || !isOnline) && <div role="status" className="flex-none p-3 text-sm text-slate-800 dark:text-slate-200">
                  <p>{!isOnline ? ui.calendarOffline : ui.calendarRemembered}</p>
                  {isOnline && <button disabled={isLoggingIn} onClick={handleLogin} className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-60">{isLoggingIn ? ui.connecting : ui.renewGoogleAccess}</button>}
                  {loginError && <p role="alert" className="mt-2 text-rose-600 dark:text-rose-300">{loginError}</p>}
                </div>}
                <div className="min-h-0 flex-1">
                  <GoogleCalendarPanel token={isOnline ? token : null} country={location.country} language={settings.language} selectedJournalDate={calendarDate} onDateSelected={chooseDate} journalDates={journalDates} onAgendaChange={setCalendarAgenda} />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <CalendarDays size={48} className="text-slate-700 mb-4" />
                <h2 className="text-xl font-bold text-sky-950 dark:text-slate-200 mb-2">{t('connectCalendar')}</h2>
                <p className="text-sky-800 dark:text-slate-400 max-w-md mb-6">{t('connectCalendarTab')}</p>
                <button disabled={isLoggingIn} onClick={handleLogin} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-wait text-white font-medium py-2 px-6 rounded-lg transition-colors">
                  {isLoggingIn ? ui.connecting : ui.connectGoogleCalendar}
                </button>
                {loginError && (
                  <div role="alert" className="mt-4 max-w-xl rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                    {loginError}
                  </div>
                )}
              </div>
            )}
                </div>
              </div>
              {user && calendarAgendaOpen && calendarAgenda.length > 0 && <div className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="calendar-agenda-title" onClick={closeCalendarAgenda}>
                <div className="relative w-full max-w-md rounded-xl border border-sky-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={event => event.stopPropagation()}>
                  <button type="button" onClick={closeCalendarAgenda} aria-label={ui.closeHolidaysReminders} className="absolute right-3 top-3 rounded-full bg-slate-800 p-1.5 text-white hover:bg-slate-700"><X size={16} /></button>
                  <h3 id="calendar-agenda-title" className="mb-3 pr-10 text-sm font-extrabold text-sky-950 dark:text-white">{calendarDate} — {ui.holidaysReminders}</h3>
                  <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                    {calendarAgenda.map(item => <div key={`${item.kind}-${item.id}`} className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs dark:bg-slate-800">
                      <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-white ${item.kind === 'holiday' ? 'bg-rose-600' : 'bg-blue-600'}`}>{item.kind === 'holiday' ? ui.holiday : ui.reminder}</span>
                      <div className="min-w-0"><div className="font-bold text-slate-900 dark:text-white">{item.title}</div><time className="text-[10px] text-slate-600 dark:text-slate-300">{item.start.includes('T') ? new Date(item.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ui.allDay}</time></div>
                    </div>)}
                  </div>
                </div>
              </div>}
              </div>
              <div className="min-h-0 overflow-visible xl:col-span-6 xl:h-full xl:overflow-hidden xl:[&>aside]:!h-full xl:[&>aside]:!max-h-full">
                <WeatherJournal locationName={location.name} language={settings.language} accountLinked={Boolean(user)} googleAccessToken={token} selectedDate={calendarDate} onDatesChange={setJournalDates} />
              </div>
            </div>
          </section>
        ) : activeTab === 'news' ? (
          <NewsFeed locationName={location.name} country={location.country} language={settings.language} />
        ) : activeTab === 'settings' ? (
          <SettingsPanel 
            onInstallApp={handleInstallClick}
            isInstalled={isInstalled}
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

      <div inert={!musicOverlayOpen} aria-hidden={!musicOverlayOpen} className={`music-player-overlay ${musicOverlayOpen ? '' : 'music-player-overlay-hidden'}`}>
        <MusicWidget language={settings.language} onHide={() => closeMusicOverlay()} />
      </div>

      {/* Mobile Bottom Navigation */}
      <nav onClickCapture={(event) => { if (!(event.target as HTMLElement).closest('.music-nav-icon')) closeMusicOverlay(); }} className="mobile-bottom-nav md:hidden flex-none bg-sky-50 dark:bg-slate-900 border-t border-sky-200 dark:border-slate-800 flex justify-around items-center h-16 z-20 pb-safe">
        <button style={settings.theme === 'dark' ? { color: '#fff' } : undefined} onClick={() => setActiveTab('dashboard')} className={`dashboard-nav-icon flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-sky-800 dark:text-slate-400 hover:text-sky-800 dark:text-slate-400'} ${forecasterSpeaking ? 'dashboard-nav-forecaster-speaking' : ''}`}>
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
        <button style={settings.theme === 'dark' ? { color: '#fff' } : undefined} onClick={() => toggleMusicOverlay()} className={`music-nav-icon flex flex-col items-center justify-center w-full h-full gap-1 text-sky-800 dark:text-slate-400 ${(musicPlaying || musicSessionActive) ? 'music-nav-playing' : ''}`} aria-label={MUSIC_NAV_LABELS[settings.language] || MUSIC_NAV_LABELS.en}>
          <Music2 size={20} />
          <span className="text-[10px] font-medium tracking-wider uppercase">{MUSIC_NAV_LABELS[settings.language] || MUSIC_NAV_LABELS.en}</span>
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
          <span>{t('source')}: {weather?.current_source?.provider === 'PAGASA' ? `PAGASA current · ${weather.daily_source?.provider || 'Open-Meteo'} daily · Open-Meteo 24-hour` : 'Open-Meteo'}</span>
        </div>
        <div className={`text-[9px] uppercase font-bold tracking-widest flex items-center gap-2 ${isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
          SYSTEM {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
      </footer>
    </div>
  );
}
